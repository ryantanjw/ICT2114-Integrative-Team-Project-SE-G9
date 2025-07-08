import React from "react";
import { IoMdClose } from "react-icons/io";

export default function DownloadDialogue({ isOpen, onClose, formId, formTitle }) {
  console.log("DownloadDialogue rendered with:", { isOpen, formId, formTitle });

  if (!isOpen) {
    console.log("Dialog not open, returning null");
    return null;
  }

  const handleDownload = async (format) => {
    // Open download endpoint in a new tab

    try {
      // Make API call to retrieve all the form data
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formId}`, {
        credentials: 'include'
      });
      const formData = await dataResponse.json();

      console.log("Form data retrieved:", formData);

      // Choose the appropriate endpoint based on format
      const endpoint = format === 'pdf' 
        ? `/api/user/generate-pdf/${formId}` 
        : `/api/user/test-generate-document/${formId}`;

      const docResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData.data,
          format: format // Pass the format to the backend
        })
      });

      if (!docResponse.ok) {
        throw new Error(`HTTP error! status: ${docResponse.status}`);
      }

      // Get the blob from the response
      const blob = await docResponse.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set the filename based on format
      const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
      link.download = `${formTitle}_Risk_Assessment.${fileExtension}`;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`Form downloaded successfully as ${format.toUpperCase()}`);
      
      // Close the dialog after successful download
      onClose();
      
    } catch (error) {
      console.error('Error downloading form:', error);
      
      // Show user-friendly error message
      alert(`Failed to download the form as ${format.toUpperCase()}. Please try again.`);
    }  
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