import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import FormCardA2 from "../../components/FormCardA2.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ShareDialogue from "../../components/ShareDialogue.jsx";

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

  // Share form functionality
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);

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
      per_page: "21",
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

// Handle downloading a form
const handleDownload = async (formId, formTitle) => {
  console.log(`Downloading form: ${formTitle} (ID: ${formId})`);

  try {

    // Make API call to get the file using test endpoint
    const response = await fetch(`/api/user/test-generate-document/${formId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
       withCredentials: true
    });

    // Make API call to get the file
    // const response = await fetch(`/api/user/risk-assessments/${formId}/export/word`, {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   withCredentials: true
    // });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the blob from the response
    const blob = await response.blob();
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Set the filename - you can customize this based on your needs
    link.download = `${formTitle}_Risk_Assessment.docx`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('Form downloaded successfully');
    
  } catch (error) {
    console.error('Error downloading form:', error);
    
    // Optional: Show user-friendly error message
    alert('Failed to download the form. Please try again.');
  }
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
        // Here you would typically fetch the user's forms
        // For example:
        // const formsResponse = await axios.get("/api/user/forms", {
        //   withCredentials: true
        // });
        // setForms(formsResponse.data);

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
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          All Forms
        </h3>
          <SearchBar 
            onSearch={handleSearch} 
            placeholder="Search forms, users, references..." 
            initialValue={searchQuery}
          />        
          <div className="mt-6">
          {/* Set forms.length === 1 temporarily so that i can see the UI --> RESET Back to 0 After */}
          {forms.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-600">No forms found. Create a new form to get started.</p>
              <button 
                onClick={() => navigate("/user/new")}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Create New Form
              </button>
            </div>
          ) : (
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
    </div>
  );
}


      