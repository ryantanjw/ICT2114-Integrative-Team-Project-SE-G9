import React, { useState } from "react";
import { FaFileAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { HiMiniDocumentCheck } from "react-icons/hi2";

const tabs = [
  { label: "Form 1 - WA Inventory", icon: <FaFileAlt /> },
  { label: "Form 2 - RA Process", icon: <FaExclamationTriangle /> },
  { label: "Overall Details", icon: <HiMiniDocumentCheck /> },
  { label: "Confirmation Details", icon: <FaCheckCircle /> },
];

export default function FormTabs({ onTabChange, currentTab: externalTab, isForm1Valid, isForm2Valid }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Use external tab state if provided, otherwise use local state
  const currentTab = externalTab !== undefined ? externalTab : activeTab;

  const handleNext = () => {
    if (currentTab < tabs.length - 1) {
      // IMPORTANT: Use the parent's onTabChange handler instead of directly setting the tab
      // This will trigger the save functionality in the parent component
      onTabChange?.(currentTab + 1);
    }
  };

  // Handle tab click - this ensures the parent component is notified about tab changes
  const handleTabClick = (index) => {
    // Only update if the parent component provides a handler
    if (onTabChange) {
      onTabChange(index);
    } else {
      // Fallback to local state if no parent handler
      setActiveTab(index);
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
              onClick={() => handleTabClick(index)}
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
          onClick={() => handleTabClick(currentTab - 1)}
          disabled={currentTab === 0}
          className="back-button"
        >
          Back
        </button>
        
        {/* Only show Next/Complete button if not on last tab */}
        {currentTab < tabs.length - 1 && (
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}