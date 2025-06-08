import React from "react";
import { FaHome, FaUsers, FaBook, FaCog } from "react-icons/fa";
import { TbLayoutSidebarLeftCollapseFilled } from "react-icons/tb";
import { NavLink } from "react-router-dom";
import { MdHomeFilled } from "react-icons/md";


export default function NavBar({ activePage = "", collapsed, setCollapsed }) {

  const navItems = [
    { label: "Home", icon: <MdHomeFilled />, to: "/home" },
    { label: "Users", icon: <FaUsers />, to: "/users" },
    { label: "Forms", icon: <FaBook />, to: "/forms" },
    { label: "Settings", icon: <FaCog />, to: "/settings" },
  ];

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full w-24 sm:w-30 bg-white shadow-md flex flex-col transform transition-transform duration-300 z-40 ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}>
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
      </div>
    </>
  );
}