import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Auth0ProviderWithHistory from "./Auth0Provider";
import Navbar from "./components/Navbar";
import ProfilePage from "./pages/ProfilePage";
import CheckinPage from "./pages/CheckinPage";

export default function App() {
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
