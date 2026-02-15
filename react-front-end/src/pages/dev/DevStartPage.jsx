import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { MdSave, MdSaveAs } from "react-icons/md";
import StickyBottomNav from "../../components/StickyBottomNav.jsx";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../../components/Header.jsx";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import FormTabs from "../user/components/FormTabs.jsx";
import FormTabsMobile from "../user/components/FormTabsMobile.jsx";
import Form1 from "../user/components/Form1.jsx";
import Form2 from "../user/components/Form2.jsx";
import Form3 from "../user/components/Form3.jsx";
import ConfirmForm from "../user/components/ConfirmForm.jsx"; // will be used for Confirmation Details
import { toast } from "react-hot-toast";
import ScrollFab from "../user/components/ScrollFab.jsx";
import PromptDialog from "../user/components/PromptDialog.jsx";

export default function DevStartPage() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    user_id: 1,
    user_role: 1,
    name: "Dev User",
    email: "dev@example.com"
  });
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
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

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
    // Removed session storage of form ID in demo mode
  }, [formData, currentTab, validateForm1, validateForm2]);



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
      // In demo mode, skip all validation and saving, just switch tab
      setCurrentTab(tabIndex);
    } catch (error) {
      console.error("Error during tab change:", error);
      toast.error("An error occurred while changing tabs. Please try again.");
    }
  }

  // Save handler for current tab
  const handleSaveClick = async () => {
    setIsSaveDialogOpen(true);
  };

  // Temporary save handler for current tab (no validation)
  const handleTempSaveClick = async () => {
    console.log("Temporary Save clicked for tab:", currentTab);

    try {
      let saveSuccess = false;

      if (currentTab === 0 && form3Ref.current) {
        console.log("Calling tempSaveForm on form3Ref");
        saveSuccess = await form3Ref.current.tempSaveForm();
      } else if (currentTab === 1 && form1Ref.current) {
        console.log("Calling tempSaveForm on form1Ref");
        saveSuccess = await form1Ref.current.tempSaveForm();
      } else if (currentTab === 2 && form2Ref.current) {
        console.log("Calling tempSaveForm on form2Ref");
        saveSuccess = await form2Ref.current.tempSaveForm();
      }

      if (saveSuccess) {
        console.log("Temporary save completed successfully");
      } else {
        console.log("Temporary save failed");
      }
    } catch (error) {
      console.error("Error during temporary save:", error);
      toast.error("An error occurred during temporary save");
    }
  };

  //   console.log("Calling form3Ref.current.saveForm()");
  //   if (currentTab === 0 && form3Ref.current) {
  //     await form3Ref.current.saveForm();
  //   } else if (currentTab === 1 && form1Ref.current) {
  //     await form1Ref.current.saveForm();
  //   } else if (currentTab === 2 && form2Ref.current) {
  //     await form2Ref.current.saveForm();
  //   }
  // };

  // Show loading indicator while checking session (never happens in demo mode)

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen 2xl:px-40 px-5 pb-20">
      {userData?.user_role === 0 ? (
        <HeaderAdmin activePage={location.pathname} />
      ) : (
        <Header activePage={location.pathname} />
      )}
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
            <>
              {console.log("form2 division:", formData.division)}
              <Form2
                ref={form2Ref}
                sample={null}
                sessionData={userData}
                updateFormData={updateFormData}
                formData={formData}
              />
            </>
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
      <PromptDialog
        isOpen={isSaveDialogOpen}
        title="Save Changes"
        message="Do you want to save your changes?"
        confirmLabel="Save"
        confirmClassName="bg-green-600 hover:bg-green-700"
        onClose={() => setIsSaveDialogOpen(false)}
        onDelete={async () => {
          try {
            if (currentTab === 0 && form3Ref.current) {
              await form3Ref.current.saveForm();
            } else if (currentTab === 1 && form1Ref.current) {
              await form1Ref.current.saveForm();
            } else if (currentTab === 2 && form2Ref.current) {
              await form2Ref.current.saveForm();
            }
            setIsSaveDialogOpen(false);
            toast.success("Form has been saved successfully!");
          } catch (err) {
            console.error("Error saving form:", err);
            setIsSaveDialogOpen(false);
            toast.error("Failed to save form. Please try again.");
          }
        }}
      />
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
              onClick: handleTempSaveClick,
              icon: MdSave
            },
            // {
            // removed due to confusion
            //   text: "Save",
            //   onClick: handleSaveClick,
            //   icon: MdSave
            // }
          ] : []
        }
        position="bottom"
      />
      <ScrollFab />
    </div>
  );
}