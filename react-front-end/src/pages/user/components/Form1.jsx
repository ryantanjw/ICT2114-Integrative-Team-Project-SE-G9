import { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdDelete } from "react-icons/md";

// Convert to forwardRef to expose methods to parent
const Form1 = forwardRef(({ sample, sessionData, updateFormData, formData, onNavigate }, ref) => {
  // Use formData if provided (from parent state), otherwise use sample or default
  const [processes, setProcesses] = useState(
    formData?.processes || sample?.processes || [
      {
        id: 1,
        processNumber: 1,
        location: "",
        activities: [
          { id: 1, description: "", remarks: "" }
        ],
        header: "Practical lesson and Projects",
        headerColor: "#EEF1F4",
      }
    ]
  );

  // Initialize with formData if available
  const [formId, setFormId] = useState(formData?.form_id || null);
  const [title, setTitle] = useState(formData?.title || sample?.title || "");
  const [division, setDivision] = useState(formData?.division || sample?.division || "");
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  const formIdRef = useRef(formData?.form_id || null);
  const lastFetchTime = useRef(0);
  const [deletedProcessIds, setDeletedProcessIds] = useState([]); //Use this state to track deleted processes --> need to include another one for deleted activities after


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
          setProcesses(formData.processes || []);
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
  
        if (!id) {
          console.log('No form ID found, showing empty form');
          setDataLoaded(true);
          setIsLoading(false);
          return;
        }
  
        console.log(`Fetching form data for ID: ${id}`);
  
        const response = await fetch(`/api/user/get_form/${id}`);
  
        if (response.ok) {
          const data = await response.json();
          console.log('Form data loaded:', data);
  
          // Update form state
          setTitle(data.title || "");
          setDivision(data.division || "");
  
          // Ensure all processes have valid IDs
          const processesWithIds = data.processes.map(proc => ({
            ...proc,
            id: proc.id || proc.process_id,
            process_id: proc.process_id || proc.id,
            activities: proc.activities.map(act => ({
              ...act,
              id: act.id || act.activity_id,
              activity_id: act.activity_id || act.id
            }))
          }));
  
          setProcesses(processesWithIds || []);
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
      if (!division.trim()) return { valid: false, message: 'Division is required' };

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
    })
  }));

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
      return {
        ...p,
        activities: p.activities.filter(a => a.id !== actId)
      };
    }));
  };

  const showSuccessMessage = (message) => {
    console.log('Success', message);
    // Add toast notification here if you have one
  };

  const showErrorMessage = (message) => {
    console.log('Error', message);
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
  
    console.log("Form1 data:", { formId: currentFormId, title, division, processes });
  
    // Create a function to save form data to localStorage as a fallback
    const saveToLocalStorage = () => {
      try {
        const formDataToSave = {
          title,
          division,
          processes,
          form_id: currentFormId || `temp_${Date.now()}`,
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
        userId: sessionData?.user_id
      };
  
      if (currentFormId) {
        requestBody.form_id = currentFormId;
        console.log('Including form_id in request:', currentFormId);
      } else {
        console.log('No Form ID, creating new form');
      }
  
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
            
            // Generate a temporary form ID if needed
            const tempFormId = currentFormId || `temp_${Date.now()}`;
            updateFormId(tempFormId);
            
            setIsLoading(false);
            return true; // Return success for UI flow
          } else {
            throw new Error('Failed to save locally');
          }
        }
        
        throw new Error(errorData.error || `Form save failed: ${response.statusText}`);
      }
  
      const formResult = await response.json();
      console.log('Form save success:', formResult);
  
      let formId = formResult.form_id;
  
      // Update form ID if new form
      if (formResult.action === 'created' || !currentFormId) {
        updateFormId(formId);
        await storeFormIdInSession(formId);
        console.log('New form created with ID:', formId);
      }

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
  
      showSuccessMessage('Form saved successfully!');
  
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
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <InputGroup
            label="Title"
            id="form-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <InputGroup
            label="Division"
            id="form-division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          />
        </div>
        <CTAButton
          icon="+"
          text="Add Process"
          onClick={addProcess}
          className="ml-auto"
        />
      </div>

      {/* Process sections */}
      {processes.map((proc) => (
        <div key={proc.id}>
          {/* Editable header bar */}
          <div
            className="flex items-center space-x-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: proc.headerColor }}
          >
            <span className="font-semibold text-lg">{`Process ${proc.processNumber} - `}</span>
            <input
              type="text"
              value={proc.header}
              placeholder="Enter Process Title Here"
              onChange={(e) =>
                setProcesses(processes.map(p =>
                  p.id === proc.id ? { ...p, header: e.target.value } : p
                ))
              }
              className="flex-1 bg-transparent border-none font-semibold text-lg"
            />
            <CTAButton
              icon={<MdDelete />}
              text="Remove"
              onClick={() => removeProcess(proc.id)}
              className="text-black"
            />
          </div>

          {/* Content wrapper */}
          <div className="border border-gray-200 bg-white p-4 space-y-4 rounded-b">
            {/* Process Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Process Number</label>
              <select
                value={proc.processNumber}
                onChange={(e) =>
                  setProcesses(processes.map(p =>
                    p.id === proc.id
                      ? { ...p, processNumber: parseInt(e.target.value) }
                      : p
                  ))
                }
                className="w-24 border border-gray-300 rounded px-2 py-1"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
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
                  <h5 className="font-medium">Work Activity</h5>
                  <div className="space-x-2 flex">
                    <button
                      type="button"
                      onClick={() => removeActivity(proc.id, act.id)}
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
        </div>
      ))}

      {/* Save button */}
      <div className="flex justify-end mt-4">
        <CTAButton
          text="Save"
          onClick={handleSave}
          className="px-6 py-2"
          disabled={isLoading}
        />
      </div>
    </div>
  );
});

export default Form1;