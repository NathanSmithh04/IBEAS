import { Auth0Context } from "@auth0/auth0-react";
import { useContext, useEffect, useState } from "react";
import "../index.css";

const backendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;

function Navbar() {
  const { loginWithRedirect, logout, isLoading, isAuthenticated } =
    useContext(Auth0Context);
  const [isAuthenticatedLocal, setIsAuthenticatedLocal] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const [showServerWarning, setShowServerWarning] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsAuthenticatedLocal(isAuthenticated);
    }
    checkConnectionApi();
  }, [isLoading, isAuthenticated]);

  const checkConnectionApi = async () => {
    const fetchApi = async () => {
      try {
        const response = await fetch(backendUrl + "/check_connection");
        if (response.ok) {
          return true;
        }
      } catch (error) {}
      return false;
    };
    const initialResponse = await fetchApi();
    if (initialResponse) return;
    setTimeout(async () => {
      setShowServerWarning(true);
      const interval = setInterval(async () => {
        const response = await fetchApi();
        if (response) {
          clearInterval(interval);
          setShowServerWarning(false);
        }
      }, 1000);
    }, 5000);
  };

  return (
    <nav>
      {showServerWarning ? (
        <div className="flex justify-center text-3xl pb-1.5 bg-red-800 text-white">
          Please wait for the Render backend to load! Estimated time: 30 seconds
        </div>
      ) : null}
      <div className="flex justify-between text-xl">
        <div>
          <button className="m-2" onClick={() => (window.location.href = "/")}>
            Home
          </button>
          {isAuthenticatedLocal ? (
            <button onClick={() => (window.location.href = "/checkin")}>
              Check in
            </button>
          ) : null}
        </div>
        <div>
          {isAuthenticatedLocal ? (
            <>
              <span>{localStorage.getItem("userEmail")}</span>
              <button
                className="ml-2 my-2"
                onClick={() => (window.location.href = "/profile")}
              >
                Profile
              </button>
              <button className="m-2" onClick={() => logout()}>
                Log out
              </button>
            </>
          ) : (
            <div>
              <button className="my-2" onClick={() => loginWithRedirect()}>
                Log in
              </button>
              <button className="m-2" onClick={() => loginWithRedirect()}>
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
