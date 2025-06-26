import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import FormTabs from "./components/FormTabs.jsx";
import Form1 from "./components/Form1.jsx";
import Form2 from "./components/Form2.jsx";
import Form3 from "./components/Form3.jsx";
import axios from "axios";


export default function UserNewForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const form2Ref = useRef(null);
  const form1Ref = useRef(null);

  // State declarations
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    division: "",
    processes: [],
    form_id: null // Added to track form ID
  });
  const [isForm1Valid, setIsForm1Valid] = useState(false);

  // Shared sampleEntry for both forms
  const emptyEntry = {
    title: "",
    division: "",
    processes: []
  }



  // Function to handle tab change with validation and saving
  const handleTabChange = async (tabIndex) => {
    try {
      // Always save current tab data before switching
      if (currentTab === 0 && form1Ref.current) {
        const saveSuccess = await form1Ref.current.saveForm();
        if (!saveSuccess && tabIndex > currentTab) {
          alert("Failed to save Form 1. Please try again.");
          return;
        }
      } else if (currentTab === 1 && form2Ref.current) {
        const saveSuccess = await form2Ref.current.saveForm();
        if (!saveSuccess && tabIndex > currentTab) {
          alert("Failed to save Form 2. Please try again.");
          return;
        }
      }

      // Validate when moving forward
      if (tabIndex > currentTab) {
        if (currentTab === 0 && !isForm1Valid) {
          alert("Please complete Form 1 before proceeding.");
          return;
        }
      }

      // Force refresh data before changing tabs
      if (formData.form_id) {
        await refreshFormData();
        console.log("Refreshed form data before tab change:", formData);
      }

      // Change the tab
      console.log(`Navigating from tab ${currentTab} to tab ${tabIndex}`);
      setCurrentTab(tabIndex);
    } catch (error) {
      console.error("Error during tab change:", error);
      alert("An error occurred while changing tabs.");
    }
  };
  // Function to update form data from Form1
  const updateFormData = (data) => {
    // Preserve the form_id when updating
    setFormData({
      ...data,
      form_id: formData.form_id || data.form_id
    });
    // Check if Form 1 has required fields filled
    validateForm1(data);
  };
  // Function to validate Form 1
  const validateForm1 = (data) => {
    // Basic validation - check if title and division are filled
    // and at least one process exists
    const isValid =
      data.title.trim() !== "" &&
      data.division.trim() !== "" &&
      data.processes.length > 0;

    setIsForm1Valid(isValid);
  };

  // Add this new function
  const refreshFormData = async () => {
    if (formData.form_id) {
      try {
        const response = await axios.get(`/api/user/get_form/${formData.form_id}`);
        if (response.data) {
          setFormData({
            title: response.data.title || "",
            division: response.data.division || "",
            processes: response.data.processes || [],
            form_id: response.data.form_id
          });
          // Also update form1 validation status
          validateForm1({
            title: response.data.title || "",
            division: response.data.division || "",
            processes: response.data.processes || []
          });
        }
      } catch (error) {
        console.error("Error refreshing form data:", error);
      }
    }
  };

  // Add effect to refresh data when tab changes
  useEffect(() => {
    if (!isLoading) {
      refreshFormData();
    }
  }, [currentTab, isLoading]);

  // Add this to the useEffect where you check session:

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

        // Check if there's an ongoing form in the session
        if (response.data.current_form_id) {
          console.log("Found ongoing form with ID:", response.data.current_form_id);
          // Fetch the form data to continue
          try {
            const formResponse = await axios.get(`/api/user/get_form/${response.data.current_form_id}`);
            // In your checkSession function, after loading the form data:
            if (formResponse.data) {
              // Update the form data
              const loadedFormData = formResponse.data;
              const updatedFormData = {
                title: loadedFormData.title || "",
                division: loadedFormData.division || "",
                processes: loadedFormData.processes || [],
                form_id: loadedFormData.form_id
              };

              console.log("Loading existing form data:", updatedFormData);
              setFormData(updatedFormData);

              // Validate Form1 with the loaded data
              validateForm1(updatedFormData);
            }
          }
          catch (formError) {
            console.error("Error loading form data:", formError);
          }
        }

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
          RA Form Submission
        </h3>
        <div className="mt-5">
          <FormTabs
            onTabChange={handleTabChange}
            currentTab={currentTab}
            isForm1Valid={isForm1Valid}
          />
        </div>
        <div className="mt-6">
          {currentTab === 0 && (
            <Form1
              ref={form1Ref}
              sample={formData}
              sessionData={userData}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {currentTab === 1 && (
            <Form2
              ref={form2Ref}
              sample={formData}
              sessionData={userData}
              formData={formData}  // Ensure formData is passed explicitly
            />
          )}
          {currentTab === 2 && (
            <Form3
              formData={formData}
              sessionData={userData}
            />
          )}
        </div>
      </div>
    </div>
  );
}