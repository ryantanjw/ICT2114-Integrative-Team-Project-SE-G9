import React, { useState, useEffect } from "react";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

export default function FormCardC({
  status,
  date,
  title,
  owner,
  onApproveHazard,
  onApproveRisk,
  isExpanded,
  onExpand,
}) {
  const [showHazard, setShowHazard] = useState(false);
  const [showRisk, setShowRisk] = useState(false);

  // Collapse both sections when card is not expanded
  useEffect(() => {
    if (!isExpanded) {
      setShowHazard(false);
      setShowRisk(false);
    }
  }, [isExpanded]);

  return (
    <div
      className="bg-white rounded-xl shadow p-5 flex flex-col justify-between cursor-pointer"
      onClick={onExpand}
    >
      {/* Status and Date */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full" />
          <div>
            <span className="bg-red-700 text-white text-sm px-3 py-1 rounded-full">
              {status}
            </span>
            <p className="text-sm text-gray-500 mt-1">{date}</p>
          </div>
        </div>
        <div className="text-gray-400">⋮</div>
      </div>

      {/* Title and Owner */}
      <div className="mt-4">
        <h4 className="text-lg font-medium">{title}</h4>
        <p className="text-sm text-gray-500 mb-2">{owner}</p>
      </div>

      {/* New Hazard Section */}
      <div className="mt-4 border-t pt-4">
        <div
          className="flex justify-between items-center"
          onClick={(e) => {
            e.stopPropagation();
            setShowHazard(!showHazard);
          }}
        >
          <span className="font-semibold">New Hazard</span>
          {showHazard ? <MdExpandLess /> : <MdExpandMore />}
        </div>

        {showHazard && (
          <div className="mt-3">
            <p className="font-bold text-orange-600">Activity Name</p>
            <p className="text-sm text-gray-700 mb-2">Hazard Name</p>
            <div className="flex justify-end">
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onApproveHazard();
                }}
                className="bg-green-600 hover:bg-green-600 text-white text-sm px-4 py-1 rounded-full mt-2"
                >
                Approve
                </button>
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onApproveHazard();
                }}
                className="bg-red-600 hover:bg-red-600 text-white text-sm px-4 py-1 rounded-full ml-2 mt-2"
                >
                Reject
                </button>
            </div>
          </div>
        )}
      </div>

      {/* New Injury & Risk Controls Section */}
      <div className="mt-4 border-t pt-4">
        <div
          className="flex justify-between items-center"
          onClick={(e) => {
            e.stopPropagation();
            setShowRisk(!showRisk);
          }}
        >
          <span className="font-semibold">New Injury & Risk Controls</span>
          {showRisk ? <MdExpandLess /> : <MdExpandMore />}
        </div>

        {showRisk && (
          <div className="mt-3">
            <p className="font-bold text-orange-600">Injury Name</p>
            <p className="text-sm text-gray-700 mb-2">Risk Control for Injury</p>
            <div className="flex justify-end">
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onApproveHazard();
                }}
                className="bg-green-600 hover:bg-green-600 text-white text-sm px-4 py-1 rounded-full mt-2"
                >
                Approve
                </button>
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onApproveHazard();
                }}
                className="bg-red-600 hover:bg-red-600 text-white text-sm px-4 py-1 rounded-full ml-2 mt-2"
                >
                Reject
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
