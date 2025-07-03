import { useState, useEffect } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function ConfirmForm({ formData, sessionData, updateFormData }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  useEffect(() => {
    console.log("ConfirmForm is rendering!"); // Debug to verify component is rendering
  }, []);

  const handleConfirm = () => {
    setDialogOpen(true);
  };

  // Path to PDF in public folder
  const pdfUrl = "/forms/test_lta.pdf"; 

  return (
    <>
      {/* PDF Preview */}
      <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
        {/* Direct embed approach - more compatible with local development */}
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-screen"
        >
          <div className="p-4 bg-gray-100">
            <p className="mb-4">PDF cannot be displayed directly in your browser.</p>
            <a 
              href={pdfUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Open PDF in new tab
            </a>
          </div>
        </object>
      </div>
      
      <div className="p-4 bg-white rounded shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Confirm Submission?</h2>
        <p className="mb-4">
          Please ensure all details filled are as accurate as possible for your current activity contexts.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleConfirm}
            className="px-10 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Confirm
          </button>
        </div>
      </div>
      <ConfirmDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}