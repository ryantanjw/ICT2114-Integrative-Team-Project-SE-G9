import React, { useEffect, useState, useRef, forwardRef } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import { MdNoteAdd } from "react-icons/md";
import axios from "axios";
import FormCardA2 from "../../components/FormCardA2.jsx";
import ShareDialogue from "../../components/ShareDialogue.jsx";

export default function UserHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // User search functionality
  const [usersList, setUsersList] = useState([]);
  const [activeTeamMemberIndex, setActiveTeamMemberIndex] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Share form functionality
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const fetchRecentUserForms = async () => {
    try {
      setIsLoadingForms(true);
      console.log("Fetching user's 9 most recent forms...");
      
      // Add parameters for recent forms - sorted by last access or creation date
      const params = new URLSearchParams({
        limit: "9",
        sort_by: "last_access_date", // "can be created_at or last_access_date for this param"
        sort_order: "desc" // Most recent first
      });

      const response = await axios.get(`/api/user/retrieveForms?${params}`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Recent forms fetched:", response.data);

      // Handle different response formats
      if (response.data.forms) {
        setForms(response.data.forms);
      } else {
        // Handle old response format
        const formsArray = response.data || [];
        // Sort by most recent if backend doesn't handle sorting
        const sortedForms = formsArray
          .sort((a, b) => new Date(b.last_access_date || b.created_at) - new Date(a.last_access_date || a.created_at))
          .slice(0, 9); // Take only first 9
        setForms(sortedForms);
      }

    } catch (error) {
      console.error("Error fetching recent forms:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      // Set empty forms on error
      setForms([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleDownload = async (formId, formTitle) => {
    console.log(`Downloading form: ${formTitle} (ID: ${formId})`);

    try {

      // Make API call here to retrieve all the form data to pass in after
      const dataResponse = await fetch(`/api/user/getFormDataForDocument/${formId}`, {
        credentials: 'include'
      });
      const formData = await dataResponse.json();

      console.log("Form data retrieved:", formData);

      const docResponse = await fetch(`/api/user/test-generate-document/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData.data)
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
    await fetchRecentUserForms();
    
  } catch (error) {
    console.error('Error in share process:', error);
    alert('Error sharing form. Please try again.');
  } finally {
    setIsLoadingForms(false);
  }

};

const handleDuplicate = async (formId) => {
  console.log(`Duplicating form with ID: ${formId}`);
  
  if (!window.confirm('Are you sure you want to duplicate this form? This will create a copy with all existing data.')) {
    return;
  }

  try {
    setIsLoadingForms(true);

    const response = await axios.post(`/api/user/duplicateForm/${formId}`, {}, {
      withCredentials: true
    });

    if (response.data.success) {
      console.log('Form duplicated successfully:', response.data);
      alert(`Form duplicated successfully! New form: "${response.data.new_form_title}"`);
      
      // Refresh the recent forms list
      await fetchRecentUserForms();
    } else {
      console.error('Failed to duplicate form:', response.data.error);
      alert('Failed to duplicate form: ' + response.data.error);
    }
  } catch (error) {
    console.error('Error duplicating form:', error);
    alert('Error duplicating form. Please try again.');
  } finally {
    setIsLoadingForms(false);
  }
}

const handleDelete = async (formId) => {
  console.log(`Deleting form with ID: ${formId}`);
  
  if (!window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await axios.delete(`/api/admin/deleteForm/${formId}`, {
      withCredentials: true
    });

    if (response.data.success) {
      console.log('Form deleted successfully');
      // Refresh the recent forms list
      await fetchRecentUserForms();
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

        await fetchRecentUserForms();
        
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
          Available Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
          <ActionCard
            header="Create New Form"
            subtext="Submit risk assessment for potential hazards"
            onStart={() => navigate("/user/new")}
            icon={<MdNoteAdd className="text-3xl" />}
          />
        </div>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-8">
          Recent Forms
        </h3>

        {/* Results Summary */}
        {forms.length > 0 && (
          <div className="mt-4 mb-4 text-sm text-gray-600">
            Showing {Math.min(9, forms.length)} most recent forms
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
                  formId={form.id}
                  currentUser={userData}
                  date={formatDate(form.last_access_date || form.created_at)}
                  title={form.title || "Untitled Form"}
                  owner={form.owner || "Unknown User"}
                  tags={form.tags || [form.status] || ["Unknown"]}
                  status={form.status}
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