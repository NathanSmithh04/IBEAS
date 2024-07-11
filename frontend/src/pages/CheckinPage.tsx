import { Auth0Context } from "@auth0/auth0-react";
import { useContext } from "react";
import { useState } from "react";
import { useAuthToken } from "../Auth0Provider";
import "../index.css";

export default function CheckinPage() {
  const { user } = useContext(Auth0Context);
  const token = useAuthToken();
  const API_DOMAIN = "http://127.0.0.1:5000";
  const [code, setCode] = useState<string>("");

  async function checkinApi() {
    if (!code) return;
    try {
      if (token && user) {
        const response = await fetch(API_DOMAIN + "/checkin", {
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
            alert(
              `Checked in for ${data.amount} email${
                data.amount > 1 ? "s" : ""
              }.`
            );
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
        Check in
      </button>
    </div>
  );
}
