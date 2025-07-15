import React, { useState, useEffect } from "react";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

export default function FormCardC({
  status,
  date,
  title,
  owner,
  injury,
  remarks,
  hazardType,
  activity,
  hazard,
  existingRiskControl,
  additionalRiskControl,
  severity,
  likelihood,
  RPN,
  process,
  onApproveHazard,
  onRejectHazard,
  onApproveRisk,
  isExpanded,
  onExpand,
}) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
      if (!isExpanded) setShowAll(false);
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

      {/* Unified Hazard & Risk Section */}
      <div className="mt-4 border-t pt-4">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(!showAll);
          }}
        >
          <span className="font-semibold">
            New Hazard, Injury & Risk Controls
          </span>
          {showAll ? <MdExpandLess /> : <MdExpandMore />}
        </div>

        {showAll && (
          <div className="mt-4 space-y-6">
            {/* Hazard Section */}
            <div>
              <p className="font-bold text-orange-600">Process Name: {process}</p>
              <p className="font-bold text-orange-600">Activity Name: {activity}</p>
              <p className="text-sm text-gray-700 mb-2">Hazard Description: {hazard}</p>
              <p className="text-sm text-gray-700 mb-2">Hazard Type: {hazardType}</p>
              <p className="text-sm text-gray-700 mb-2">Remarks: {remarks}</p>
            </div>
            <hr className="my-4 border-gray-300" />


            {/* Injury & Risk Section */}
            <div>
              <p className="font-bold text-orange-600">Injury: {injury}</p>
              <p className="text-sm text-gray-700 mb-2">
                Risk Control for Injury: {existingRiskControl}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                Severity: {severity} | Likelihood: {likelihood} | RPN: {RPN}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveHazard();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1 rounded-full"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRejectHazard();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1 rounded-full ml-2"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
