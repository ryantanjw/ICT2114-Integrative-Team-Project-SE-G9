import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import FormCardA2 from "../../components/FormCardA2.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ShareDialogue from "../../components/ShareDialogue.jsx";
import DownloadDialogue from "../../components/DownloadDialogue.jsx";
import { IoMdRefresh } from "react-icons/io";

export default function UserForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const [pagination, setPagination] = useState({
  current_page: 1,
  per_page: 9,
  total_forms: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
  next_page: null,
  prev_page: null,
  start_index: 0,
  end_index: 0
});

  // Share form functionality
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedDownloadFormId, setSelectedDownloadFormId] = useState(null);
  const [selectedFormTitle, setSelectedFormTitle] = useState('');

  const [usersList, setUsersList] = useState([]);
  const dropdownRef = useRef(null);

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

   // Function to fetch user's forms
  const fetchUserForms = async (page = 1, search = "", status = "", division = "") => {
  try {
    setIsLoadingForms(true);
    console.log(`Fetching user forms - Page: ${page}, Search: "${search}", Status: "${status}", Division: "${division}"`);
    
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: "9",
      ...(search && { search }),
      ...(status && { status }),
      ...(division && { division })
    });

    const response = await axios.get(`/api/user/retrieveForms?${params}`, {
      withCredentials: true,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log("Forms fetched:", response.data);

    // Used to get the response data of each form
    const formsArray = response.data.forms || [];

    formsArray.forEach((form, index) => {
      console.log(`Form ${index + 1}:`, {
        id: form.id,
        title: form.title,
        status: form.status,
        approval: form.approval, // Add this to see the raw approval value
        statusType: typeof form.status,
        statusLength: form.status?.length
      });
    });
    
    if (response.data.forms) {
      setForms(response.data.forms);
      setPagination(response.data.pagination);
    } else {
      // Handle old response format (if backend isn't updated yet)
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

const handleDownload = (formId, formTitle) => {
  console.log(`Preparing download for form: ${formTitle} (ID: ${formId})`);
  setSelectedDownloadFormId(formId);
  setSelectedFormTitle(formTitle);
  setIsDownloadDialogOpen(true);
};


const handleView = async (formId) => {
  console.log(`Redirecting user to form with ID: ${formId}`);

  navigate(`/user/new/${formId}`);
}

const handleDuplicate = async (formId) => {
  console.log(`Duplicating form with ID: ${formId}`);
  
  // Show confirmation dialog
  if (!window.confirm('Are you sure you want to duplicate this form? This will create a copy with all existing data.')) {
    return;
  }

  try {
    setIsLoading(true);

    const response = await axios.post(`/api/user/duplicateForm/${formId}`, {}, {
      withCredentials: true
    });

    if (response.data.success) {
      console.log('Form duplicated successfully:', response.data);
      
      // Show success message
      alert(`Form duplicated successfully! New form: "${response.data.new_form_title}"`);
      
      // Refresh the forms list to show the new duplicated form
      await fetchUserForms();
      
      // Optionally navigate to the new form for editing
      // navigate(`/user/new/${response.data.new_form_id}`);
      
    } else {
      console.error('Failed to duplicate form:', response.data.error);
      alert('Failed to duplicate form: ' + response.data.error);
    }
  } catch (error) {
    console.error('Error duplicating form:', error);
  } finally {
    setIsLoading(false);
  }


}

const handleStatusFilter = (status) => {
  setStatusFilter(status);
  fetchUserForms(1, searchQuery, status, divisionFilter);
};

const handleDivisionFilter = (division) => {
  setDivisionFilter(division);
  fetchUserForms(1, searchQuery, statusFilter, division);
};

const handlePageChange = (newPage) => {
  if (newPage >= 1 && newPage <= pagination.total_pages) {
    fetchUserForms(newPage, searchQuery, statusFilter, divisionFilter);
  }
};

const handleRefresh = () => {
  fetchUserForms(pagination.current_page, searchQuery, statusFilter, divisionFilter);
};

const clearFilters = () => {
  setSearchQuery("");
  setStatusFilter("");
  setDivisionFilter("");
  fetchUserForms(1, "", "", "");
};

const handleShare = (formId) => {
  console.log("=== handleShare called ===");
  console.log("Received formId:", formId);
  console.log("Setting selectedFormId to:", formId);
  
  setSelectedFormId(formId);
  setIsShareDialogOpen(true);
  
  console.log("Dialog should now be open");
  console.log("selectedFormId state:", selectedFormId); // Note: This might still show old value due to async state
};

const handleShareSubmit = async (formId, sharedUsers) => {

  if (!formId || formId === null) {
    console.error('No form ID provided for sharing');
    alert('Error: No form selected for sharing');
    return;
  }
  
  console.log(`Sharing form with ID: ${formId} to ${sharedUsers.length} user(s)`);
  
  if (!window.confirm(`Are you sure you want to share this form with ${sharedUsers.length} user(s)? This will create a copy for each selected user.`)) {
    return;
  }
  
  try {
    setIsLoadingForms(true);

     const sharePromises = sharedUsers.map(async (user) => {
      try {
        const response = await axios.post(`/api/user/shareForm/${formId}`, {
          target_user_id: user.id,
          share_type: 'copy',
          permissions: 'view'
        }, {
          withCredentials: true
        });
        
        return {
          success: response.data.success,
          user: user.name,
          response: response.data
        };
      } catch (error) {
        console.error(`Error sharing form with ${user.name}:`, error);
        return {
          success: false,
          user: user.name,
          error: error.response?.data?.error || error.message
        };
      }
    });
    
    const results = await Promise.all(sharePromises);

    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    if (successResults.length > 0) {
      console.log('Forms shared successfully:', successResults);
      alert(`Form shared successfully with ${successResults.length} user(s)!`);
    }
    
    if (failedResults.length > 0) {
      const failedUsers = failedResults.map(r => r.user);
      console.error('Failed to share form with:', failedUsers);
      alert('Failed to share form with: ' + failedUsers.join(', '));
    }

    // Close dialog and refresh forms list
    setIsShareDialogOpen(false);
    setSelectedFormId(null);
    await fetchUserForms();
    
  } catch (error) {
    console.error('Error in share process:', error);
    alert('Error sharing form. Please try again.');
  } finally {
    setIsLoadingForms(false);
  }

};

const handleSearch = (query) => {
  setSearchQuery(query);
  fetchUserForms(1, query, statusFilter, divisionFilter); // Reset to page 1 when searching
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
      // fetchUserForms(pagination.current_page, searchQuery, statusFilter, divisionFilter);
      // fetchUserForms(pagination.current_page);
      fetchUserForms();
    } else {
      console.error('Failed to delete form:', response.data.error);
      alert('Failed to delete form: ' + response.data.error);
    }
  } catch (error) {
    console.error('Error deleting form:', error);
    alert('Error deleting form. Please try again.');
  }
};

  // Fetch users for the dropdown search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/user/users');
        if (response.ok) {
          const data = await response.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Check session when component mounts
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking user session...");
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
        
        // If user is an admin, redirect to admin dashboard
        if (response.data.user_role === 0) {
          console.log("Admin user detected, redirecting to admin dashboard");
          navigate("/admin");
          return;
        }
        
        // Store user data for display
        setUserData(response.data);
        
        console.log("user data has been set:", response.data);

        await fetchUserForms();
        
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
      <Header activePage={location.pathname} />
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
                  <FormCardA2
                    key={form.id}
                    date={formatDate(form.created_at || form.last_access_date)}
                    title={form.title || "Untitled Form"}
                    owner={form.owner || "Unknown User"}
                    tags={form.tags || [form.status] || ["Unknown"]}
                    status={form.status}
                    // tags={createTags(form)}
                    onDuplicate={() => handleDuplicate(form.id)}
                    onView={() => handleView(form.id)}
                    onShare={() => handleShare(form.id)}
                    onDownload={() => handleDownload(form.id, form.title)}
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
      
      {isShareDialogOpen && (
        <ShareDialogue
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedFormId(null);
          }}
          formId={selectedFormId}
          currentUser={userData}
          onShare={handleShareSubmit}
        />
      )}
      
      {isDownloadDialogOpen && (
        <DownloadDialogue
          isOpen={isDownloadDialogOpen}
          onClose={() => {
            setIsDownloadDialogOpen(false);
            setSelectedDownloadFormId(null);
          }}
          formId={selectedDownloadFormId}
          formTitle={selectedFormTitle}
        />
      )}
    </div>
  );
}


      