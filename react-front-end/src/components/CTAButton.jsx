import React from "react";

export default function CTAButton({ icon, text, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex justify-center items-center gap-2 bg-gray-200 text-black px-10 py-3 rounded-md hover:bg-gray-300 transition ${className}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium text-sm sm:text-base">{text}</span>
    </button>
  );
}