import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import axios from "axios";
import RegisterForm from "./components/RegisterForm.jsx";
import CTAButton from "../../components/CTAButton.jsx";
import { FaPlus } from "react-icons/fa";
import { MdNoteAdd } from "react-icons/md";
import FormCardA2 from "../../components/FormCardA2.jsx";
import FormCardA2Admin from "../../components/FormCardA2Admin.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PdfPreviewModal from "./components/PdfPreviewModal.jsx";
import DownloadDialogue from "../../components/DownloadDialogue.jsx";
import AlertModal from "./components/AlertModal.jsx";


export default function AdminHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [forms, setForms] = useState([]);
  const [showHazardAlert, setShowHazardAlert] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedFormForPdf, setSelectedFormForPdf] = useState(null);
  const [isDownloadDialogueOpen, setIsDownloadDialogueOpen] = useState(false);
  const [selectedFormForDownload, setSelectedFormForDownload] = useState(null);




  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 9,
    total_forms: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    next_page: null,
    prev_page: null,
    start_index: 0,
    end_index: 0
  });

  const [availableFilters, setAvailableFilters] = useState({
    divisions: [],
    locations: []
  });

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const fetchRecentlyCompletedForms = async () => {
    try {
      setIsLoadingForms(true);
      console.log("Fetching 9 latest completed forms");

      const params = new URLSearchParams({
        page: "1",
        per_page: "9",
        status: "completed", // Only fetch completed forms
        sort_by: "created_at", // Sort by creation date
        sort_order: "desc" // Latest first
      });

      const response = await axios.get(`/api/admin/retrieveForms?${params}`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.data.forms) {
        setForms(response.data.forms);
        setPagination(response.data.pagination);
      } else {
        // Handle old response format (if backend isn't updated yet)
        setForms(response.data);
      }
    } catch (error) {
      console.error("Error fetching recent completed forms:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      // Show user-friendly error message
      setForms([]);
      setPagination(prev => ({ ...prev, total_forms: 0, total_pages: 0 }));
    } finally {
      setIsLoadingForms(false);
    }
  };

  // Function to fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get("/api/admin/formsStats", {
        withCredentials: true
      });

      if (response.data.available_divisions || response.data.available_locations) {
        setAvailableFilters({
          divisions: response.data.available_divisions || [],
          locations: response.data.available_locations || []
        });
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  const handleDivisionFilter = (division) => {
    setDivisionFilter(division);
    fetchUserForms(1, searchQuery, statusFilter, division);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchUserForms(newPage, searchQuery, statusFilter, divisionFilter);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchUserForms(pagination.current_page, searchQuery, statusFilter, divisionFilter);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setDivisionFilter("");
    fetchUserForms(1, "", "", "");
  };

  // Handle sharing a form
  const handleShare = (formId) => {
    console.log(`Sharing form with ID: ${formId}`);
    // Add your share logic here
    // For example, copy link to clipboard or open share modal
  };

  // Handle downloading a form
  const handleDownload = (formId, formTitle) => {
    console.log(`Downloading form: ${formTitle} (ID: ${formId})`);
    // Add your download logic here
    // For example, generate PDF or export data
    try {
      // Example: Navigate to download endpoint
      window.open(`/api/admin/downloadForm/${formId}`, '_blank');
    } catch (error) {
      console.error('Error downloading form:', error);
    }
  };

  const handleOpenDownloadDialogue = (formId, formTitle) => {
    console.log(`Opening download dialogue for: ${formTitle} (ID: ${formId})`);
    setSelectedFormForDownload({ id: formId, title: formTitle });
    setIsDownloadDialogueOpen(true);
  };


  const handlePreviewPdf = (formId, formTitle) => {
    console.log("Preview PDF clicked for:", formId, formTitle);
    setSelectedFormForPdf({ id: formId, title: formTitle });
    setIsPdfModalOpen(true);
  };


  // Handle viewing a form --> allows user to edit form --> redirect to form 1
  const handleView = async (formId) => {
    console.log(`Redirecting user to form with ID: ${formId}`);
    try {
      // Example: Navigate to view form1 endpoint
      // window.open(`/api/admin/downloadForm/${formId}`, '_blank');
    } catch (error) {
      console.error('Error downloading form:', error);
    }
  }

  // Handle deleting a form
  const handleDelete = async (formId) => {
    console.log(`Deleting form with ID: ${formId}`);

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/admin/deleteForm/${formId}`, {
        withCredentials: true
      });

      if (response.data.success) {
        console.log('Form deleted successfully');
        // Refresh the forms list
        // fetchUserForms(pagination.current_page, searchQuery, statusFilter, divisionFilter);
        fetchUserForms(pagination.current_page);
      } else {
        console.error('Failed to delete form:', response.data.error);
        alert('Failed to delete form: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Error deleting form. Please try again.');
    }
  };

  // Check for any new Hazard notification
  const checkHazardNotification = async () => {
    try {
      const response = await axios.get("/api/admin/notification", {
        withCredentials: true,
      });
      if (response.data === true) {
        setShowHazardAlert(true);
      }
    } catch (err) {
      console.error("Error checking hazard notification:", err);
    }
  };

  // Check session when component mounts
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking admin session...");
        setIsLoading(true);

        const response = await axios.get("/api/check_session", {
          withCredentials: true
        });

        console.log("Session check response:", response.data);

        // If not logged in, redirect to login page
        if (!response.data.logged_in) {
          console.log("No active session found, redirecting to login");
          navigate("/auth/login");
          return;
        }

        // If user is not an admin, redirect to user dashboard
        if (response.data.user_role !== 0) {
          console.log("Non-admin user detected, redirecting to user dashboard");
          navigate("/home");
          return;
        }

        // Store admin data for display
        setAdminData(response.data);

        // Fetch initial data
        await Promise.all([
          fetchRecentlyCompletedForms(),
          checkHazardNotification(),
          //   fetchFilterOptions()
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        navigate("/auth/login");
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="relative bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />

      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          Available Actions (Admin)
        </h3>

        <AlertModal
          isOpen={showHazardAlert}
          onClose={() => setShowHazardAlert(false)}
          onConfirm={() => {
            setShowHazardAlert(false);
            navigate("/admin/db");
          }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mt-6">
          <ActionCard
            header="Create New Form"
            subtext="Submit risk assessment for potential hazards"
            onStart={() => navigate("/user/new")}
            icon={<MdNoteAdd className="text-3xl" />}
          />
          <ActionCard
            header="Account Enrolment"
            subtext="Grant new personnel access to risk assessments"
            onStart={() => setModalOpen(true)}
            icon={<MdPeople className="text-3xl" />}
          />
          <ActionCard
            header="User Management"
            subtext="Manage personnel account information"
            onStart={() => navigate("/admin/user")}
            icon={<BiSolidUserAccount className="text-3xl" />}
            startText="Manage"
          />
          <ActionCard
            header="View Forms"
            subtext="Manage risk assessment forms"
            onStart={() => navigate("/admin/form")}
            icon={<IoMdDocument className="text-3xl" />}
            startText="View"
          />
        </div>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-8">
          Recent Forms
        </h3>
      </div>

      <RegisterForm isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {forms.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {Math.min(9, forms.length)} latest completed forms
        </div>
      )}

      <div className="mt-6">
        {isLoadingForms ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">Loading recent forms...</span>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <p className="text-gray-600">No completed forms found.</p>
            <button
              type="button"
              onClick={() => navigate("/admin/form")}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              View All Forms
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {forms.map((form) => (
              <FormCardA2Admin
                key={form.id}
                date={formatDate(form.created_at || form.last_access_date)}
                expiryDate={formatDate(form.next_review_date)}
                title={form.title || "Untitled Form"}
                owner={form.owner || "Unknown User"}
                tags={form.tags || [form.status] || ["Unknown"]}
                status={form.status}
                onPreviewPdf={() => handlePreviewPdf(form.id, form.title)}
                onDownload={() => handleOpenDownloadDialogue(form.id, form.title)} // Update this line
                onDelete={async () => {
                  // Your existing delete logic
                  if (!window.confirm("Are you sure you want to delete this form?")) return;
                  try {
                    const response = await axios.delete(`/api/admin/deleteForm/${form.id}`, { withCredentials: true });
                    if (response.data.success) fetchRecentlyCompletedForms();
                    else alert("Failed to delete form");
                  } catch (error) {
                    alert("Error deleting form");
                  }
                }}
              />
            ))}

          </div>
        )}
      </div>
      <DownloadDialogue
        isOpen={isDownloadDialogueOpen}
        onClose={() => setIsDownloadDialogueOpen(false)}
        formId={selectedFormForDownload?.id}
        formTitle={selectedFormForDownload?.title}
      />

      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        formId={selectedFormForPdf?.id}
        formTitle={selectedFormForPdf?.title}
      />
    </div>
  );
}
