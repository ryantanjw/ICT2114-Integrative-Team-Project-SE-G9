import React from "react";
import { FaUsers, FaBook, FaCog, FaSignOutAlt, FaFile } from "react-icons/fa";
import { TbLayoutSidebarLeftCollapseFilled } from "react-icons/tb";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { MdHomeFilled } from "react-icons/md";
import { FaDatabase } from "react-icons/fa6";
import axios from 'axios';

export default function NavBarAdmin({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: "Home", icon: <MdHomeFilled />, to: "/admin" },
    { label: "Users", icon: <FaUsers />, to: "/admin/user" },
    { label: "Forms", icon: <FaBook />, to: "/admin/form" },
    { label: "Settings", icon: <FaCog />, to: "/admin/setting" },
    { label: "Database", icon: <FaDatabase />, to: "/admin/db" },
    { label: "Audit Logs", icon: <FaFile />, to: "/admin/audit" },
  ];

  const handleLogout = async () => {
    try {
      const response = await axios.post('/api/logout', {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        console.log('Logged out successfully');
        navigate('/auth/login'); // Redirect to login page
      }
    } catch (error) {
      console.error('Logout error:', error);
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
          {navItems.map(({ label, icon, to }) => {
            // Check if this link is active based on the current path
            const isExactMatch = currentPath === to;
            const isSubpathMatch = to !== '/admin' && currentPath.startsWith(to);
            const isActive = isExactMatch || isSubpathMatch;
            
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex flex-col items-center py-4 m-4 rounded-lg ${
                  isActive ? "bg-gray-200" : "hover:bg-gray-100"
                }`}
              >
                <div className={`text-xl sm:text-2xl mb-2 ${isActive ? "text-red-500" : ""}`}>
                  {icon}
                </div>
                {/* The label is conditionally rendered to hide when collapsed */}
                {!collapsed && (
                  <span className={`${isActive ? "text-red-500" : "text-gray-800"} text-sm sm:text-base`}>
                    {label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

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