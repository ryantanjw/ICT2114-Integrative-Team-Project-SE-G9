import React, { useState } from "react";
import { FaFileAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { HiMiniDocumentCheck } from "react-icons/hi2";


const tabs = [
  { label: "Form 1 - WA Inventory", icon: <FaFileAlt /> },
  { label: "Form 2 - RA Process", icon: <FaExclamationTriangle /> },
  { label: "Overall Details", icon: <HiMiniDocumentCheck /> },
  { label: "Confirmation Details", icon: <FaCheckCircle /> },
];

export default function FormTabs({ onTabChange, currentTab: externalTab }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Use external tab state if provided, otherwise use local state
  const currentTab = externalTab !== undefined ? externalTab : activeTab;

  const handleNext = () => {
    if (currentTab < tabs.length - 1) {
      setActiveTab(currentTab + 1);
      onTabChange?.(currentTab + 1);
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
                index === currentTab ? "text-black font-semibold" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              {index === currentTab && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black rounded-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onTabChange(currentTab - 1)}
          disabled={currentTab === 0}
          className={`px-4 py-2 rounded ${
            currentTab === 0
              ? "bg-gray-200 text-black cursor-not-allowed"
              : "bg-gray-400 text-white"
          }`}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={currentTab === tabs.length - 1}
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {currentTab >= tabs.length - 1 ? "Complete Form" : "Next"}
        </button>
      </div>
    </div>
  );
}