import React, { useState, useRef } from "react";
import { FaFileAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { HiMiniDocumentCheck } from "react-icons/hi2";
import { IoArrowForward, IoChevronDown } from "react-icons/io5";

const tabs = [
  { label: "Overall Details", icon: <HiMiniDocumentCheck /> },
  { label: "Form 1 - WA Inventory", icon: <FaFileAlt /> },
  { label: "Form 2 - RA Process", icon: <FaExclamationTriangle /> },
  { label: "Confirmation Details", icon: <FaCheckCircle /> },
];

export default function FormTabsMobile({ currentTab, onTabChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  return (
    <div className="relative w-full mb-4" ref={containerRef}>
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-white"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{tabs[currentTab].icon}</span>
          <span>{tabs[currentTab].label}</span>
        </div>
        <IoChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md max-h-60 overflow-auto shadow-md">
          {tabs.map((tab, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between px-4 py-2 cursor-pointer ${
                idx === currentTab
                  ? "bg-gray-100 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                onTabChange(idx);
                setOpen(false);
              }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
              {idx === currentTab && <IoArrowForward className="w-5 h-5 text-gray-600" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}