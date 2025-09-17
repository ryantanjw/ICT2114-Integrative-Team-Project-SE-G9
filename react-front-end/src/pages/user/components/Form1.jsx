import { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from "react";
import SummaryDialog from "./SummaryDialog.jsx";
import WarningDialog from "./WarningDialog.jsx";
import { IoWarning } from "react-icons/io5";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdDelete, MdExpandMore, MdExpandLess, MdAdd } from "react-icons/md";
import { toast } from "react-hot-toast";

import ProcessFab from "./ProcessFab.jsx";
import { LuMinus } from "react-icons/lu";


// Convert to forwardRef to expose methods to parent
const Form1 = forwardRef(({ sample, sessionData, updateFormData, formData, onNavigate }, ref) => {
  // Use formData if provided (from parent state), otherwise use sample or default
  const [processes, setProcesses] = useState([
    {
      id: 1,
      processNumber: 1,
      location: "",
      activities: [
        { id: 1, description: "", remarks: "" }
      ],
      header: "",
      headerColor: "#EEF1F4",
    }
  ]
  );

  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryList, setSummaryList] = useState([]);
  // Collapsed process state
  const [collapsedProcessIds, setCollapsedProcessIds] = useState([]);
  // Toggle collapse for a process
  const toggleCollapse = (id) => {
    setCollapsedProcessIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };
  // Initialize with formData if available
  const [formId, setFormId] = useState(formData?.form_id || null);
  const [title, setTitle] = useState(formData?.title || sample?.title || "");
  const [division, setDivision] = useState(
    formData?.division ? String(formData.division) :
      sample?.division ? String(sample.division) : ""
  );
  const [divisions, setDivisions] = useState([]); // State for division options
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  const formIdRef = useRef(formData?.form_id || null);
  const lastFetchTime = useRef(0);
  const [deletedProcessIds, setDeletedProcessIds] = useState([]); //Use this state to track deleted processes
  const [deletedActivityIds, setDeletedActivityIds] = useState([]); //Use this state to track deleted activities

  // Warning dialogs for process and activity removal
  const [processWarningOpen, setProcessWarningOpen] = useState(false);
  const [processToRemoveId, setProcessToRemoveId] = useState(null);

  const [activityWarningOpen, setActivityWarningOpen] = useState(false);
  const [activityToRemove, setActivityToRemove] = useState({ procId: null, actId: null });

  // Fetch divisions from API
  const fetchDivisions = useCallback(async () => {
    if (divisionsLoading) return; // Prevent multiple concurrent requests

    setDivisionsLoading(true);
    try {
      const response = await fetch('/api/user/retrieveDivisions');
      if (response.ok) {
        const data = await response.json();
        console.log('Divisions fetched:', data);

        // Transform the data to match the expected format for dropdown options
        // API returns: [{ division_id: 1, division_name: "Division Name" }, ...]
        const divisionOptions = data.map(div => ({
          value: String(div.division_id), // Ensure string type
          label: div.division_name // Use division_name as display text
        }));

        setDivisions(divisionOptions);
      } else {
        console.error('Failed to fetch divisions');
        // Fallback to default options if API fails
        setDivisions([
          { value: "division1", label: "Division 1" },
          { value: "division2", label: "Division 2" },
          { value: "division3", label: "Division 3" },
        ]);
      }
    } catch (error) {
      console.error('Error fetching divisions:', error);
      // Fallback to default options if API fails
      setDivisions([
        { value: "division1", label: "Division 1" },
        { value: "division2", label: "Division 2" },
        { value: "division3", label: "Division 3" },
      ]);
    } finally {
      setDivisionsLoading(false);
    }
  }, [divisionsLoading]);

  // Fetch divisions on component mount
  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
    if (divisions.length > 0 && division && isNaN(division)) {
      // division holds a name, find matching ID
      const matchedDivision = divisions.find(d => d.label === division);
      if (matchedDivision) {
        setDivision(matchedDivision.value); // Set division state to ID string
      }
    }
  }, [divisions, division]);

  // Helper function to update both state and ref
  const updateFormId = (id) => {
    console.log('Updating formId to:', id);
    setFormId(id);
    formIdRef.current = id; // This is immediately available
  };

  // Debounced store form ID in session to prevent excessive calls
  const storeFormIdInSession = useCallback(async (form_id) => {
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      console.log('Skipping session update - too soon');
      return;
    }

    try {
      lastFetchTime.current = now;
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
  }, []);

  // Force refetch when component becomes visible again
  useEffect(() => {
    // This function checks if the component is becoming visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible again, check if we need to refetch
        if (sessionData?.current_form_id) {
          console.log('Tab visible again, checking session data');
          setDataLoaded(false); // Force refetch
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Reset dataLoaded when this component mounts, forcing a data fetch
    setDataLoaded(false);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty deps array - only run on mount and unmount

  // Then, modify your main data fetching useEffect:
  useEffect(() => {
    const fetchFormData = async () => {
      // If already loading, skip
      if (isLoading) return;

      // Reset loading state
      setIsLoading(true);

      try {
        // Check multiple sources for form ID in this priority:
        // 1. Passed directly in formData prop
        // 2. URL parameter
        // 3. Session data

        // First check formData prop
        if (formData && formData.form_id) {
          console.log('Using form data from props:', formData);
          setTitle(formData.title || "");
          setDivision(formData.division || "");
          if (formData.processes && formData.processes.length > 0) {
            setProcesses(formData.processes);
          }
          updateFormId(formData.form_id);
          setDataLoaded(true);
          setIsLoading(false);
          return;
        }

        // Then check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('form_id');

        // Then check session data
        if (!id && sessionData?.current_form_id) {
          id = sessionData.current_form_id;
          console.log('Using form_id from session:', id);
        }

        // If still no ID, try to fetch from session directly
        if (!id) {
          console.log('No form ID found, trying to fetch from session...');
          // Try the session-based endpoint first
          const sessionResponse = await fetch('/api/user/get_form');
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            console.log('Form data loaded from session:', sessionData);

            // Update form state with session data
            setTitle(sessionData.title || "");
            setDivision(sessionData.division || "");

            // Ensure all processes have valid IDs
            const processesWithIds = sessionData.processes.map(proc => ({
              ...proc,
              id: proc.id || proc.process_id,
              process_id: proc.process_id || proc.id,
              activities: proc.activities.map(act => ({
                ...act,
                id: act.id || act.activity_id,
                activity_id: act.activity_id || act.id,
                source: act.source || (act.activity_id ? "DB matched" : undefined),
              }))
            }));

            setProcesses(processesWithIds || []);
            updateFormId(sessionData.form_id);

            // Also store in session
            await storeFormIdInSession(sessionData.form_id);
            setIsLoading(false);
            setDataLoaded(true);
            return;
          } else {
            console.log('No form found in session, showing empty form');
            setDataLoaded(true);
            setIsLoading(false);
            return;
          }
        }

        console.log(`Fetching form data for ID: ${id}`);

        // Try to get form data from session first, then by ID
        let response;
        if (id) {
          response = await fetch(`/api/user/get_form/${id}`);
        } else {
          // Try to get from session if no ID provided
          response = await fetch('/api/user/get_form');
        }

        if (response.ok) {
          const data = await response.json();
          console.log('Form data loaded:', data);

          // Update form state
          setTitle(data.title || "");
          setDivision(data.division || "");

          // Ensure all processes have valid IDs
          // Only update processes if they exist and have data
          if (data.processes && data.processes.length > 0) {
            // Ensure all processes have valid IDs
            const processesWithIds = data.processes.map(proc => ({
              ...proc,
              id: proc.id || proc.process_id,
              process_id: proc.process_id || proc.id,
              activities: proc.activities.map(act => ({
                ...act,
                id: act.id || act.activity_id,
                activity_id: act.activity_id || act.id,
                source: act.source || (act.activity_id ? "DB matched" : undefined),
              }))
            }));
            setProcesses(processesWithIds);
          }

          updateFormId(data.form_id);

          // Also store in session
          await storeFormIdInSession(data.form_id);
        } else {
          console.error('Failed to fetch form data');
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };

    // Only fetch if data not loaded yet
    if (!dataLoaded) {
      fetchFormData();
    }
  }, [sessionData, formData, dataLoaded, isLoading, storeFormIdInSession]);

  // Add a special effect to detect changes in form_id in session
  useEffect(() => {
    if (sessionData?.current_form_id &&
      sessionData.current_form_id !== formId &&
      sessionData.current_form_id !== formIdRef.current) {
      console.log('Form ID in session changed, resetting data loaded state');
      setDataLoaded(false);
    }
  }, [sessionData, formId]);
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveForm: handleSave,
    validateForm: () => {
      // Validate required fields
      if (!title.trim()) return { valid: false, message: 'Title is required' };

      // Check if any process has no title
      const invalidProcess = processes.find(p => !p.header?.trim());
      if (invalidProcess) return {
        valid: false,
        message: `Process ${invalidProcess.processNumber} has no title`
      };

      // Check if any activity has no description
      for (const proc of processes) {
        const invalidActivity = proc.activities.find(a => !a.description?.trim());
        if (invalidActivity) return {
          valid: false,
          message: `Process ${proc.processNumber} has an activity with no description`
        };
      }

      return { valid: true };
    },
    getData: () => ({
      title,
      division,
      processes,
      form_id: formId
    }),
    goBack: () => {
      // When going back from Form1, don't save or show alerts
      console.log('Going back from Form1 - no save needed');
      return true;
    }
  }));

  // Tag AI generate work activities
  const generateWorkActivities = async () => {
    toast.loading("Generating work activities...", { id: "generate-activities" });

    const aiOrNotList = [];

    try {
      const updatedProcesses = await Promise.all(
        processes.map(async (proc, i) => {
          const processName = proc.header || `(Process ${i + 1})`;
          try {
            const response = await fetch('/api/user/get_activities', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ title, processName }),
            });

            if (!response.ok) {
              console.error(`Failed to fetch activities for ${processName}`);
              return proc;
            }

            const data = await response.json();
            const activityNames = Array.isArray(data.activities) ? data.activities : [];
            // For each activity, push an entry with processName, activityName, aiOrNot
            activityNames.forEach(name => {
              aiOrNotList.push({
                processName,
                activityName: name,
                aiOrNot: data.text
              });
            });

            const newActivities = activityNames.map((name, idx) => ({
              id: Date.now() + idx,
              description: name,
              remarks: "",
              source: "AI generated"
            }));

            // return {
            //   ...proc,
            //   activities: [...newActivities, ...proc.activities],
            // };
            return {
              ...proc,
              activities: [...newActivities, ...proc.activities].filter(
                act => act.description && act.description.trim() !== ""
              ),
            };

          } catch (err) {
            console.error(`Error fetching activities for ${processName}:`, err);
            return proc;
          }
        })
      );

      // Attach aiOrNot string to each process (legacy, not used in summaryList now)
      const updatedWithAI = updatedProcesses.map((proc, idx) => ({
        ...proc,
        aiOrNot: aiOrNotList[idx]?.aiOrNot || "No AI summary available."
      }));

      // Group summary by process, and display each activity with its AI explanation
      const summaryByProcess = processes.map((proc) => {
        const matching = aiOrNotList.filter(item => item.processName === proc.header || item.processName === `(Process ${proc.processNumber})`);
        return {
          name: `Process ${proc.processNumber} - ${proc.header || "Untitled"}`,
          aiOrNot: matching.length > 0
            ? matching.map(m => `Activity: ${m.activityName} — ${m.aiOrNot}`).join("\n")
            : "No AI summary available."
        };
      });

      setProcesses(updatedWithAI);
      setSummaryList(summaryByProcess);
      setShowSummaryDialog(true);
      toast.success(
        "Work activities generated successfully!",
        { id: "generate-activities" }
      );
    } catch (error) {
      console.error("Global error in generateWorkActivities:", error);
      toast.error("Failed to generate work activities. Please try again.", { id: "generate-activities" });
    }
  };




  const addProcess = () => {
    setProcesses([
      ...processes,
      {
        id: Date.now(), // Use timestamp for unique ID
        processNumber: processes.length + 1,
        location: "",
        activities: [{ id: Date.now() + 1, description: "", remarks: "" }],
        header: ``,
        headerColor: "#EEF1F4",
      }
    ]);
  };

  const removeProcess = (id) => {
    const processToRemove = processes.find(p => p.id === id);

    // If the process has a database ID (process_id), track it for deletion
    if (processToRemove && processToRemove.process_id) {
      setDeletedProcessIds(prev => [...prev, processToRemove.process_id]);

      // Also track all activities in this process for deletion
      if (processToRemove.activities) {
        const activityIdsToDelete = processToRemove.activities
          .filter(activity => activity.activity_id)
          .map(activity => activity.activity_id);

        if (activityIdsToDelete.length > 0) {
          setDeletedActivityIds(prev => [...prev, ...activityIdsToDelete]);
        }
      }
    }

    setProcesses(processes.filter(p => p.id !== id));
  };

  const addActivity = (procId) => {
    setProcesses(processes.map(p => {
      if (p.id !== procId) return p;
      return {
        ...p,
        activities: [
          ...p.activities,
          {
            id: Date.now(), // Use timestamp for unique ID
            description: "",
            remarks: ""
          }
        ]
      };
    }));
  };

  const removeActivity = (procId, actId) => {
    setProcesses(processes.map(p => {
      if (p.id !== procId) return p;
      // Prevent removing last activity
      if (p.activities.length <= 1) return p;

      // Find the activity to remove and track it for deletion if it has a database ID
      const activityToRemove = p.activities.find(a => a.id === actId);
      if (activityToRemove && activityToRemove.activity_id) {
        setDeletedActivityIds(prev => [...prev, activityToRemove.activity_id]);
      }

      return {
        ...p,
        activities: p.activities.filter(a => a.id !== actId)
      };
    }));
  };

  const showSuccessMessage = (message) => {
    console.log('Success', message);
    toast.success(message || "Form Saved");
    // Add toast notification here if you have one
  };

  const showErrorMessage = (message) => {
    console.log('Error', message);
    toast.error(message || "An error occurred while saving the form");
    // Add toast notification here if you have one
  };

  // Update the handleSave function to implement offline capability and better error handling

  const handleSave = async () => {
    // Validate form first
    const validation = ref.current.validateForm();
    if (!validation.valid) {
      showErrorMessage(validation.message);
      return false;
    }

    if (isLoading) return false; // Prevent saving while already saving

    setIsLoading(true);

    const currentFormId = formIdRef.current;

    // Form1 now requires form_id for updates
    if (!currentFormId) {
      setIsLoading(false);
      showErrorMessage("Form ID is required for updates. Please start from Form 3 to create a new form.");
      return false;
    }

    console.log("Form1 data:", { formId: currentFormId, title, division, processes });

    // Create a function to save form data to localStorage as a fallback
    const saveToLocalStorage = () => {
      try {
        const formDataToSave = {
          title,
          division,
          processes,
          form_id: currentFormId,
          last_saved: new Date().toISOString(),
          pending_save: true
        };
        localStorage.setItem('form1_pending_data', JSON.stringify(formDataToSave));
        console.log('Form data saved to localStorage as fallback');
        return true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
      }
    };

    try {
      const requestBody = {
        title,
        division,
        processes: processes, // Include all processes in the main request
        userId: sessionData?.user_id,
        form_id: currentFormId // Always include form_id for Form1
      };

      console.log('Form1 updating existing form with ID:', currentFormId);

      // First attempt to save to server
      const response = await fetch('/api/user/form1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Server error - check if it's a MySQL connection error
        const errorData = await response.json();

        if (errorData.error && errorData.error.includes('MySQL Connection not available')) {
          console.warn('MySQL connection error detected - saving to localStorage instead');

          // Save to localStorage as a fallback
          const localSaveSuccess = saveToLocalStorage();

          if (localSaveSuccess) {
            showSuccessMessage('Form saved locally (database connection unavailable). Your changes will be synchronized when connection is restored.');
            setIsLoading(false);
            return true; // Return success for UI flow
          } else {
            throw new Error('Failed to save locally');
          }
        }

        throw new Error(errorData.error || `Form save failed: ${response.statusText}`);
      }

      const formResult = await response.json();
      console.log('Form1 save success:', formResult);

      let formId = formResult.form_id;

      if (deletedProcessIds.length > 0) {
        console.log('Deleting processes:', deletedProcessIds);

        for (const processId of deletedProcessIds) {
          try {
            const deleteResponse = await fetch(`/api/user/process/${processId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (!deleteResponse.ok) {
              console.error(`Failed to delete process ${processId}`);
            } else {
              console.log(`Successfully deleted process ${processId}`);
            }
          } catch (error) {
            console.error(`Error deleting process ${processId}:`, error);
          }
        }

        // Clear the deleted processes list after attempting deletion
        setDeletedProcessIds([]);
      }

      // Handle deleted activities
      if (deletedActivityIds.length > 0) {
        console.log('Deleting activities:', deletedActivityIds);

        for (const activityId of deletedActivityIds) {
          try {
            const deleteResponse = await fetch(`/api/user/activity/${activityId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (!deleteResponse.ok) {
              console.error(`Failed to delete activity ${activityId}`);
            } else {
              console.log(`Successfully deleted activity ${activityId}`);
            }
          } catch (error) {
            console.error(`Error deleting activity ${activityId}:`, error);
          }
        }

        // Clear the deleted activities list after attempting deletion
        setDeletedActivityIds([]);
      }

      if (processes && processes.length > 0) {
        console.log('Saving processes for form ID:', formId);

        const savedProcesses = [];

        for (let i = 0; i < processes.length; i++) {
          const process = processes[i];

          const processRequestBody = {
            process_form_id: formId,
            process_number: process.processNumber || (i + 1),
            process_title: process.header,
            process_location: process.location || null,
            ...(process.process_id && { process_id: process.process_id })
          };

          console.log(`Saving process ${i + 1}:`, processRequestBody);

          try {
            const processResponse = await fetch('/api/user/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(processRequestBody)
            });

            if (!processResponse.ok) {
              const errorData = await processResponse.json();
              throw new Error(errorData.error || `Process save failed for process ${i + 1}: ${processResponse.statusText}`);
            }

            const processResult = await processResponse.json();
            console.log(`Process ${i + 1} saved:`, processResult);

            const processId = processResult.process_id;
            savedProcesses.push({ ...process, process_id: processId });

            if (process.activities && process.activities.length > 0) {
              console.log('Saving activities for process ID:', processId);

              const savedActivities = [];

              for (let j = 0; j < process.activities.length; j++) {
                const activity = process.activities[j];
                const activityRequestBody = {
                  activity_process_id: processId,
                  activity_form_id: formId,
                  activity_number: j + 1, // Use sequential number instead of activity.id
                  work_activity: activity.description || "",
                  activity_remarks: activity.remarks || "",
                  ...(activity.activity_id && { activity_id: activity.activity_id })
                };

                console.log(`Saving activity ${j + 1} for process ${i + 1}:`, activityRequestBody);

                const activityResponse = await fetch('/api/user/activity', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(activityRequestBody)
                });

                if (!activityResponse.ok) {
                  const errorData = await activityResponse.json();
                  throw new Error(errorData.error || `Activity save failed for activity ${j + 1} in process ${i + 1}: ${activityResponse.statusText}`);
                }

                const activityResult = await activityResponse.json();
                console.log(`Activity ${j + 1} for process ${i + 1} saved:`, activityResult);

                savedActivities.push({ ...activity, activity_id: activityResult.activity_id });
              }

              // Update the process with saved activity IDs
              savedProcesses[i].activities = savedActivities;
            }
          } catch (processError) {
            // If a process fails to save but the form was saved, we can continue
            console.error(`Error saving process ${i + 1}:`, processError);
            // Try to save locally for synchronization later
            saveToLocalStorage();
          }
        }

        // Only update if we have processes successfully saved
        if (savedProcesses.length > 0) {
          updateProcessesWithSavedIds(savedProcesses);
        }
      }

      // Clear any locally stored pending data since we've successfully saved
      localStorage.removeItem('form1_pending_data');

      setIsLoading(false);
      console.log('All data saved successfully');


      return true;

    } catch (error) {
      console.error('Save operation failed:', error);

      // Try to save to localStorage as fallback
      const localSaveSuccess = saveToLocalStorage();

      if (localSaveSuccess) {
        showSuccessMessage('Form saved locally. Your changes will be synchronized when connection is restored.');
        setIsLoading(false);
        return true; // Allow navigation to continue
      } else {
        setIsLoading(false);
        showErrorMessage(`Save failed: ${error.message}`);
        return false;
      }
    }
  };
  const updateProcessesWithSavedIds = (savedProcesses) => {
    const updatedProcesses = processes.map((proc, index) => {
      const savedProcess = savedProcesses[index];
      if (savedProcess) {
        return {
          ...proc,
          process_id: savedProcess.process_id,
          activities: proc.activities.map((act, actIndex) => {
            const savedActivity = savedProcess.activities?.[actIndex];
            return savedActivity ? { ...act, activity_id: savedActivity.activity_id } : act;
          })
        };
      }
      return proc;
    });

    setProcesses(updatedProcesses);
  };

  return (
    <div className="space-y-6">
      {/* Header inputs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
        <div className="xl:col-span-4 w-full">
          <InputGroup
            label="Title"
            id="form-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="xl:col-span-4 w-full">
          <InputGroup
            label="Division"
            id="form-division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            type="select"
            options={[
              { value: "", label: "Select Division" },
              ...divisions
            ]}
            disabled={divisionsLoading}
          />
        </div>
        <div className="col-span-full xl:col-span-4 w-full">
          <CTAButton
            icon={MdAdd}
            text="Generate Work Activities"
            onClick={generateWorkActivities}
            className="w-full mb-4"
          />
        </div>
        <div className="col-span-full xl:col-span-12 w-full">
          <CTAButton
            icon={MdAdd}
            text="Add Process"
            onClick={addProcess}
            className="w-full mb-4"
          />
        </div>
      </div>

      {/* Process sections */}
      {processes.map((proc, index) => (
        <div key={proc.id} className={`${index === processes.length - 1 ? "pb-10" : ""}`}>
          {/* Editable header bar (collapsible) */}
          <div
            onClick={() => toggleCollapse(proc.id)}
            className="flex items-center space-x-2 px-4 py-2 rounded-t-lg bg-gray-100 cursor-pointer border border-gray-200"
            style={{ backgroundColor: proc.headerColor }}
          >
            <span className="font-semibold text-lg flex-1 flex items-center gap-2">
              {collapsedProcessIds.includes(proc.id) ? <MdExpandMore /> : <MdExpandLess />}
              {`Process ${proc.processNumber} - ${proc.header || "Enter Process Title"}`}
            </span>
            <CTAButton
              icon={LuMinus}
              text="Remove"
              onClick={(e) => {
                console.log("Process Remove clicked for ID:", proc.id);
                e.stopPropagation();
                setProcessToRemoveId(proc.id);
                setProcessWarningOpen(true);
              }}
              className="text-black"
            />
          </div>
          {/* Content wrapper - only show if not collapsed */}
          {!collapsedProcessIds.includes(proc.id) && (
            <div className="border-gray-200 bg-white p-4 space-y-4 border-l border-r border-b">
              {/* Process Title Input */}
              <div>
                <InputGroup
                  label="Process Title"
                  id={`title-${proc.id}`}
                  value={proc.header}
                  placeholder="Enter Process Title"
                  onChange={(e) =>
                    setProcesses(processes.map(p =>
                      p.id === proc.id ? { ...p, header: e.target.value } : p
                    ))
                  }
                />
              </div>

              {/* Location */}
              <div>
                <InputGroup
                  label="Location"
                  id={`location-${proc.id}`}
                  value={proc.location}
                  onChange={(e) =>
                    setProcesses(processes.map(p =>
                      p.id === proc.id ? { ...p, location: e.target.value } : p
                    ))
                  }
                />
              </div>

              {/* Activities */}
              {proc.activities.map((act) => (
                <div key={act.id} className="space-y-2 border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">Work Activity</h5>
                      {act.source && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            act.source === "DB matched"
                              ? "bg-green-100 text-green-800"
                              : act.source === "AI generated"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {act.source === "DB matched" ? "DB" : act.source === "AI generated" ? "AI" : act.source}
                        </span>
                      )}
                    </div>
                    <div className="space-x-2 flex">
                      <button
                        type="button"
                        onClick={() => {
                          console.log("Activity Remove clicked for Process ID:", proc.id, "Activity ID:", act.id);
                          if (proc.activities.length === 1) return;
                          setActivityToRemove({ procId: proc.id, actId: act.id });
                          setActivityWarningOpen(true);
                        }}
                        disabled={proc.activities.length === 1}
                        className={`bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600
                            ${proc.activities.length === 1 ? "opacity-50 cursor-not-allowed hover:bg-gray-200" : ""}`}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => addActivity(proc.id)}
                        className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <InputGroup
                    label={`Work Activity Description`}
                    id={`activity-${proc.id}-${act.id}`}
                    placeholder="Activity description"
                    value={act.description}
                    onChange={(e) =>
                      setProcesses(processes.map(p =>
                        p.id === proc.id
                          ? {
                            ...p,
                            activities: p.activities.map(a =>
                              a.id === act.id ? { ...a, description: e.target.value } : a
                            )
                          }
                          : p
                      ))
                    }
                  />
                  <textarea
                    placeholder="Remarks"
                    value={act.remarks || ""}
                    onChange={(e) =>
                      setProcesses(processes.map(p =>
                        p.id === proc.id
                          ? {
                            ...p,
                            activities: p.activities.map(a =>
                              a.id === act.id ? { ...a, remarks: e.target.value } : a
                            )
                          }
                          : p
                      ))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {showSummaryDialog && (
        <SummaryDialog
          title="Generation Summary"
          message="The following explanations were provided for each process:"
          processes={summaryList}
          onClose={() => setShowSummaryDialog(false)}
        />
      )}
      {/* Warning Dialogs */}
      <WarningDialog
        isOpen={processWarningOpen}
        icon={<IoWarning />}
        title="Removing Process"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          console.log("Process WarningDialog: onDelete called for ID:", processToRemoveId);
          removeProcess(processToRemoveId);
          setProcessWarningOpen(false);
        }}
        onClose={() => {
          console.log("Process WarningDialog: onClose called");
          setProcessWarningOpen(false);
        }}
      />
      <WarningDialog
        isOpen={activityWarningOpen}
        icon={<IoWarning />}
        title="Removing Activity"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          console.log("Activity WarningDialog: onDelete called for", activityToRemove);
          removeActivity(activityToRemove.procId, activityToRemove.actId);
          setActivityWarningOpen(false);
        }}
        onClose={() => {
          console.log("Activity WarningDialog: onClose called");
          setActivityWarningOpen(false);
        }}
      />
      <div id="form1-bottom" className="h-4"></div>
      <ProcessFab onAddProcess={addProcess} />
    </div>
  );
});

export default Form1;