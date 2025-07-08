import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { IoMdRefresh } from "react-icons/io";
import CTAButton from "../../components/CTAButton.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import FormCardA2Admin from "../../components/FormCardA2Admin.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PdfPreviewModal from "./components/PdfPreviewModal.jsx";
import DownloadDialogue from "../../components/DownloadDialogue.jsx";

export default function AdminForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [forms, setForms] = useState([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedFormForPdf, setSelectedFormForPdf] = useState(null);
  const [isDownloadDialogueOpen, setIsDownloadDialogueOpen] = useState(false);
  const [selectedFormForDownload, setSelectedFormForDownload] = useState(null);



  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 21,
    total_forms: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
    next_page: null,
    prev_page: null,
    start_index: 0,
    end_index: 0
  });

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
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

  const fetchUserForms = async (page = 1, search = "", status = "", division = "") => {
    try {
      setIsLoadingForms(true);
      console.log(`Fetching forms - Page: ${page}, Search: "${search}", Status: "${status}", Division: "${division}"`);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "21",
        ...(search && { search }),
        ...(status && { status }),
        ...(division && { division })
      });

      const response = await axios.get(`/api/admin/retrieveForms?${params}`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      console.log("Forms fetched:", response.data);

      if (response.data.forms) {
        setForms(response.data.forms);
        setPagination(response.data.pagination);
      } else {
        setForms(response.data);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
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
  // const fetchFilterOptions = async () => {
  //   try {
  //     const response = await axios.get("/api/admin/formsStats", {
  //       withCredentials: true
  //     });

  //     if (response.data.available_divisions || response.data.available_locations) {
  //       setAvailableFilters({
  //         divisions: response.data.available_divisions || [],
  //         locations: response.data.available_locations || []
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error fetching filter options:", error);
  //   }
  // };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchUserForms(1, query, statusFilter, divisionFilter); // Reset to page 1 when searching
  };

  // Handle filter changes
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    fetchUserForms(1, searchQuery, status, divisionFilter);
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

  // Handle previewing PDF
  const handlePreviewPdf = (formId, formTitle) => {
    setSelectedFormForPdf({ id: formId, title: formTitle });
    setIsPdfModalOpen(true);
  };

  // Handle download dialogue
  const handleOpenDownloadDialogue = (formId, formTitle) => {
    console.log(`Opening download dialogue for: ${formTitle} (ID: ${formId})`);
    setSelectedFormForDownload({ id: formId, title: formTitle });
    setIsDownloadDialogueOpen(true);
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
          fetchUserForms(1),
          // fetchFilterOptions()
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

  // Show loading indicator while checking session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
      <div className="flex flex-col justify-start mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2 sm:mb-0">
            All Forms
          </h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoadingForms}
              className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoMdRefresh className={`mr-2 ${isLoadingForms ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {(searchQuery || statusFilter || divisionFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search forms, users, references..."
            initialValue={searchQuery}
          />

          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Incomplete">Incomplete</option>
              <option value="Completed">Completed</option>
              <option value="review due">Review Due</option>
            </select>

            {/* Division Filter */}
            {availableFilters.divisions.length > 0 && (
              <select
                value={divisionFilter}
                onChange={(e) => handleDivisionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Divisions</option>
                {availableFilters.divisions.map((division) => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {pagination.total_forms > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {pagination.start_index}-{pagination.end_index} of {pagination.total_forms} forms
            {(searchQuery || statusFilter || divisionFilter) && (
              <span className="ml-2 font-medium">
                (filtered results)
              </span>
            )}
          </div>
        )}

        {/* Forms Grid */}
        <div className="mt-6">
          {isLoadingForms ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading forms...</span>
            </div>
          ) : forms.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">
                {searchQuery || statusFilter || divisionFilter
                  ? "No forms match your search criteria."
                  : "No forms found. Create a new form to get started."
                }
              </p>
              {!(searchQuery || statusFilter || divisionFilter) && (
                <button
                  type="button"
                  onClick={() => navigate("/user/new")}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create New Form
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {forms.map((form) => (
                  <FormCardA2Admin
                    key={form.id}
                    date={formatDate(form.created_at || form.last_access_date)}
                    title={form.title || "Untitled Form"}
                    owner={form.owner || "Unknown User"}
                    tags={form.tags || [form.status] || ["Unknown"]}
                    status={form.status}
                    onPreviewPdf={() => handlePreviewPdf(form.id, form.title)}
                    onDownload={() => handleOpenDownloadDialogue(form.id, form.title)} // Update this line
                    onDelete={() => handleDelete(form.id)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.total_pages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={!pagination.has_prev}
                      className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft className="mr-1" size={12} />
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {/* Show first page */}
                      {pagination.current_page > 3 && (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePageChange(1)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            1
                          </button>
                          {pagination.current_page > 4 && <span className="px-2">...</span>}
                        </>
                      )}

                      {/* Show pages around current page */}
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.current_page - 2) + i;
                        if (pageNum > pagination.total_pages) return null;

                        return (
                          <button
                            type="button"
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 border rounded-md ${pageNum === pagination.current_page
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Show last page */}
                      {pagination.current_page < pagination.total_pages - 2 && (
                        <>
                          {pagination.current_page < pagination.total_pages - 3 && <span className="px-2">...</span>}
                          <button
                            type="button"
                            onClick={() => handlePageChange(pagination.total_pages)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            {pagination.total_pages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={!pagination.has_next}
                      className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <FaChevronRight className="ml-1" size={12} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
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