import React from "react";
import { FaWandMagicSparkles } from "react-icons/fa6";

export default function AlertModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="mt-4 flex justify-end z-50">
      <div className="relative w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">New Hazards Detected</h3>
          <FaWandMagicSparkles className="text-2xl" />
        </div>
        <p className="text-base text-gray-600 mb-6">
          There are new hazards pending approval.
        </p>
        <div className="flex justify-center xl:justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 font-medium text-black rounded-full hover:bg-gray-300 focus:outline-none text-sm sm:text-base"
          >
            Close
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-gray-200 font-medium text-black rounded-full hover:bg-gray-300 focus:outline-none text-sm sm:text-base"
          >
            View Database
          </button>
        </div>
      </div>
    </div>
  );
}
