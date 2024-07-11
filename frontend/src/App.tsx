import { BrowserRouter, Route, Routes } from "react-router-dom";
//import { withAuthenticationRequired } from "@auth0/auth0-react";
import HomePage from "./pages/HomePage";
import Auth0ProviderWithHistory from "./Auth0Provider";
import Navbar from "./components/Navbar";
import ProfilePage from "./pages/ProfilePage";
import CheckinPage from "./pages/CheckinPage";

export default function App() {
  //const ProtectedRoute = withAuthenticationRequired(ProfilePage);

  return (
    <BrowserRouter>
      <Auth0ProviderWithHistory>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/checkin" element={<CheckinPage />} />
        </Routes>
      </Auth0ProviderWithHistory>
    </BrowserRouter>
  );
}
