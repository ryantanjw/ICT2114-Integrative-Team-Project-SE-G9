import React from "react";

export default function CTAButton({ icon: Icon, text, onClick, disabled = false, className = "" }) {
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`flex justify-center items-center gap-2 px-10 py-3 rounded-md transition ${
        disabled
          ? "bg-gray-400 text-gray-700 cursor-not-allowed opacity-50 pointer-events-none"
          : "bg-gray-200 text-black hover:bg-gray-300"
      } ${className}`}
    >
      {Icon && typeof Icon === "function" && <Icon className="text-lg" />}
      <span className="font-medium text-sm sm:text-base">{text}</span>
    </button>
  );
}