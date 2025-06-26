import React, { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../../components/SearchBar.jsx";
import axios from "axios";
import FormCardA from "../../components/FormCardA.jsx"; // Add this import

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
      setForms(response.data);
      // setFilteredForms(response.data);
    } catch (error) {
      console.error("Error fetching forms:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      // Handle error appropriately - maybe show a toast notification
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
                <FormCardA
                  key={form.id}
                  date={formatDate(form.created_at || form.last_access_date)}
                  title={form.title || "Untitled Form"}
                  owner={userData?.username || "Unknown User"}
                  tags={form.tags || [form.status] || ["Unknown"]}
                  // tags={createTags(form)}
                  onShare={() => handleShare(form.id)}
                  onDownload={() => handleDownload(form.id, form.title)}
                  onDelete={() => handleDelete(form.id)}
                />
              ))}
              </div>

            // <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            //     {/* Style A */}
            //     <FormCardA
            //       date="19/05/2025"
            //       title="Comprehensive Utilization of Z-Ray Machines in Advanced Medical Imaging and Enhanced Safety Protocols for Diagnostic Accuracy and Patient Protection"
            //       owner="Dave Timothy Johnson"
            //       tags={["Ongoing"]}
            //       onShare={() => console.log("Share")}
            //       onDownload={() => console.log("Download")}
            //       onDelete={() => console.log("Delete")}
            //     />
            //     <FormCardA
            //       date="20/05/2025"
            //       title="Comprehensive Radiation Safety Training for Medical Staff"
            //       owner="Alice Smith"
            //       tags={["Completed", "Expires 20/06/2025"]}
            //       onShare={() => console.log("Share")}
            //       onDownload={() => console.log("Download")}
            //       onDelete={() => console.log("Delete")}
            //     />
            //     <FormCardA
            //       date="21/05/2025"
            //       title="Routine and Emergency Maintenance Procedures for Radiation Equipment"
            //       owner="John Doe"
            //       tags={["Pending"]}
            //       onShare={() => console.log("Share")}
            //       onDownload={() => console.log("Download")}
            //       onDelete={() => console.log("Delete")}
            //     />
            //   </div>
          )}
        </div>
      </div>
    </div>
  );
}


      