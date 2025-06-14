import React, { useState } from "react";
import { FaFileAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

const tabs = [
  { label: "Form 1 - WA Inventory", icon: <FaFileAlt /> },
  { label: "Form 2 - RA Process", icon: <FaExclamationTriangle /> },
  { label: "Confirmation", icon: <FaCheckCircle /> },
];

export default function FormTabs({ onTabChange }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleNext = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
      onTabChange?.(activeTab + 1);
    }
  };

  return (
    <div className="w-full mb-4">
      <div className="relative">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-200" />
        <div className="flex items-center space-x-6">
          {tabs.map((tab, index) => (
            <div
              key={index}
              onClick={() => {
                setActiveTab(index);
                onTabChange?.(index);
              }}
              className={`relative flex items-center space-x-2 cursor-pointer pb-2 ${
                index === activeTab ? "text-black font-semibold" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              {index === activeTab && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black rounded-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          onClick={() => {
            if (activeTab > 0) {
              setActiveTab(activeTab - 1);
              onTabChange?.(activeTab - 1);
            }
          }}
          disabled={activeTab <= 0}
          className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={activeTab < tabs.length - 1 && activeTab >= tabs.length - 1}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {activeTab >= tabs.length - 1 ? "Complete Form" : "Next"}
        </button>
      </div>
    </div>
  );
}