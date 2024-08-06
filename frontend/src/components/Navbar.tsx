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
  const [showServerWarning, setShowServerWarning] = useState(true);
  const [loginText, setLoginText] = useState("Log in");

  useEffect(() => {
    if (!isLoading) {
      setIsAuthenticatedLocal(isAuthenticated);
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (sessionStorage.getItem("showServerWarning") === "false") {
      setShowServerWarning(false);
    }
  });

  const tryLoginWithRedirect = async () => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000)
    );
    try {
      const response = await Promise.race([
        fetch(backendUrl + "/check_connection"),
        timeout,
      ]);
      if (response instanceof Response && response.ok) {
        loginWithRedirect();
      } else {
        prompt("Error with the backend. Please try again later.");
        setLoginText("Log in");
      }
    } catch (error) {
      if (error === "timeout") {
        setLoginText("Waiting for server...");
      } else {
        console.error(error);
      }
    }
  };

  return (
    <nav>
      {showServerWarning ? (
        <div className="flex justify-center text-xl pb-1 bg-red-800 text-white">
          <p className="ml-1">
            The backend takes ~30 seconds to start after inactivity. Please be
            patient.
          </p>
          <a
            className="underline ml-3 cursor-pointer mr-1"
            onClick={() => {
              sessionStorage.setItem("showServerWarning", "false");
              setShowServerWarning(false);
            }}
          >
            Dismiss
          </a>
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
              <button className="m-2" onClick={() => tryLoginWithRedirect()}>
                {loginText}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
