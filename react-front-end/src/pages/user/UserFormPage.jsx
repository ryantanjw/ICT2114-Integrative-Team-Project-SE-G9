import React, { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import FormCardA from "../../components/FormCardA.jsx"; // Add this import
import FormCardA2 from "../../components/FormCardA2.jsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function UserForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

   // Function to fetch user's forms
  const fetchUserForms = async () => {
    try {
      console.log("Fetching user forms...");
      const response = await axios.get("/api/user/retrieveForms", {
        withCredentials: true
      });
      
      console.log("Forms fetched:", response.data);

      //Used to get the response data of each form
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
      setForms(response.data);
      // setFilteredForms(response.data);
    } catch (error) {
      console.error("Error fetching forms:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      // Handle error appropriately - maybe show a toast notification
    }
  };

// Handle downloading a form
const handleDownload = (formId, formTitle) => {
  console.log(`Downloading form: ${formTitle} (ID: ${formId})`);
  // Add your download logic here
  // For example, generate PDF or export data
  try {
    // Example: Navigate to download endpoint
    window.open(`/api/user/downloadForm/${formId}`, '_blank');
  } catch (error) {
    console.error('Error downloading form:', error);
  }
};

const handleView = async (formId) => {
  console.log(`Redirecting user to form with ID: ${formId}`);

  navigate(`/user/new/${formId}`);
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
        <SearchBar />
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
    </div>
  );
}


      