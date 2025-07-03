import { useState, useEffect } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function ConfirmForm({ formData, sessionData, updateFormData }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [useFallbackPdf, setUseFallbackPdf] = useState(false);
  
  // Define fallback PDF URL
  const fallbackPdfUrl = "/forms/Risk_Assessment_Form_Template.pdf";
  
  useEffect(() => {
    console.log("ConfirmForm is rendering!"); // Debug to verify component is rendering
  }, []);

  const handleConfirm = () => {
    setDialogOpen(true);
  };

  // Function to generate filled PDF
  const generatePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setLoadError(false); // Reset any previous errors
      setUseFallbackPdf(false); // Reset fallback flag
      
      console.log("Generating PDF for form ID:", formData.form_id);
      
      // Try to generate PDF from backend
      const response = await fetch('/user/generate_pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_id: formData.form_id
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("PDF generation response:", data);
      
      if (data.success) {
        // Important: Make sure to use the full URL to the PDF
        const fullPdfUrl = data.pdf_url.startsWith('http') 
          ? data.pdf_url 
          : window.location.origin + data.pdf_url;
          
        console.log("Setting PDF URL to:", fullPdfUrl);
        setGeneratedPdfUrl(fullPdfUrl);
      } else {
        throw new Error(data.error || 'Unknown error generating PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setLoadError(true);
      
      // If generation fails, use fallback PDF
      console.log("Using fallback PDF template");
      setUseFallbackPdf(true);
      setGeneratedPdfUrl(window.location.origin + fallbackPdfUrl);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Add a function to handle PDF display errors
  const handlePdfError = () => {
    console.error("Error displaying PDF");
    setLoadError(true);
    
    // If displaying generated PDF fails, use fallback
    if (!useFallbackPdf) {
      console.log("Error displaying generated PDF, switching to fallback template");
      setUseFallbackPdf(true);
      setGeneratedPdfUrl(window.location.origin + fallbackPdfUrl);
    }
  };

  return (
    <>
      {/* PDF Preview */}
      <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
        {isGeneratingPdf ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">Generating PDF with your form data...</p>
          </div>
        ) : generatedPdfUrl ? (
          // Show PDF (generated or fallback)
          <div className="w-full h-screen">
            {useFallbackPdf && (
              <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                <p className="text-yellow-800">
                  <strong>Notice:</strong> Using template PDF. Custom PDF generation is currently unavailable.
                </p>
              </div>
            )}
            <iframe
              src={generatedPdfUrl}
              className="w-full h-full"
              title="PDF Document"
              onError={handlePdfError}
            />
            {loadError && !useFallbackPdf && (
              <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
                <p className="text-red-700 mb-2">Could not display the PDF directly.</p>
                <div className="flex space-x-4">
                  <a 
                    href={generatedPdfUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Open in new tab
                  </a>
                  <a 
                    href={generatedPdfUrl} 
                    download
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Show initial state when no PDF has been generated yet
          <div className="p-6 bg-gray-50 text-center">
            <h3 className="text-xl font-semibold mb-4">Risk Assessment Document</h3>
            <p className="mb-6">Click the button below to generate a PDF with your form data.</p>
            <button
              onClick={generatePdf}
              disabled={isGeneratingPdf}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Generate Document
            </button>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-white rounded shadow border border-gray-200">
        {generatedPdfUrl && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 mb-2">
              {useFallbackPdf 
                ? "Template PDF loaded successfully!" 
                : "Custom PDF generated successfully!"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={generatedPdfUrl} 
                download
                className="px-4 py-2 bg-green-600 text-white rounded text-center"
              >
                Download PDF
              </a>
              <button
                onClick={() => {
                  setGeneratedPdfUrl(null);
                  setUseFallbackPdf(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded text-center"
              >
                Generate New PDF
              </button>
              {useFallbackPdf && (
                <button
                  onClick={generatePdf}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-center"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}
        
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