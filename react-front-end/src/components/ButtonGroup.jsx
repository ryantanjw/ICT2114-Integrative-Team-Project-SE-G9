import React from "react";


export default function Button({
  type = "button",
  children,
  className = "",
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full py-3 py-2 tracking-wide text-white transition-colors duration-200 transform bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:bg-gray-800 focus:ring focus:ring-gray-500 focus:ring-opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}