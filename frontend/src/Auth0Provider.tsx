import React, { useEffect, useState, createContext, useContext } from "react";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from "react-router-dom";

const backendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;

interface Auth0ContextType {
  token: string | null;
  setToken: (token: string) => void;
}

export const Auth0Context = createContext<Auth0ContextType>({
  token: null,
  setToken: () => {},
});

export function useAuthToken() {
  const { token } = React.useContext(Auth0Context);
  return token;
}

interface ShowServerWarningContextType {
  showServerWarning: boolean;
  setShowServerWarning: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ShowServerWarningContext = createContext<
  ShowServerWarningContextType | undefined
>(undefined);

export const ShowServerWarningProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [showServerWarning, setShowServerWarning] = useState(true);

  return (
    <ShowServerWarningContext.Provider
      value={{ showServerWarning, setShowServerWarning }}
    >
      {children}
    </ShowServerWarningContext.Provider>
  );
};

export default function Auth0ProviderWithHistory({
  children,
}: {
  children: React.ReactNode;
}) {
  const domain = import.meta.env.VITE_REACT_APP_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_REACT_APP_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_REACT_APP_AUTH0_AUDIENCE;
  const navigate = useNavigate();
  const location = useLocation();

  const onRedirectCallback = (appState: any) => {
    navigate(appState?.returnTo || location.pathname);
  };

  return (
    <Auth0Provider
      domain={domain!}
      clientId={clientId!}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience!,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <FetchToken>
        <ShowServerWarningProvider>{children}</ShowServerWarningProvider>
      </FetchToken>
    </Auth0Provider>
  );
}

export function FetchToken({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, getAccessTokenSilently, isLoading } =
    useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const showServerWarningContext = useContext(ShowServerWarningContext);
  const setShowServerWarning = showServerWarningContext?.setShowServerWarning;

  useEffect(() => {
    const checkAuthentication = async () => {
      if (isAuthenticated) {
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);
      }
    };

    checkAuthentication();
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (user && user.email) {
      localStorage.setItem("userEmail", user.email);
    }
    if (!isLoading) {
      localStorage.setItem("isAuthenticated", isAuthenticated.toString());
    }
    if (userInfo && userInfo.first_name && userInfo.last_name) {
      localStorage.setItem("userFirstName", userInfo.first_name);
      localStorage.setItem("userLastName", userInfo.last_name);
    }
  });

  useEffect(() => {
    const login = async () => {
      try {
        if (token && user) {
          const response = await fetch(backendUrl + "/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: user.email,
            }),
          });
          if (response.ok) {
            if (setShowServerWarning) {
              setShowServerWarning(false);
              console.log("Server warning hidden");
            } else {
              console.log("setShowServerWarning is not defined");
            }
            const data = await response.json();
            if (data.first_name && data.last_name && data.email) {
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    const getNames = async () => {
      try {
        if (token && user) {
          const response = await fetch(backendUrl + "/get_user_names", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
            localStorage.setItem("userFirstName", data.first_name);
            localStorage.setItem("userLastName", data.last_name);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (isAuthenticated && token) {
      login();
      getNames();
    }
  }, [
    localStorage.getItem("userEmail"),
    localStorage.getItem("isAuthenticated"),
  ]);

  return (
    <Auth0Context.Provider value={{ token, setToken }}>
      {children}
    </Auth0Context.Provider>
  );
}
