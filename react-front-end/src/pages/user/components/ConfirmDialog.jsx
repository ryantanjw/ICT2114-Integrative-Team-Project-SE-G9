import React from "react";
import { useNavigate } from "react-router-dom";
import CTAButton from "../../../components/CTAButton.jsx";

export default function ConfirmDialog({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleBackHome = () => {
    onClose();
    navigate("/home");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg space-y-6 text-center">
        <h2 className="text-2xl font-bold">Submission Successful!</h2>
        <p className="text-gray-700">
          Thanks for upholding safety! You will now be directed to your main page!
        </p>
        <div className="flex justify-center">
          <CTAButton
            text="Back to Home"
            onClick={handleBackHome}
          />
        </div>
      </div>
    </div>
  );
}
