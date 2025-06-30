import React, { useState } from "react";
import { FaFileAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { HiMiniDocumentCheck } from "react-icons/hi2";


const tabs = [
  { label: "Form 1 - WA Inventory", icon: <FaFileAlt /> },
  { label: "Form 2 - RA Process", icon: <FaExclamationTriangle /> },
  { label: "Overall Details", icon: <HiMiniDocumentCheck /> },
  { label: "Confirmation Details", icon: <FaCheckCircle /> },
];

export default function FormTabs({ onTabChange }) {
  const [activeTab, setActiveTab] = useState(0);

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
          className="px-10 py-3 bg-gray-200 text-black rounded-lg disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (activeTab < tabs.length - 1) {
              // if on “Overall Details” (second-to-last), jump to Confirmation Details
              const next = activeTab === tabs.length - 2 ? tabs.length - 1 : activeTab + 1;
              setActiveTab(next);
              onTabChange?.(next);
            }
          }}
          disabled={activeTab >= tabs.length - 1}
          className="px-10 py-3 bg-black text-white rounded-lg disabled:opacity-50"
        >
          {activeTab === tabs.length - 2 ? "Complete Form" : "Next"}
        </button>
      </div>
    </div>
  );
}