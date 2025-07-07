import React from "react";
import { IoMdClose } from "react-icons/io";

export default function DownloadDialogue({ isOpen, onClose, formId }) {
  if (!isOpen) return null;

  const handleDownload = (format) => {
    // Open download endpoint in a new tab
    window.open(`/api/user/downloadForm/${formId}?format=${format}`, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Download Form</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoMdClose size={24} />
          </button>
        </div>
        <p className="mb-4 text-gray-600">
          Choose a format to download your form:
        </p>
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => handleDownload("docx")}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Download as DOCX
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  );
}