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

  // Cleanup object URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedPdfUrl);
      }
    };
  }, [generatedPdfUrl]);

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

      // Create a blob URL from the previous generation if it exists
      if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedPdfUrl);
      }

      // First, fetch complete form data (like in DownloadDialogue)
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formData.form_id}`, {
        credentials: 'include'
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch form data: ${dataResponse.status} ${dataResponse.statusText}`);
      }

      const completeFormData = await dataResponse.json();
      console.log("Complete form data retrieved:", completeFormData);

      // Now send this complete data to the PDF endpoint
      const response = await fetch(`/api/user/generate-pdf/${formData.form_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...completeFormData.data,
          format: 'pdf'  // Match the format parameter from DownloadDialogue
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }

      // Get the response as a blob
      const pdfBlob = await response.blob();

      // Check if we received a PDF or an error (JSON)
      if (pdfBlob.type === 'application/pdf') {
        // Create a URL for the blob
        const blobUrl = URL.createObjectURL(pdfBlob);
        console.log("Created blob URL for PDF:", blobUrl);
        setGeneratedPdfUrl(blobUrl);
      } else {
        // If the response is not a PDF, it might be JSON error
        const textData = await pdfBlob.text();
        console.error("Received non-PDF response:", textData);
        throw new Error('Server did not return a PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setLoadError(true);

      // If generation fails, use fallback PDF
      console.log("Using fallback PDF template");
      setUseFallbackPdf(true);
      setGeneratedPdfUrl(fallbackPdfUrl);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download DOCX version
  const downloadDocx = async () => {
    try {
      console.log("Downloading DOCX for form ID:", formData.form_id);
      
      // First, fetch complete form data
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formData.form_id}`, {
        credentials: 'include'
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch form data: ${dataResponse.status} ${dataResponse.statusText}`);
      }

      const completeFormData = await dataResponse.json();
      
      // Use the test-generate-document endpoint for DOCX (same as in DownloadDialogue)
      const response = await fetch(`/api/user/test-generate-document/${formData.form_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...completeFormData.data,
          format: 'docx'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate DOCX: ${response.status} ${response.statusText}`);
      }

      // Get the response as a blob
      const docxBlob = await response.blob();
      
      // Create a download link
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risk_assessment_${formData.form_id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("DOCX downloaded successfully");
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert("Failed to download DOCX. Please try again.");
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
      setGeneratedPdfUrl(fallbackPdfUrl);
    }
  };

  // Function to download the current PDF
  const downloadPdf = () => {
    if (generatedPdfUrl) {
      if (generatedPdfUrl.startsWith('blob:')) {
        // For blob URLs, create an anchor and trigger click
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        a.download = `risk_assessment_${formData.form_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // For regular URLs, just open in a new tab
        window.open(generatedPdfUrl, '_blank');
      }
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
              onLoad={() => console.log("PDF loaded successfully, URL:", generatedPdfUrl)}
            />
            {loadError && !useFallbackPdf && (
              <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
                <p className="text-red-700 mb-2">Could not display the PDF directly.</p>
                <div className="flex space-x-4">
                  <button
                    onClick={downloadPdf}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={generatePdf}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Try Again
                  </button>
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
              <button
                onClick={downloadPdf}
                className="px-4 py-2 bg-green-600 text-white rounded text-center"
              >
                Download PDF
              </button>
              {/* New DOCX download button */}
              <button
                onClick={downloadDocx}
                className="px-4 py-2 bg-blue-600 text-white rounded text-center"
              >
                Download DOCX
              </button>
              <button
                onClick={() => {
                  if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(generatedPdfUrl);
                  }
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