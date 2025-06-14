import React from "react";

export default function CTAButton({ icon, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 bg-gray-200 text-black px-6 py-2 rounded-md hover:bg-gray-300 transition"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{text}</span>
    </button>
  );
}