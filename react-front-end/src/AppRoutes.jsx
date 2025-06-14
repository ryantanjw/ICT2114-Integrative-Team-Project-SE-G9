import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import your page components:
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Login from "./pages/auth/LoginPage.jsx";

// User pages
import UserHome from "./pages/user/UserHomePage.jsx";
import UserForm from "./pages/user/UserFormPage.jsx";
import UserSetting from "./pages/user/UserSettingsPage.jsx";
import UserNewForm from "./pages/user/UserNewFormPage.jsx";

// Admin pages
import AdminHome from "./pages/admin/AdminHomePage.jsx";
import AdminUser from "./pages/admin/AdminUserPage.jsx";
import AdminDB from "./pages/admin/AdminDBPage.jsx";
import AdminForm from "./pages/admin/AdminFormPage.jsx";
import AdminSetting from "./pages/admin/AdminSettingsPage.jsx";
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

        {/* User-specific routes */}
        <Route path="/home" element={<UserHome />} />
        <Route path="/user/form" element={<UserForm />} />
         <Route path="/user/new" element={<UserNewForm />} />
        <Route path="/user/setting" element={<UserSetting />} />

        {/* Admin-specific routes */}
        <Route path="/admin" element={<AdminHome />} />       
        <Route path="/user" element={<AdminUser />} />
        <Route path="/form" element={<AdminForm />} />
        <Route path="/setting" element={<AdminSetting />} />
        <Route path="/db" element={<AdminDB />} />
      </Routes>
  );
}

export default AppRoutes;
