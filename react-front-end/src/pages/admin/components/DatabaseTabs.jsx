import React, { useState } from "react";

const tabs = [
  { label: "Unapproved Records" },
];

export default function DatabaseTabs({ onTabChange }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleNext = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
      //onTabChange?.(activeTab + 1);
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
    </div>
  )
}