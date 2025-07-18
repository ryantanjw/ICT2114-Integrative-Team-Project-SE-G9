import React from "react";
import { IoMdClose } from "react-icons/io";

export default function SummaryDialog({ title, message, processes, entries, onClose }) {
  // If both are missing or both empty, render nothing
  if ((!processes || processes.length === 0) && (!entries || entries.length === 0)) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col space-y-6">
        {/* Header with title and close icon */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        {/* Intro message */}
        {message && <p className="text-gray-700">{message}</p>}

        {/* Unified summary list */}
        <div className="space-y-4">
          {processes
            ? processes.map((proc, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-gray-800">{proc.name}</h3>
                  <div className="space-y-2">
                    {proc.aiOrNot.split('\n').map((line, idx) => {
                      const [activity, source] = line.split(' — ');
                      const chipColor =
                        source === "DB matched" ? "bg-green-100 text-green-800" :
                        source === "AI generated" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800";
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-gray-700">{activity}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${chipColor}`}>
                            {source === "DB matched" ? "DB" : source === "AI generated" ? "AI" : source}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            : entries.map((entry, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-700 whitespace-pre-wrap">{entry}</p>
                </div>
              ))
          }
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black text-white rounded-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}