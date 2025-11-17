import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { IoMdRefresh } from "react-icons/io";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import { FaChevronLeft, FaChevronRight, FaEye, FaDownload, FaTrash } from "react-icons/fa";
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
  const [viewFilter, setViewFilter] = useState("all"); // "all" or "own"
  const [raLeaders, setRaLeaders] = useState({}); // Store RA leader names



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

  const fetchUserForms = async (page = 1, search = "", division = "") => {
    try {
      setIsLoadingForms(true);
      console.log(`Fetching forms - Page: ${page}, Search: "${search}", Division: "${division}", View Filter: "${viewFilter}"`);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "21",
        ...(search && { search }),
        ...(division && { division })
      });

      // Only fetch completed forms when viewing "All Users"
      // Show all forms when viewing "My Forms Only"
      if (viewFilter === "all") {
        params.append("status", "Completed");
      } else if (viewFilter === "own" && adminData) {
        // Filter by current user's ID
        params.append("user_id", adminData.user_id.toString());
      }

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
        
        // Fetch RA leader names for all forms
        await fetchRaLeaders(response.data.forms);
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

  // Fetch RA leader names
  const fetchRaLeaders = async (formsList) => {
    try {
      const uniqueRaTeamIds = [...new Set(formsList.map(form => form.form_RA_team_id).filter(Boolean))];
      const leadersMap = {};
      
      for (const teamId of uniqueRaTeamIds) {
        try {
          const response = await axios.get(`/api/admin/getRaLeader/${teamId}`, {
            withCredentials: true
          });
          if (response.data.ra_leader_name) {
            leadersMap[teamId] = response.data.ra_leader_name;
          }
        } catch (error) {
          console.error(`Error fetching RA leader for team ${teamId}:`, error);
          leadersMap[teamId] = "Unknown";
        }
      }
      
      setRaLeaders(leadersMap);
    } catch (error) {
      console.error("Error fetching RA leaders:", error);
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
    fetchUserForms(1, query, divisionFilter); // Reset to page 1 when searching
  };

  // Handle filter changes
  const handleDivisionFilter = (division) => {
    setDivisionFilter(division);
    fetchUserForms(1, searchQuery, division);
  };

  // Handle view filter change (all users vs own forms)
  const handleViewFilterChange = (filter) => {
    setViewFilter(filter);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchUserForms(newPage, searchQuery, divisionFilter);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchUserForms(pagination.current_page, searchQuery, divisionFilter);
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
    setDivisionFilter("");
    setViewFilter("all");
    fetchUserForms(1, "", "");
  };

  // Handle sharing a form
  const handleShare = (formId) => {
    console.log(`Sharing form with ID: ${formId}`);
    // Add your share logic here
  };

  // Handle downloading a form
  const handleDownload = (formId, formTitle) => {
    console.log(`Downloading form: ${formTitle} (ID: ${formId})`);
    try {
      window.open(`/api/admin/downloadForm/${formId}`, '_blank');
    } catch (error) {
      console.error('Error downloading form:', error);
    }
  };

  // Handle viewing a form
  const handleView = async (formId) => {
    console.log(`Viewing form with ID: ${formId}`);
    
    // If viewing "My Forms", navigate to the form editor
    if (viewFilter === "own") {
      navigate(`/user/new/${formId}`);
    } else {
      // For "All Users", show PDF preview
      handlePreviewPdf(formId, forms.find(f => f.id === formId)?.title || "Form");
    }
  };

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
        fetchUserForms(pagination.current_page, searchQuery, divisionFilter);
      } else {
        console.error('Failed to delete form:', response.data.error);
        alert('Failed to delete form: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('Error deleting form. Please try again.');
    }
  };

  // Re-fetch forms when view filter changes
  useEffect(() => {
    if (adminData && !isLoading) {
      fetchUserForms(1, searchQuery, divisionFilter);
    }
  }, [viewFilter]);

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
        
        console.log("Admin session data stored:", response.data);

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
            {viewFilter === "all" ? "All Completed Forms" : "My Forms"}
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
            {(searchQuery || divisionFilter || viewFilter !== "all") && (
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
            {/* View Filter - All Users vs Own Forms */}
            <select
              value={viewFilter}
              onChange={(e) => handleViewFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="own">My Forms Only</option>
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
            {(searchQuery || divisionFilter || viewFilter !== "all") && (
              <span className="ml-2 font-medium">
                (filtered results)
              </span>
            )}
          </div>
        )}

        {/* Forms Table */}
        <div className="mt-6">
          {isLoadingForms ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading forms...</span>
            </div>
          ) : forms.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">
                {searchQuery || divisionFilter || viewFilter !== "all"
                  ? viewFilter === "own"
                    ? "No forms match your search criteria."
                    : "No completed forms match your search criteria."
                  : viewFilter === "own"
                    ? "No forms found."
                    : "No completed forms found."
                }
              </p>
            </div>
          ) : (
            <>
              {/* Table Container */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          S/N
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        {viewFilter === "own" && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Division
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RA Leader
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Review Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {forms.map((form, index) => (
                        <tr key={form.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pagination.start_index + index}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={form.title || "Untitled Form"}>
                              {form.title || "Untitled Form"}
                            </div>
                          </td>
                          {viewFilter === "own" && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                form.status === "Completed" 
                                  ? "bg-green-100 text-green-800" 
                                  : form.status === "review due"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {form.status}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {form.division || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {raLeaders[form.form_RA_team_id] || "Loading..."}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(form.next_review_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleView(form.id)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50"
                                title={viewFilter === "own" ? "Edit Form" : "View Form"}
                              >
                                <FaEye size={16} />
                              </button>
                              <button
                                onClick={() => handleOpenDownloadDialogue(form.id, form.title)}
                                className="text-green-600 hover:text-green-800 p-2 rounded-md hover:bg-green-50"
                                title="Download Form"
                              >
                                <FaDownload size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(form.id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50"
                                title="Delete Form"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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