import { useState } from "react";

import ConfirmDialog from "./ConfirmDialog.jsx";

export default function ConfirmForm({ onCancel }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [numPages, setNumPages] = useState(null);

  const handleConfirm = () => {
    setDialogOpen(true);
  };

  return (
    <>
      {/* PDF Preview */}
      <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
        <iframe
          src="/pdf/test_lta.pdf"
          className="w-full h-screen"
          title="Reference PDF"
        />
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
