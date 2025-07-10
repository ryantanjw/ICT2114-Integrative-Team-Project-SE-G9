import React from "react";
import CTAButton from "./CTAButton.jsx";

const StickyBottomNav = ({ buttonsLeft = [], buttonsRight = [], position = "bottom" }) => {
  const posClass = position === "bottom" ? "bottom-4" : "top-4";
  return (
    <div
      className={`
        fixed ${posClass} left-5 right-5 2xl:left-40 2xl:right-40
        bg-black/30 backdrop-blur-xl text-white p-4 rounded-lg
        shadow-lg z-50 flex justify-between
      `}
    >
      <div className="flex space-x-2">
        {buttonsLeft.map(({ text, onClick, icon: Icon, disabled = false }, idx) => (
          <CTAButton
            key={idx}
            text={text}
            icon={Icon}
            onClick={onClick}
            disabled={disabled}
            className={`
              ${disabled
                ? "bg-gray-400 cursor-not-allowed opacity-50"
                : "hover:bg-gray-200 active:bg-gray-300"
              }
            `}
          />
        ))}
      </div>
      <div className="flex space-x-2">
        {buttonsRight.map(({ text, onClick, icon: Icon, disabled = false }, idx) => (
          <CTAButton
            key={idx}
            text={text}
            icon={Icon}
            onClick={onClick}
            disabled={disabled}
            className={`
              ${disabled
                ? "bg-gray-400 cursor-not-allowed opacity-50"
                : "hover:bg-gray-200 active:bg-gray-300"
              }
            `}
          />
        ))}
      </div>
    </div>
  );
};

export default StickyBottomNav;