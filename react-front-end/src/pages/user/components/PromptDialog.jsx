import React from "react";
import { IoMdClose } from "react-icons/io";

export default function PromptDialog({ isOpen, message, onDelete, onClose, title, icon, confirmLabel, confirmClassName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md flex flex-col space-y-6">
        {/* Header with title and close icon */}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              {icon && <span className="text-2xl">{icon}</span>}
              <h2 className="text-2xl font-semibold text-gray-800">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <IoMdClose size={24} />
            </button>
          </div>
        )}

        {/* Warning message */}
        <p className="text-gray-800 text-lg">
          {message}
        </p>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className={`px-6 py-2 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${confirmClassName ? confirmClassName : 'bg-red-500 hover:bg-red-600'}`}
          >
            {confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}