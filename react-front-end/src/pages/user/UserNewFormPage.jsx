import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { MdSave } from "react-icons/md";
import StickyBottomNav from "../../components/StickyBottomNav.jsx";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import FormTabs from "./components/FormTabs.jsx";
import FormTabsMobile from "./components/FormTabsMobile.jsx";
import Form1 from "./components/Form1.jsx";
import Form2 from "./components/Form2.jsx";
import Form3 from "./components/Form3.jsx";
import ConfirmForm from "./components/ConfirmForm.jsx"; // will be used for Confirmation Details
import axios from "axios";
import { toast } from "react-hot-toast";

export default function UserNewForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { formId } = useParams();
  const form1Ref = useRef(null);
  const form2Ref = useRef(null);
  const form3Ref = useRef(null);
  const sessionCheckTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);

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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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


  const fetchDivisionName = async (divisionId) => {
  try {
    const response = await axios.get(`/api/divisions/${divisionId}`);
    return response.data.name || `Division ${divisionId}`;
  } catch (error) {
    console.error("Error fetching division name:", error);
    return `Division ${divisionId}`;
  }
  };

  const loadExistingForm = useCallback(async (targetFormId) => {
    if (!targetFormId) return false;

    try {
      console.log(`Loading existing form with ID: ${targetFormId}`);
      setIsLoading(true);

      const response = await axios.get(`/api/user/get_form/${targetFormId}`);

      console.log("response data:", response.data);

      console.log("remarks:", response.data.activity_remarks || response.data.remarks);

      if (response.data) {

        let divisionName = response.data.division_name;
        let divisionId = response.data.division_id; 

        if (typeof response.data.division === 'number') {
          divisionName = await fetchDivisionName(response.data.division);
          divisionId = response.data.division_id;
        }

        const loadedFormData = {
          title: response.data.title || "",
          division: response.data.division || "",
          // division: divisionName, --> use this if i want to show the name
          divisionId: divisionId,
          processes: response.data.processes || [],
          form_id: response.data.form_id,
          remarks: response.data.activity_remarks || response.data.remarks || "",
        };

        console.log("Successfully loaded existing form data:", loadedFormData);
        setFormData(loadedFormData);
        setIsEditMode(true);

        // Validate the loaded form
        validateForm1(loadedFormData);
        validateForm2(loadedFormData);

        // Store form ID in session
        await storeFormIdInSession(loadedFormData.form_id);

        return true;
      } else {
        console.error("No form data received from server");
        return false;
      }
    } catch (error) {
      console.error("Error loading existing form:", error);

      // If form not found or access denied, show appropriate message
      if (error.response?.status === 404) {
        alert("Form not found. It may have been deleted or you don't have access to it.");
        navigate("/user/dashboard");
      } else if (error.response?.status === 403) {
        alert("You don't have permission to access this form.");
        navigate("/user/dashboard");
      } else {
        alert("Error loading form. Please try again.");
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateForm1, validateForm2, navigate]);


  // Debounced function to store form ID in session
  const storeFormIdInSession = useCallback(async (form_id) => {
    // Skip if no form ID
    if (!form_id) return;

    // Skip if the form ID is already stored in state and hasn't changed
    if (formData.form_id === form_id) {
      console.log('Form ID already stored, skipping update');
      return;
    }

    // Prevent excessive calls (no more than once every 5 seconds)
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      console.log('Skipping form ID update - too soon');
      return;
    }

    setLastFetchTime(now);

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
        // Save to localStorage as a fallback
        localStorage.setItem('current_form_id', form_id.toString());
      } else {
        console.error('Failed to store form ID in session - trying local fallback');
        // If the API fails, store in localStorage as fallback
        localStorage.setItem('current_form_id', form_id.toString());
      }
    } catch (error) {
      console.error('Error storing form ID in session:', error);
      // Store in localStorage as fallback
      localStorage.setItem('current_form_id', form_id.toString());
    }
  }, [formData.form_id, lastFetchTime]);

  // Function to update form data (with automatic persistence)
  const updateFormData = useCallback(async (data, forceSave = false) => {
    // Skip update if data is the same and not forced
    if (!forceSave && JSON.stringify(data) === JSON.stringify(formData)) {
      console.log("Form data unchanged, skipping update");
      return;
    }

    console.log("Updating form data:", data);

    // Preserve the form_id when updating
    const newFormData = {
      ...data,
      form_id: data.form_id || formData.form_id
    };

    setFormData(newFormData);

    // Only validate if we're not forcing a save (to reduce unnecessary processing)
    if (!forceSave) {
      // Validate forms based on current tab
      if (currentTab === 1) {
        validateForm1(newFormData);
      } else if (currentTab === 2) {
        validateForm2(newFormData);
      }
    }

    // Only store form ID in session when it changes or when forced
    if ((newFormData.form_id && newFormData.form_id !== formData.form_id) || forceSave) {
      await storeFormIdInSession(newFormData.form_id);
    }
  }, [formData, currentTab, validateForm1, validateForm2, storeFormIdInSession]);

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

        let divisionName = response.data.division_name;
        let divisionId = response.data.division_id; 

        if (typeof response.data.division === 'number') {
          divisionName = await fetchDivisionName(response.data.division);
          divisionId = response.data.division_id;
        }

        const freshData = {
          title: response.data.title || "",
          division: divisionName,
          divisionId: divisionId,
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

  // Clear form ID on page reload (but not tab changes)
  useEffect(() => {
    const clearFormIdOnReload = async () => {
      // Only clear on initial page load
      if (!initialLoadRef.current) return;

      initialLoadRef.current = false;

      // Only clear form_id if we're NOT in edit mode and there's no formId in the URL
      // This prevents clearing the session when navigating between Form3 and Form1
      if (!formId && !isEditMode) {
        try {
          console.log('Clearing form ID from session on page load');

          // Clear from session using API
          await fetch('/api/user/clear_form_id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          console.log('Form ID cleared from session on page load');
        } catch (error) {
          console.error('Error clearing form ID from session:', error);
        }
      } else {
        console.log('Keeping form_id in session - either formId exists or in edit mode');
      }
    };

    clearFormIdOnReload();

    // Set up beforeunload handler to clear form ID when navigating away from page
    const handleBeforeUnload = () => {

      if (!isEditMode) {
        // Use synchronous localStorage for unload event
        localStorage.removeItem('current_form_id');

        // For modern browsers, we can try to make a synchronous request
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/user/clear_form_id', false); // false = synchronous
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send();
        } catch (e) {
          console.error('Error sending synchronous XHR:', e);
        }
      }
    };

    // Add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formId, isEditMode]);

  // Update the handleTabChange function to be more robust
  const handleTabChange = async (tabIndex) => {
    try {
      console.log(`Attempting to navigate from tab ${currentTab} to tab ${tabIndex}`);

      // Skip if already on the selected tab
      if (currentTab === tabIndex) {
        return;
      }

      // Going backward - don't save to DB, just update state
      if (tabIndex < currentTab) {
        console.log("Going backward, preserving form data without saving to DB");

        let stateUpdateSuccess = true;

        // For Form3 (tab 0), use the goBack method
        if (currentTab === 0 && form3Ref.current && form3Ref.current.goBack) {
          stateUpdateSuccess = form3Ref.current.goBack();
        }
        // For Form1 (tab 1), use the goBack method
        else if (currentTab === 1 && form1Ref.current && form1Ref.current.goBack) {
          stateUpdateSuccess = form1Ref.current.goBack();
        }
        // For Form2 (tab 2), use the goBack method
        else if (currentTab === 2 && form2Ref.current && form2Ref.current.goBack) {
          stateUpdateSuccess = form2Ref.current.goBack();
        }

        if (!stateUpdateSuccess) {
          console.error("Failed to update state when going back");
          return;
        }

        // Change the tab without validation or saving
        setCurrentTab(tabIndex);
        return;
      }

      // Going forward - save current tab data before switching
      let saveSuccess = true;

      // Save data based on current tab
      if (currentTab === 0 && form3Ref.current) {
        // Save Form 3 data (Overall Details)
        if (form3Ref.current.validate && !form3Ref.current.validate()) {
          toast.error("Please complete the Overall Details before proceeding.");
          return;
        }

        console.log("Saving Form 3 before tab change...");
        if (form3Ref.current.saveForm) {
          const savedData = await form3Ref.current.saveForm();
          if (!savedData) {
            console.error("Failed to save Form 3");
            toast.error("Failed to save Overall Details. Please try again.");
            return;
          }
          
          // Update the parent's formData state with the saved data
          updateFormData(savedData);
          
          // Store form ID in session if we have one
          if (savedData.form_id) {
            await storeFormIdInSession(savedData.form_id);
          }
        }
      }
      else if (currentTab === 1 && form1Ref.current) {
        // Validate before attempting to save
        const validation = form1Ref.current.validateForm();
        if (!validation.valid) {
          toast.error(validation.message || "Please complete Form 1 before proceeding.");
          return;
        }

        console.log("Saving Form 1 before tab change...");
        saveSuccess = await form1Ref.current.saveForm();

        if (!saveSuccess) {
          console.error("Failed to save Form 1");
          toast.error("Failed to save Form 1. Please try again.");
          return;
        }

        // Get the form data after saving
        const formData = form1Ref.current.getData();
        if (formData.form_id) {
          console.log("Form 1 saved with ID:", formData.form_id);

          // Store form ID in session
          await storeFormIdInSession(formData.form_id);

          // Update the parent's formData state
          updateFormData(formData);
        } else {
          console.error("Form saved but no form_id returned!");
          toast.error("Error: Form saved but no ID was generated. Please try again.");
          return;
        }
      }
      else if (currentTab === 2 && form2Ref.current) {
        const validation = form2Ref.current.validateForm();
        if (!validation.valid) {
          toast.error(validation.message || "Please complete Form 2 before proceeding.");
          return;
        }

        console.log("Saving Form 2 before tab change...");
        saveSuccess = await form2Ref.current.saveForm();

        if (!saveSuccess) {
          console.error("Failed to save Form 2");
          toast.error("Failed to save Form 2. Please try again.");
          return;
        }

        // Get the form data after saving
        const formData = form2Ref.current.getData();
        updateFormData(formData);
      }

      // Change the tab
      console.log(`Successfully navigating from tab ${currentTab} to tab ${tabIndex}`);
      setCurrentTab(tabIndex);

      // Refresh data after a tab change if we have a form ID
      if (formData.form_id) {
        refreshFormData(true);
      }
    } catch (error) {
      console.error("Error during tab change:", error);
      toast.error("An error occurred while changing tabs. Please try again.");
    }
  }

  // Save handler for current tab
  const handleSaveClick = async () => {
    console.log("Calling form3Ref.current.saveForm()");
    if (currentTab === 0 && form3Ref.current) {
      await form3Ref.current.saveForm();
    } else if (currentTab === 1 && form1Ref.current) {
      await form1Ref.current.saveForm();
    } else if (currentTab === 2 && form2Ref.current) {
      await form2Ref.current.saveForm();
    }
  };
  // Check user session on initial load and when formId changes
  useEffect(() => {
    const checkSession = async () => {
      // Skip if we've already checked the session in this component instance
      if (sessionChecked) {
        console.log("Session already checked, skipping...");
        return;
      }

      try {
        console.log("Checking user session...");
        setIsLoading(true);

        // Add cache-busting parameter to prevent browser caching
        const response = await axios.get("/api/check_session?_=" + new Date().getTime(), {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        console.log("Session check complete");

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

        // // Check for form ID in localStorage first (preserved during tab navigation)
        // const localFormId = localStorage.getItem('current_form_id');

        // // If not in localStorage, check session
        // const formIdToUse = localFormId || response.data.current_form_id;

        //may change 497 to if formId
        if (formId) {
          console.log("Found form ID to continue with:", formId);
          const loadSuccess = await loadExistingForm(formId);

          if (!loadSuccess) {
            console.error("Failed to load form");
            return;
          }
        } else {
          // Check for form ID in localStorage or session (for new forms)
          const localFormId = localStorage.getItem('current_form_id');
          const formIdToUse = localFormId || response.data.current_form_id;

          if (formIdToUse) {
            console.log("Found form ID to continue with:", formIdToUse);
            // Fetch the form data to continue
            try {
              const formResponse = await axios.get(`/api/user/get_form/${formIdToUse}`);

              if (formResponse.data) {

                // let divisionName = response.data.division;
                // if (typeof response.data.division === 'number') {
                //   divisionName = await fetchDivisionName(response.data.division);
                //   divisionId = response.data.division;
                // }
                // // Update the form data
                // const loadedFormData = {
                //   title: formResponse.data.title || "",
                //   division: divisionName,
                //   divisionId: divisionId,
                //   processes: formResponse.data.processes || [],
                //   form_id: formResponse.data.form_id
                // };

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
        }

        // Mark session as checked - will prevent additional checks
        setSessionChecked(true);

      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        navigate("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    // Only run the session check if we haven't already checked
    if (!sessionChecked) {
      checkSession();
    }

    // Clean up any timeouts on unmount
    return () => {
      if (sessionCheckTimeoutRef.current) {
        clearTimeout(sessionCheckTimeoutRef.current);
      }
    };
  }, [navigate, validateForm1, validateForm2, sessionChecked, formData.form_id, storeFormIdInSession]);

  // Only check session data once on initial load
  useEffect(() => {
    const checkSessionDataOnce = async () => {
      // Skip if we've already fetched session data in this component instance
      if (sessionChecked) return;

      try {
        console.log("Checking session data once...");

        // Use sessionStorage to check if we've done this within the last minute
        const lastSessionDataCheck = sessionStorage.getItem('lastSessionDataCheck');
        const now = Date.now();

        if (lastSessionDataCheck && now - parseInt(lastSessionDataCheck) < 60000) {
          console.log("Skipping session data check - checked recently");
          return;
        }

        const response = await fetch('/api/user/session');

        if (response.ok) {
          const data = await response.json();

          // If we have a form_id in session but not in our state, update state
          if (data.current_form_id && (!formData.form_id || data.current_form_id !== formData.form_id)) {
            console.log("Found form_id in session, refreshing data:", data.current_form_id);
            const newFormData = { ...formData, form_id: data.current_form_id };
            setFormData(newFormData);
            await refreshFormData(true);
          }

          // Mark that we've checked
          sessionStorage.setItem('lastSessionDataCheck', now.toString());
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    // Only run once on component mount
    checkSessionDataOnce();
  }, [sessionChecked, formData, refreshFormData]);

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
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen 2xl:px-40 px-5">
      <Header activePage={location.pathname} />
      <div className="flex flex-col justify-start pb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          RA Form Submission
        </h3>
        <div className="mt-5">
          <div className="block lg:hidden">
            <FormTabsMobile
              currentTab={currentTab}
              onTabChange={handleTabChange}
            />
          </div>
          <div className="hidden lg:block">
            <FormTabs
              onTabChange={handleTabChange}
              currentTab={currentTab}
              isForm1Valid={isForm1Valid}
              isForm2Valid={isForm2Valid}
            />
          </div>
        </div>
        <div className="mt-6">
          {currentTab === 0 && (
            <>
                {console.log("Passing formData to Form3:", formData)}
            <Form3
              ref={form3Ref}
              formData={formData}
              sessionData={userData}
              updateFormData={updateFormData}
            />
            </>
          )}
          {currentTab === 1 && (
            <Form1
              ref={form1Ref}
              sample={null}
              sessionData={userData}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {currentTab === 2 && (
            <Form2
              ref={form2Ref}
              sample={null}
              sessionData={userData}
              updateFormData={updateFormData}
              formData={formData}
            />
          )}
          {currentTab === 3 && (
            <ConfirmForm
              formData={formData}
              sessionData={userData}
              updateFormData={updateFormData}
            />
          )}
        </div>
      </div>
      {/* Floating Bottom Nav */}
      <StickyBottomNav
        buttonsLeft={[
          {
            text: "Back",
            onClick: () => handleTabChange(currentTab - 1),
            disabled: currentTab === 0,
            icon: IoArrowBack
          },
          {
            text: "Next",
            onClick: () => handleTabChange(currentTab + 1),
            disabled: currentTab === 3,
            icon: IoArrowForward
          }
        ]}
        buttonsRight={
          currentTab !== 3 ? [  
            {
              text: "Save",
              onClick: handleSaveClick,
              icon: MdSave
            }
          ] : []  
        }
        position="bottom"
      />
    </div>
  );
}