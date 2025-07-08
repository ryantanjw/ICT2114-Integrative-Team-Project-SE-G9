import { useState, useEffect } from "react";
import { IoMdClose, IoMdRefresh } from "react-icons/io";

// Fix the useEffect placement
export default function PdfPreviewModal({ isOpen, onClose, formId, formTitle }) {
  console.log("PdfPreviewModal rendered with:", { isOpen, formId, formTitle });

  const [loadError, setLoadError] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(true);
  const [useFallbackPdf, setUseFallbackPdf] = useState(false);

  // Define fallback PDF URL
  const fallbackPdfUrl = "/forms/Risk_Assessment_Form_Template.pdf";

  // Cleanup object URL when component unmounts or URL changes
  useEffect(() => {
    if (isOpen && formId) {
      generatePdf();
    }

    return () => {
      if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedPdfUrl);
      }
    };
  }, [isOpen, formId]);

  // Important: Move early return AFTER the useEffect
  if (!isOpen) return null;

  // Function to generate filled PDF
  const generatePdf = async () => {
    if (!formId) return;

    try {
      setIsGeneratingPdf(true);
      setLoadError(false);
      setUseFallbackPdf(false);

      console.log("Generating PDF for form ID:", formId);

      // Create a blob URL from the previous generation if it exists
      if (generatedPdfUrl && generatedPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedPdfUrl);
      }

      // First, fetch complete form data
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formId}`, {
        credentials: 'include'
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch form data: ${dataResponse.status} ${dataResponse.statusText}`);
      }

      const completeFormData = await dataResponse.json();

      // Now send this complete data to the PDF endpoint
      const response = await fetch(`/api/user/generate-pdf/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...completeFormData.data,
          format: 'pdf'
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
      setUseFallbackPdf(true);
      setGeneratedPdfUrl(fallbackPdfUrl);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Function to download DOCX
  const downloadDocx = async () => {
    try {
      console.log("Downloading DOCX for form ID:", formId);

      // First, fetch complete form data
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formId}`, {
        credentials: 'include'
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch form data: ${dataResponse.status} ${dataResponse.statusText}`);
      }

      const completeFormData = await dataResponse.json();

      // Use the test-generate-document endpoint for DOCX
      const response = await fetch(`/api/user/test-generate-document/${formId}`, {
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
      a.download = `risk_assessment_${formId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert("Failed to download DOCX. Please try again.");
    }
  };

  // Function to download PDF
  const downloadPdf = () => {
    if (generatedPdfUrl) {
      if (generatedPdfUrl.startsWith('blob:')) {
        // For blob URLs, create an anchor and trigger click
        const a = document.createElement('a');
        a.href = generatedPdfUrl;
        a.download = `risk_assessment_${formId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // For regular URLs, just open in a new tab
        window.open(generatedPdfUrl, '_blank');
      }
    }
  };

  // Handle PDF display errors
  const handlePdfError = () => {
    console.error("Error displaying PDF");
    setLoadError(true);

    if (!useFallbackPdf) {
      setUseFallbackPdf(true);
      setGeneratedPdfUrl(fallbackPdfUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold">
            {formTitle ? `${formTitle} - PDF Preview` : "PDF Preview"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          {isGeneratingPdf ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-lg">Generating PDF, please wait...</p>
            </div>
          ) : generatedPdfUrl ? (
            <div className="h-full">
              {useFallbackPdf && (
                <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                  <p className="text-yellow-800 text-sm">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
                    <p className="text-red-700 mb-4">Could not display the PDF directly.</p>
                    <div className="flex justify-center space-x-4">
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
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>No PDF available</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t p-4">
          <div className="flex flex-wrap gap-3 justify-end">
            {generatedPdfUrl && (
              <>
                <button
                  onClick={downloadPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download PDF
                </button>
                <button
                  onClick={downloadDocx}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download DOCX
                </button>
                <button
                  onClick={generatePdf}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  <IoMdRefresh className="mr-1" size={18} /> 
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}