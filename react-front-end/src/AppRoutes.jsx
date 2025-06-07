import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import your page components:
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";

function AppRoutes() {
  return (
      <Routes>
        {/* Root → Home */}
        <Route path="/" element={<Home />} />

        {/* About page */}
        <Route path="/about" element={<About />} />

        {/* If no route matches, redirect to "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export default AppRoutes;
