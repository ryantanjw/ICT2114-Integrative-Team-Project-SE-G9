import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import your page components:
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Login from "./pages/auth/LoginPage.jsx";
import UserHome from "./pages/user/UserHome.jsx";
// import Logout from "./pages/auth/LogoutPage.jsx";

function AppRoutes() {
  return (
      <Routes>
        {/* Root → Home */}
        <Route path="/" element={<Home />} />

        {/* About page */}
        <Route path="/about" element={<About />} />

        {/* Auth section with nested routes */}
        <Route path="/auth">
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<Login />} />
            {/* <Route path="logout" element={<Logout />} /> */}
        </Route>

        {/* If no route matches, redirect to "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/home" element={<UserHome />} />
      </Routes>
  );
}

export default AppRoutes;
