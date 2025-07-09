import React from "react";
import CTAButton from "./CTAButton.jsx";

const StickyBottomNav = ({ buttonsLeft = [], buttonsRight = [], position = "bottom" }) => {
  const posClass = position === "bottom" ? "bottom-4" : "top-4";
  return (
    <div className={`fixed ${posClass} left-5 right-5 2xl:left-40 2xl:right-40 bg-neutral-950 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between`}>
      <div className="flex space-x-2">
        {buttonsLeft.map((btn, idx) => (
          <CTAButton
            key={idx}
            text={btn.text}
            icon={btn.icon}
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={btn.className}
          />
        ))}
      </div>
      <div className="flex space-x-2">
        {buttonsRight.map((btn, idx) => (
          <CTAButton
            key={idx}
            text={btn.text}
            icon={btn.icon}
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={btn.className}
          />
        ))}
      </div>
    </div>
  );
};

export default StickyBottomNav;