import { Auth0Context } from "@auth0/auth0-react";
import { useContext, useEffect, useState } from "react";
import { ShowServerWarningContext } from "../Auth0Provider";

import "../index.css";

function Navbar() {
  const { loginWithRedirect, logout, isLoading, isAuthenticated } =
    useContext(Auth0Context);
  const [isAuthenticatedLocal, setIsAuthenticatedLocal] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const showServerWarning = useContext(
    ShowServerWarningContext
  )?.showServerWarning;

  useEffect(() => {
    if (!isLoading) {
      setIsAuthenticatedLocal(isAuthenticated);
    }
  }, [isLoading, isAuthenticated]);

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
