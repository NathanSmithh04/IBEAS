import { Auth0Context } from "@auth0/auth0-react";
import { useContext } from "react";
import { useState } from "react";
import { useAuthToken } from "../Auth0Provider";
import "../index.css";

const backendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;

export default function CheckinPage() {
  const { user } = useContext(Auth0Context);
  const token = useAuthToken();
  const [code, setCode] = useState<string>("");
  const [checkInText, setCheckInText] = useState<string>("Check in");

  async function checkinApi() {
    if (!code) {
      setCheckInText("Please enter a code");
      setTimeout(() => {
        setCheckInText("Check in");
      }, 2000);
      return;
    }
    try {
      if (token && user) {
        const response = await fetch(backendUrl + "/checkin_emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: code }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            setCheckInText("Checked in!");
            setTimeout(() => {
              setCheckInText("Check in");
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="text-xl ml-2 mt-1">
      <h1 className="mt-1">Enter code to check in</h1>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="ml-1" onClick={checkinApi}>
        {checkInText}
      </button>
    </div>
  );
}
