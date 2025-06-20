import React from "react";
import { FaHome, FaUsers, FaBook, FaCog, FaSignOutAlt } from "react-icons/fa";
import { TbLayoutSidebarLeftCollapseFilled } from "react-icons/tb";
import { NavLink, useNavigate } from "react-router-dom";
import { MdHomeFilled } from "react-icons/md";
import axios from 'axios';

export default function NavBar({ activePage = "", collapsed, setCollapsed }) {
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", icon: <MdHomeFilled />, to: "/home" },
    { label: "Forms", icon: <FaBook />, to: "/user/form" },
    { label: "Settings", icon: <FaCog />, to: "/user/setting" },
  ];

  const handleLogout = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/logout', {}, {
        withCredentials: true
      });
      
      console.log('Logout response:', response.data);
      
      // Try multiple redirect approaches to ensure one works
      // Method 1: React Router navigation
      navigate('/auth/login');
      
      // Method 2: Fallback to direct page navigation if needed
      setTimeout(() => {
        console.log('Fallback redirect...');
        window.location.href = '/auth/login';
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, redirect to login
      window.location.href = '/auth/login';
    }
  };

  return (
    <>
      <div
        className={`fixed top-0 h-full w-24 sm:w-30 bg-white shadow-md flex flex-col transition-all duration-300 z-40 ${
          collapsed ? "-left-24 sm:-left-30" : "left-0"
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 focus:outline-none self-center"
          aria-label="Toggle sidebar"
        >
          <TbLayoutSidebarLeftCollapseFilled className="text-2xl sm:text-3xl mt-5" />
        </button>
        
        {/* Navigation links */}
        <nav className="mt-4 flex-1">
          {navItems.map(({ label, icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: isRouteActive }) => {
                const isActive = activePage === to || isRouteActive;
                return `flex flex-col items-center py-4 m-4 rounded-lg ${
                  isActive ? "bg-gray-200" : "hover:bg-gray-100"
                }`;
              }}
            >
              {({ isActive: isRouteActive }) => {
                const isActive = activePage === to || isRouteActive;
                return (
                  <>
                    <div className={`text-xl sm:text-2xl mb-2 ${isActive ? "text-red-500" : ""}`}>
                      {icon}
                    </div>
                    {!collapsed && (
                      <span className={`${isActive ? "text-red-500" : "text-gray-800"} text-sm sm:text-base`}>
                        {label}
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>
        
        {/* Logout button - positioned at bottom */}
        <div className="mb-8">
          <button
            onClick={handleLogout}
            className="flex flex-col items-center py-4 mx-4 rounded-lg hover:bg-gray-100 w-[calc(100%-2rem)]"
          >
            <div className="text-xl sm:text-2xl mb-2">
              <FaSignOutAlt />
            </div>
            {!collapsed && (
              <span className="text-gray-800 text-sm sm:text-base">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}