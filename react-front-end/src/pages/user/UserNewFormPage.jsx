import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const form1Ref = useRef(null);
  const form2Ref = useRef(null);
  const form3Ref = useRef(null);

  // State declarations
  const [currentTab, setCurrentTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    division: "",
    processes: [],
    form_id: null // Track form ID
  });
  const [isForm1Valid, setIsForm1Valid] = useState(false);
  const [isForm2Valid, setIsForm2Valid] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Function to update form data (with automatic persistence)
  const updateFormData = useCallback(async (data) => {
    console.log("Updating form data:", data);

    // Preserve the form_id when updating
    const newFormData = {
      ...data,
      form_id: data.form_id || formData.form_id
    };

    setFormData(newFormData);

    // Validate forms based on current tab
    if (currentTab === 0) {
      validateForm1(newFormData);
    } else if (currentTab === 1) {
      validateForm2(newFormData);
    }

    // Store form ID in session if it exists
    if (newFormData.form_id) {
      await storeFormIdInSession(newFormData.form_id);
    }
  }, [formData, currentTab]);

  // Debounced function to store form ID in session
  const storeFormIdInSession = useCallback(async (form_id) => {
    // Prevent excessive calls (no more than once every 2 seconds)
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      return;
    }

    setLastFetchTime(now);

    // MISSING CODE - Actually make the API call:
    try {
      console.log('Storing form ID in session:', form_id);
      const response = await fetch('/api/user/store_form_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ form_id })
      });

      if (response.ok) {
        console.log('Form ID stored in session successfully');
      } else {
        console.error('Failed to store form ID in session');
      }
    } catch (error) {
      console.error('Error storing form ID in session:', error);
    }
  }, [lastFetchTime]);
  // Function to validate Form 1  
  const validateForm1 = useCallback((data) => {
    console.log("Validating Form1 data:", data);

    // Make sure we have processes to check
    if (!data.processes || data.processes.length === 0) {
      console.log("No processes found - form invalid");
      setIsForm1Valid(false);
      return false;
    }

    // Basic validation - check if title and division are filled
    // and at least one process exists with valid activities
    const isValid =
      data.title?.trim() !== "" &&
      data.division?.trim() !== "" &&
      data.processes?.length > 0 &&
      data.processes.every(p => {
        // Make sure header exists
        const headerValid = p.header?.trim() !== "";
        if (!headerValid) console.log(`Process ${p.processNumber || p.id} missing header`);

        // Make sure at least one activity has a description
        const hasValidActivity = p.activities?.length > 0 &&
          p.activities.some(a => a.description?.trim() !== "");
        if (!hasValidActivity) console.log(`Process ${p.processNumber || p.id} has no valid activities`);

        return headerValid && hasValidActivity;
      });

    console.log("Form1 validation result:", isValid);
    setIsForm1Valid(isValid);
    return isValid;
  }, []);
  // Function to validate Form 2
  const validateForm2 = useCallback((data) => {
    // Check if hazards are properly defined
    const isValid = data.processes?.every(process =>
      process.activities?.every(activity =>
        activity.hazards?.some(hazard =>
          hazard.description?.trim() !== "" &&
          hazard.type?.length > 0
        )
      )
    );

    setIsForm2Valid(isValid);
    return isValid;
  }, []);

  // Fetch latest form data from the server
  const refreshFormData = useCallback(async (force = false) => {
    if (!formData.form_id) {
      return;
    }

    // Prevent excessive fetches (no more than once every 3 seconds)
    const now = Date.now();
    if (!force && now - lastFetchTime < 3000) {
      console.log("Skipping refresh - too soon");
      return;
    }

    setLastFetchTime(now);

    try {
      console.log(`Refreshing form data for ID: ${formData.form_id}`);
      setIsLoading(true);

      const response = await axios.get(`/api/user/get_form/${formData.form_id}`);

      if (response.data) {
        const freshData = {
          title: response.data.title || "",
          division: response.data.division || "",
          processes: response.data.processes || [],
          form_id: response.data.form_id
        };

        console.log("Refreshed form data:", freshData);
        setFormData(freshData);

        // Update form validations
        validateForm1(freshData);
        validateForm2(freshData);
      }
    } catch (error) {
      console.error("Error refreshing form data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [formData.form_id, lastFetchTime, validateForm1, validateForm2]);

  // Function to handle tab change with validation and saving  
  const handleTabChange = async (tabIndex) => {
    try {
      console.log(`Attempting to navigate from tab ${currentTab} to tab ${tabIndex}`);

      // Skip if already on the selected tab
      if (currentTab === tabIndex) {
        return;
      }

      // Always save current tab data before switching
      let saveSuccess = true;

      if (currentTab === 0 && form1Ref.current) {
        console.log("Saving Form 1 before tab change...");
        saveSuccess = await form1Ref.current.saveForm();

        if (!saveSuccess) {
          console.error("Failed to save Form 1");
          alert("Failed to save Form 1. Please try again.");
          return;
        }

        // IMPORTANT: After successful save, store the form ID in session
        const formData = form1Ref.current.getData();
        if (formData.form_id) {
          console.log("Form 1 saved with ID:", formData.form_id);
          await storeFormIdInSession(formData.form_id);

          // Also update the parent's formData state
          updateFormData(formData);
        } else {
          console.error("Form saved but no form_id returned!");
          alert("Error: Form saved but no ID was generated. Please try again.");
          return;
        }

        // Force refresh data after saving to ensure we have latest data
        await refreshFormData(true);
      }
      else if (currentTab === 1 && form2Ref.current) {
        // Similar logic for Form2...
      }

      // Now validate before proceeding to next tab
      if (tabIndex > currentTab) {
        if (currentTab === 0) {
          const validation = form1Ref.current.validateForm();
          if (!validation.valid) {
            alert(validation.message || "Please complete Form 1 before proceeding.");
            return;
          }
        }
      }

      // Change the tab
      console.log(`Successfully navigating from tab ${currentTab} to tab ${tabIndex}`);
      setCurrentTab(tabIndex);

    } catch (error) {
      console.error("Error during tab change:", error);
      alert("An error occurred while changing tabs. Please try again.");
    }
  };

  // Check user session on initial load
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

            if (formResponse.data) {
              // Update the form data
              const loadedFormData = {
                title: formResponse.data.title || "",
                division: formResponse.data.division || "",
                processes: formResponse.data.processes || [],
                form_id: formResponse.data.form_id
              };

              console.log("Loading existing form data:", loadedFormData);
              setFormData(loadedFormData);

              // Validate forms with the loaded data
              validateForm1(loadedFormData);
              validateForm2(loadedFormData);
            }
          }
          catch (formError) {
            console.error("Error loading form data:", formError);
          }
        }

      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        navigate("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const checkSessionData = async () => {
      try {
        console.log("Checking session data...");
        const response = await fetch('/api/user/session');

        if (response.ok) {
          const data = await response.json();
          console.log("Session data:", data);

          // If we have a form_id in session but not in our state, update state
          if (data.current_form_id && (!formData || data.current_form_id !== formData.form_id)) {
            console.log("Found form_id in session, refreshing data:", data.current_form_id);
            await refreshFormData(true, data.current_form_id);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    checkSessionData();
  }, [navigate, validateForm1, validateForm2]);

  // Refresh form data when tab changes
  useEffect(() => {
    if (!isLoading && formData.form_id) {
      refreshFormData();
    }
  }, [currentTab, isLoading, formData.form_id, refreshFormData]);

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
            isForm2Valid={isForm2Valid}
          />
        </div>
        <div className="mt-6">
          {currentTab === 0 && (
            <Form1
              ref={form1Ref}
              sample={null}
              sessionData={userData}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {currentTab === 1 && (
            <Form2
              ref={form2Ref}
              sample={null}
              sessionData={userData}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {currentTab === 2 && (
            <Form3
              ref={form3Ref}
              formData={formData}
              sessionData={userData}
              updateFormData={updateFormData}
            />
          )}
        </div>
      </div>
    </div>
  );
}