import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd, MdDelete } from "react-icons/md";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { RiCollapseVerticalFill, RiExpandVerticalLine } from "react-icons/ri";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "react-hot-toast";

const Form2 = forwardRef(({ sample, sessionData, updateFormData, formData }, ref) => {
  // Build RA processes with nested activities and default hazards
  // Initialize with empty array instead of hardcoded values
  const [hazardTypesList, setHazardTypesList] = useState([]);
  const [title, setTitle] = useState("");
  const [division, setDivision] = useState("");
  const [raProcesses, setRaProcesses] = useState([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [formId, setFormId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const formIdRef = useRef(null);
  const lastFetchTime = useRef(0);
  const pendingUpdatesRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const initialLoadRef = useRef(true);

  // Helper function to update both state and ref
  const updateFormId = (id) => {
    console.log('Updating formId to:', id);
    setFormId(id);
    formIdRef.current = id; // This is immediately available
  };

  // Fixed initializeHazards function - replace your existing one
  const initializeHazards = (hazards) => {
    console.log('Initializing hazards with data:', hazards);

    if (!hazards || hazards.length === 0) {
      return [{
        id: uuidv4(),
        description: "",
        type: [],
        injuries: [],
        newInjury: "",
        newType: "",
        showTypeInput: false,
        showInjuryInput: false,
        existingControls: "",
        additionalControls: "",
        severity: 1,
        likelihood: 1,
        rpn: 1,
      }];
    }

    // Make sure all required fields exist while preserving existing data
    return hazards.map(hazard => {
      console.log('Processing hazard:', hazard);

      return {
        id: hazard.id || hazard.hazard_id || uuidv4(),
        hazard_id: hazard.hazard_id || hazard.id,
        description: hazard.description || "",

        // Fix: Handle type field properly - it might be missing from API
        type: Array.isArray(hazard.type) ? [...hazard.type] :
          (hazard.type ? [hazard.type] : []),

        // Fix: Handle injuries field properly - it might be missing from API  
        injuries: Array.isArray(hazard.injuries) ? [...hazard.injuries] :
          (hazard.injury ? [hazard.injury] :
            hazard.injuries ? [hazard.injuries] : []),

        existingControls: hazard.existingControls || "",
        additionalControls: hazard.additionalControls || "",
        severity: hazard.severity || 1,
        likelihood: hazard.likelihood || 1,
        rpn: hazard.rpn || (hazard.severity || 1) * (hazard.likelihood || 1),

        // UI state fields
        newInjury: "",
        newType: "",
        showTypeInput: false,
        showInjuryInput: false,
      };
    });
  };

  // Debounced function to store form ID in session
  const storeFormIdInSession = useCallback(async (form_id) => {
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      console.log('Skipping session update - too soon');
      return;
    }

    lastFetchTime.current = now;

    try {
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

  // Function to fetch hazard types from the database
  const fetchHazardTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/user/hazard_types');
      if (response.ok) {
        const data = await response.json();
        if (data.hazard_types && data.hazard_types.length > 0) {
          // Extract type field from each hazard type object
          const types = data.hazard_types.map(ht => ht.type || ht);
          console.log('Loaded hazard types from API:', types);
          setHazardTypesList(types);
          return types;
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching hazard types:', error);
      return [];
    }
  }, []);

  // Load hazard types on component mount
  useEffect(() => {
    fetchHazardTypes();
  }, [fetchHazardTypes]);

  // Fetch form data from API  
  const fetchFormData = useCallback(async (id) => {
    if (!id) {
      console.log('No form ID provided, skipping data fetch');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Fetching form data for ID: ${id}`);

      // First fetch basic form data
      const response = await fetch(`/api/user/get_form/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch form data: ${response.statusText}`);
      }

      const basicData = await response.json();
      console.log('Basic form data loaded:', basicData);

      // Set basic form data
      setTitle(basicData.title || "");
      setDivision(basicData.division || "");

      // Then fetch complete hazard data for this form
      const hazardResponse = await fetch(`/api/user/get_form2_data/${id}`);

      console.log("RETRIEVING HAZARD RESPONSE DATA");
      console.log("datadata:", hazardResponse);

      if (!hazardResponse.ok) {
        throw new Error(`Failed to fetch hazard data: ${hazardResponse.statusText}`);
      }

      const hazardData = await hazardResponse.json();
      console.log('Hazard data loaded:', hazardData);

      // Load hazard types if we haven't already
      if (hazardTypesList.length === 0) {
        await fetchHazardTypes();
      }

      // Process and initialize the processes with proper hazard structure
      if (hazardData.processes && hazardData.processes.length > 0) {
        console.log("calling line 191:(");
        const processesWithHazards = hazardData.processes.map(proc => ({
          ...proc,
          id: proc.id || proc.process_id,
          process_id: proc.process_id || proc.id,
          activities: (proc.activities || []).map(act => ({
            ...act,
            id: act.id || act.activity_id,
            activity_id: act.activity_id || act.id,
            expanded: true,
            hazards: initializeHazards(act.hazards)
          }))
        }));

        setRaProcesses(processesWithHazards);
      } else if (basicData.processes && basicData.processes.length > 0) {
        // If no hazard data yet, initialize from basic data
        const processesWithEmptyHazards = basicData.processes.map(proc => ({
          ...proc,
          id: proc.id || proc.process_id,
          process_id: proc.process_id || proc.id,
          activities: (proc.activities || []).map(act => ({
            ...act,
            id: act.id || act.activity_id,
            activity_id: act.activity_id || act.id,
            expanded: true,
            hazards: initializeHazards([]) // Initialize with empty hazards
          }))
        }));

        setRaProcesses(processesWithEmptyHazards);
      }

      updateFormId(id);

      // Also fetch hazard types list if needed
      if (hazardData.hazardTypesList && hazardData.hazardTypesList.length > 0) {
        setHazardTypesList(hazardData.hazardTypesList);
      }

      // Store form ID in session
      await storeFormIdInSession(id);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeFormIdInSession, hazardTypesList, fetchHazardTypes]);

  // Initialize data from either formData prop or directly from API
  useEffect(() => {
    const initializeFormData = () => {
      console.log('=== FORM2 INITIALIZATION DEBUG ===');
      console.log('dataLoaded:', dataLoaded);
      console.log('raProcesses.length:', raProcesses.length);
      console.log('Form2 received formData:', formData);
      console.log('formData.form_id:', formData?.form_id);
      console.log('current formId:', formId);

      // If we have formData passed from parent, check if it's complete
      if (formData && Object.keys(formData).length > 0 && formData.form_id) {
        console.log('Checking if formData has complete hazard data...');

        // Check if formData already has complete hazard data
        const hasHazardData = formData.processes?.some(proc =>
          proc.activities?.some(act =>
            'hazards' in act && Array.isArray(act.hazards)
          )
        );

        console.log('formData has hazard data:', hasHazardData);

        if (hasHazardData) {
          // Use the complete data from formData
          console.log("Using complete hazard data from formData");

          setTitle(formData.title || "");
          setDivision(formData.division || "");
          updateFormId(formData.form_id);

          const processesWithHazards = formData.processes.map(proc => ({
            ...proc,
            id: proc.id || proc.process_id,
            process_id: proc.process_id || proc.id,
            activities: (proc.activities || []).map(act => ({
              ...act,
              id: act.id || act.activity_id,
              activity_id: act.activity_id || act.id,
              expanded: true,
              hazards: initializeHazards(act.hazards || [])
            }))
          }));

          setRaProcesses(processesWithHazards);
          setDataLoaded(true);
          return true;
        } else {
          // formData doesn't have hazard data, don't initialize from it
          console.log("formData missing hazard data, will fetch complete data from API");

          // Just set the basic info and form ID, but don't initialize processes yet
          setTitle(formData.title || "");
          setDivision(formData.division || "");
          updateFormId(formData.form_id);

          // Return false to trigger API fetch
          return false;
        }
      }

      return false;
    };

    // Try to initialize from props first
    const initialized = initializeFormData();

    console.log("Initialization from formData result:", initialized);

    // If not initialized from props, fetch complete data from API
    if (!initialized && !dataLoaded) {
      const formIdToFetch = formData?.form_id || sessionData?.current_form_id;

      if (formIdToFetch) {
        console.log('Fetching complete data from API for form ID:', formIdToFetch);
        fetchFormData(formIdToFetch);
      } else {
        console.log('No form ID available for fetching');
      }
    }
  }, [formData, sessionData, dataLoaded, fetchFormData]);

  useEffect(() => {
    console.log("DEBUGGING HERE");
    console.log("Form2 received formData:", formData);

    // Check each process and its activities/hazards in detail
    formData.processes?.forEach((process, index) => {
      console.log(`Process ${index}:`, process);
      process.activities?.forEach((activity, actIndex) => {
        console.log(`Process ${index} Activity ${actIndex}:`, activity);
        console.log(`Activity ${actIndex} has hazards property:`, 'hazards' in activity);
        console.log(`Activity ${actIndex} hazards:`, activity.hazards);
        console.log(`Activity ${actIndex} keys:`, Object.keys(activity));
      });
    });
  }, [formData]);

  // Batched update function to avoid excessive parent updates
  const scheduleBatchedUpdate = useCallback(() => {
    // Cancel any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Create the current form data
    pendingUpdatesRef.current = {
      form_id: formId,
      title,
      division,
      processes: raProcesses
    };

    // Schedule an update for later - only update when user is idle for 2 seconds
    updateTimeoutRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current && updateFormData && dataLoaded) {
        console.log("Sending batched update to parent");
        updateFormData(pendingUpdatesRef.current, false);
        pendingUpdatesRef.current = null;
      }
    }, 2000);
  }, [title, division, raProcesses, formId, updateFormData, dataLoaded]);

  // Only update parent when explicitly requested (Save button) or after a long idle period
  const triggerUpdateToParent = useCallback((force = false) => {
    // Cancel any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Prevent too frequent updates
    const now = Date.now();
    if (!force && now - lastUpdateTime.current < 1000) {
      console.log("Skipping parent update - too soon");
      return;
    }
    lastUpdateTime.current = now;

    if (updateFormData && dataLoaded) {
      const updatedFormData = {
        form_id: formId,
        title,
        division,
        processes: raProcesses
      };

      console.log("Explicitly updating parent", force ? "(forced)" : "");
      updateFormData(updatedFormData, force);
    }
  }, [title, division, raProcesses, formId, updateFormData, dataLoaded]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced cleanup logic using useEffect
  useEffect(() => {
    const clearFormIdOnReload = async () => {
      // Only clear on initial page load
      if (!initialLoadRef.current) return;

      initialLoadRef.current = false;

      try {
        console.log('Clearing form ID from session on page load');

        // Clear from session using API
        await fetch('/api/user/clear_form_id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        // Also clear from localStorage to be thorough
        localStorage.removeItem('current_form_id');

        console.log('Form ID cleared from session on page load');
      } catch (error) {
        console.error('Error clearing form ID from session:', error);
      }
    };

    clearFormIdOnReload();

    // Set up beforeunload handler to clear form ID when navigating away from page
    const handleBeforeUnload = () => {
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

      // Let the browser know we've handled the event
      return null;
    };

    // Add beforeunload listener for browser refreshes/closes
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listeners and clear form ID when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Final cleanup when component unmounts
      fetch('/api/user/clear_form_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch(e => console.error('Error clearing form ID on unmount:', e));

      localStorage.removeItem('current_form_id');
      console.log('Cleared form ID on component unmount');
    };
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    saveForm: async () => {
      // Cancel any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      // Force update to parent before saving
      triggerUpdateToParent(true);

      // Then call the save handler
      return handleSave();
    },
    validateForm: () => {
      // Check if each activity has at least one hazard with description and type
      const isValid = raProcesses.every(process =>
        process.activities.every(activity =>
          activity.hazards.some(hazard =>
            hazard.description.trim() !== "" &&
            hazard.type.length > 0
          )
        )
      );

      return {
        valid: isValid,
        message: isValid ? "" : "Please complete all hazard descriptions and select hazard types"
      };
    },
    getData: () => ({
      form_id: formId,
      title,
      division,
      processes: raProcesses
    }),
    // New method to handle going back without saving to DB
    goBack: () => {
      console.log("Form2: Going back without saving to DB");

      // Just update parent state without saving to DB
      triggerUpdateToParent(true);

      // Return success
      return true;
    }
  }));

  // Helper functions to operate on raProcesses (processes with nested activities)
  const toggleExpand = (processId, activityId) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId ? { ...a, expanded: !a.expanded } : a
            ),
          }
          : proc
      )
    );
    // This change doesn't affect form data validity or saved state
  };

  const updateActivityField = (processId, activityId, key, value) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId ? { ...a, [key]: value } : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const removeActivity = (processId, activityId) => {
    setRaProcesses(
      raProcesses.map(proc => {
        if (proc.id !== processId) return proc;
        if (proc.activities.length <= 1) return proc;
        return {
          ...proc,
          activities: proc.activities.filter(a => a.id !== activityId),
        };
      })
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const addHazard = (processId, activityId) => {
    setRaProcesses(prev =>
      prev.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: [
                    ...a.hazards,
                    {
                      id: uuidv4(), // ctrl f tag AI (changed this from date.Now() to uuidv4())
                      description: "",
                      type: [],
                      injuries: [],
                      newInjury: "",
                      newType: "",
                      showTypeInput: false,
                      showInjuryInput: false,
                      existingControls: "",
                      additionalControls: "",
                      severity: 1,
                      likelihood: 1,
                      rpn: 1,
                    },
                  ],
                }
                : a
            ),
          }
          : proc
      )
    );

    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const handleConfirmNewType = (processId, activityId, hazardId) => {
    // Get the new hazard type value
    const newTypeValue = raProcesses.find(p => p.id === processId)
      ?.activities.find(a => a.id === activityId)
      ?.hazards.find(h => h.id === hazardId)?.newType.trim();

    if (newTypeValue) {
      // Also add to the hazardTypesList so it persists on the page
      if (!hazardTypesList.includes(newTypeValue)) {
        setHazardTypesList(prev => [...prev, newTypeValue]);
      }
    }

    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: a.hazards.map(h =>
                    h.id === hazardId && h.newType.trim() !== ""
                      ? {
                        ...h,
                        // Fix: Add the new type to the existing array instead of replacing
                        type: [...h.type, h.newType],
                        newType: "",
                        showTypeInput: false,
                      }
                      : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const handleHazardTypeKeyPress = (e, processId, activityId, hazardId) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      e.preventDefault(); // Prevent form submission
      handleConfirmNewType(processId, activityId, hazardId);
    }
  };

  const handleInjuryKeyPress = (e, processId, activityId, hazardId) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      e.preventDefault(); // Prevent form submission
      handleConfirmNewInjury(processId, activityId, hazardId);
    }
  };

  const handleConfirmNewInjury = (processId, activityId, hazardId) => {
    // Get the new injury value
    const newInjuryValue = raProcesses.find(p => p.id === processId)
      ?.activities.find(a => a.id === activityId)
      ?.hazards.find(h => h.id === hazardId)?.newInjury.trim();

    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: a.hazards.map(h =>
                    h.id === hazardId && h.newInjury.trim() !== ""
                      ? {
                        ...h,
                        injuries: [...h.injuries, h.newInjury],
                        newInjury: "",
                        showInjuryInput: false,
                      }
                      : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };
  const removeHazard = (processId, activityId, hazardId) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards:
                    a.hazards.length > 1
                      ? a.hazards.filter(h => h.id !== hazardId)
                      : a.hazards,
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const updateHazard = (processId, activityId, hazardId, key, value) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: a.hazards.map(h =>
                    h.id === hazardId ? { ...h, [key]: value } : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

        const toggleHazardType = (processId, activityId, hazardId, type) => {
      // Use the functional state update pattern to ensure we're working with the latest state
      setRaProcesses(prevProcesses => {
        const newProcesses = prevProcesses.map(proc =>
          proc.id === processId
            ? {
                ...proc,
                activities: proc.activities.map(a =>
                  a.id === activityId
                    ? {
                        ...a,
                        hazards: a.hazards.map(h =>
                          h.id === hazardId
                            ? {
                                ...h,
                                // Set type to either [type] or [] if already selected
                                type: h.type.includes(type) ? [] : [type]
                              }
                            : h
                        ),
                      }
                    : a
                ),
              }
            : proc
        );
        
        return newProcesses;
      });
      
      // Schedule batched update AFTER state update completes
      setTimeout(() => {
        scheduleBatchedUpdate();
      }, 0);
    };

  const addInjury = (processId, activityId, hazardId) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: a.hazards.map(h =>
                    h.id === hazardId
                      ? {
                        ...h,
                        injuries: h.newInjury ? [...h.injuries, h.newInjury] : h.injuries,
                        newInjury: "",
                      }
                      : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const removeInjury = (processId, activityId, hazardId, injury) => {
    setRaProcesses(
      raProcesses.map(proc =>
        proc.id === processId
          ? {
            ...proc,
            activities: proc.activities.map(a =>
              a.id === activityId
                ? {
                  ...a,
                  hazards: a.hazards.map(h =>
                    h.id === hazardId
                      ? {
                        ...h,
                        injuries: h.injuries.filter(i => i !== injury),
                      }
                      : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
    // Schedule a batched update
    scheduleBatchedUpdate();
  };

  const toggleExpandAll = () => {
    setRaProcesses(
      raProcesses.map(proc => ({
        ...proc,
        activities: proc.activities.map(a => ({ ...a, expanded: allCollapsed }))
      }))
    );
    setAllCollapsed(!allCollapsed);
    // This change doesn't affect form data validity or saved state
  };

  // Save handler  
  const handleSave = async () => {
    if (isLoading) return false; // Prevent saving while already saving

    setIsLoading(true);

    const currentFormId = formIdRef.current;

    console.log("Form2 data:", { formId: currentFormId, title, division, processes: raProcesses });

    try {
      // Cache the data in localStorage first for redundancy
      try {
        localStorage.setItem(`form2_data_${currentFormId}`, JSON.stringify({
          form_id: currentFormId,
          title,
          division,
          processes: raProcesses,
          lastUpdated: new Date().toISOString()
        }));
      } catch (err) {
        console.warn('Unable to cache data in localStorage:', err);
      }

      const requestBody = {
        title,
        division,
        processes: raProcesses.map(proc => ({
          ...proc,
          activities: proc.activities.map(act => ({
            ...act,
            hazards: act.hazards.map(h => ({
              id: h.id,
              hazard_id: h.hazard_id,
              description: h.description,
              type: h.type,
              injuries: h.injuries,
              existingControls: h.existingControls,
              additionalControls: h.additionalControls,
              severity: h.severity || 1,
              likelihood: h.likelihood || 1,
              rpn: (h.severity || 1) * (h.likelihood || 1)
            }))
          }))
        })),
        userId: sessionData?.user_id
      };

      if (currentFormId) {
        requestBody.form_id = currentFormId;
        console.log('Including form_id in request:', currentFormId);
      } else {
        console.log('No Form ID, creating new form');
      }

      const response = await fetch('/api/user/form2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Success:', result);

        if (result.form_id) {
          updateFormId(result.form_id);
          console.log('Form ID stored:', result.form_id);

          // Also store the form_id in session for cross-tab access
          await storeFormIdInSession(result.form_id);
        }

        // Force update to parent after successful save
        triggerUpdateToParent(true);
        toast.success("Form Saved");

        setIsLoading(false);
        return true; // Indicate success
      } else {
        console.log('Error:', response.statusText);
        toast.error("Failed to save form. Please try again.");
        setIsLoading(false);
        return false; // Indicate failure
      }
    } catch (error) {
      console.log('Network Error:', error);
      setIsLoading(false);
      return false; // Indicate failure
    }
  };
  // Determine dropdown background based on value
  const getDropdownColor = (key, value) => {
    if (key === "severity" || key === "likelihood") {
      if (value >= 4) return "bg-red-600";
      if (value === 3) return "bg-yellow-400";
      return "bg-green-600";
    }
    if (key === "rpn") {
      if (value >= 15) return "bg-red-600";
      if (value >= 7) return "bg-yellow-400";
      return "bg-green-600";
    }
    return "bg-gray-200";
  };

  // ctrl f tag AI
  const createNewHazard = ({
    description = "",
    type = [],
    injuries = [],
    existingControls = "",
    severity = 1,
    likelihood = 1,
    rpn = 1
  } = {}) => ({
    id: uuidv4(),
    hazard_id: uuidv4(),
    description,
    type,
    injuries,
    newInjury: "",
    newType: "",
    showTypeInput: false,
    showInjuryInput: false,
    existingControls,
    additionalControls: "",
    severity,
    likelihood,
    rpn
  });

  const addHazardsToProcess = async (targetProcessId) => {
    // Find the process by id
    const process = raProcesses.find(p => p.id === targetProcessId);
    if (!process) return;

    // For each activity, call AI and add hazards
    const updatedActivities = await Promise.all(
      process.activities.map(async (act) => {
        const activityName = act.description || `Activity ${act.activityNumber || ""}`;
        try {
          const response = await fetch('/api/user/ai_generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: [activityName] })
          });

          if (response.ok) {
            const data = await response.json();
            // Assume data.hazard_data is an array of hazards
            const hazardsArray = Array.isArray(data.hazard_data)
              ? data.hazard_data
              : [data.hazard_data];

            const newHazards = hazardsArray.map(h =>
              createNewHazard({
                description: h.description,
                type: h.type,
                injuries: h.injuries,
                existingControls: h.existingControls,
                severity: h.severity,
                likelihood: h.likelihood,
                rpn: h.rpn
              })
            );

            return {
              ...act,
              hazards: [...act.hazards, ...newHazards]
            };
          } else {
            console.error('Failed to get from AI');
            return act;
          }
        } catch (error) {
          console.error('Error from AI:', error);
          return act;
        }
      })
    );

    // Now safely update the state after all async ops are done
    setRaProcesses(prev =>
      prev.map(p => {
        if (p.id !== targetProcessId) return p;
        return {
          ...p,
          activities: updatedActivities
        };
      })
    );
  };

  // end of ctrl f tag AI

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading hazard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Division */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <InputGroup
            label="Title"
            id="form2-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleBatchedUpdate();
            }}
          />
        </div>
        <div className="flex-1">
          <InputGroup
            label="Division"
            id="form2-division"
            value={division}
            onChange={(e) => {
              setDivision(e.target.value);
              scheduleBatchedUpdate();
            }}
          />
        </div>
        <CTAButton
          icon={allCollapsed ? <RiExpandVerticalLine /> : <RiCollapseVerticalFill />}
          text={allCollapsed ? "Expand All" : "Collapse All"}
          onClick={toggleExpandAll}
          className="ml-auto bg-gray-100 text-black"
        />
      </div>
      {/* Render a section for each process */}
      {raProcesses.map((proc) => (
        <div key={proc.id} className="border border-gray-200 rounded-lg">
          <div className="flex items-center bg-gray-100 px-4 py-2 rounded-t">
            <span className="font-semibold text-lg">
              {`Process ${proc.processNumber} - ${proc.header}`}
            </span>
            <CTAButton
              text="Generate"
              /* ctrl f tag AI Generate button */
              onClick={async () => {
                const toastId = toast.loading("Generating with AI...");
                await addHazardsToProcess(proc.id);
                toast.success("Hazards generated", { id: toastId });
              }}
              className="ml-auto bg-gray-100 text-black"
            />
          </div>
          <div className="bg-white p-4 space-y-4 rounded-b">
            {proc.activities.map((act, idx) => (
              <div key={act.id} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between bg-gray-100 p-3 rounded-t">
                  <div
                    className="flex items-center space-x-2 cursor-pointer flex"
                    onClick={() => toggleExpand(proc.id, act.id)}
                  >
                    {act.expanded ? <FiChevronUp /> : <FiChevronDown />}
                    <span className="font-semibold">
                      Work Activity {idx + 1} {act.description && `- ${act.description}`}
                    </span>
                  </div>
                  {proc.activities.length > 1 && (
                    <CTAButton
                      icon={<MdDelete />}
                      text="Remove"
                      onClick={() => removeActivity(proc.id, act.id)}
                      className="text-black"
                    />
                  )}
                </div>
                {act.expanded && (
                  <div className="p-4 space-y-4 bg-white rounded-b">
                    {/* Activity Number */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Activity Number</label>
                      <div className="px-2 py-1 bg-gray-100 rounded inline-block">
                        {act.activityNumber || idx + 1}
                      </div>
                    </div>

                    {/* Hazard sections */}
                    {act.hazards.map((h, hi) => (
                      <div
                        key={h.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                      >
                        {/* header with remove/add hazard */}
                        <div className="flex justify-between items-center">
                          <h6 className="font-semibold">Hazard {hi + 1}</h6>
                          <div className="space-x-2 flex">
                            <button
                              onClick={() => removeHazard(proc.id, act.id, h.id)}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                              disabled={act.hazards.length === 1}
                            >
                              <MdDelete />
                            </button>
                            <button
                              onClick={() => addHazard(proc.id, act.id)}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                            >
                              <MdAdd />
                            </button>
                          </div>
                        </div>

                        <InputGroup
                          label="Hazard Description"
                          id={`hazard-desc-${h.id}`}
                          value={h.description}
                          placeholder="Hazard description"
                          onChange={(e) =>
                            updateHazard(proc.id, act.id, h.id, "description", e.target.value)
                          }
                        />

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Type of Hazard
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {hazardTypesList.map((type) => (
                              <button
                                key={type}
                                onClick={() => toggleHazardType(proc.id, act.id, h.id, type)}
                                className={`px-3 py-1 rounded-full  ${h.type.includes(type)
                                  ? "bg-black text-white"
                                  : "bg-gray-200"
                                  }`}
                              >
                                {type}
                              </button>
                            ))}
                            <button
                              className="px-3 py-1 rounded-full bg-gray-200"
                              onClick={() =>
                                updateHazard(proc.id, act.id, h.id, "showTypeInput", true)
                              }
                            >
                              + Add More
                            </button>
                            {h.type.length > 0 && !hazardTypesList.includes(h.type[0]) && (
                              <span className="px-3 py-1 rounded-full bg-black text-white">
                                {h.type[0]}
                              </span>
                            )}
                          </div>
                          {h.showTypeInput && (
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="text"
                                value={h.newType}
                                onChange={e =>
                                  updateHazard(proc.id, act.id, h.id, "newType", e.target.value)
                                }
                                onKeyPress={e => handleHazardTypeKeyPress(e, proc.id, act.id, h.id)}
                                placeholder="Enter New Hazard"
                                className="flex-1 border border-gray-300 rounded px-3 py-2"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmNewType(proc.id, act.id, h.id)}
                                className="bg-black text-white rounded-full w-8 h-8 flex items-center justify-center"
                              >
                                <MdCheck />
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Possible Injuries
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {h.injuries.map((inj, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => removeInjury(proc.id, act.id, h.id, inj)}
                                className="px-3 py-1 rounded-full text-white"
                                style={{ backgroundColor: "#7F3F00" }}
                              >
                                {inj}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="px-3 py-1 rounded-full bg-gray-200"
                              onClick={() =>
                                updateHazard(proc.id, act.id, h.id, "showInjuryInput", true)
                              }
                            >
                              + Add More
                            </button>
                          </div>
                          {h.showInjuryInput && (
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="text"
                                value={h.newInjury}
                                onChange={e =>
                                  updateHazard(proc.id, act.id, h.id, "newInjury", e.target.value)
                                }
                                onKeyPress={e => handleInjuryKeyPress(e, proc.id, act.id, h.id)}
                                placeholder="Enter New Injury"
                                className="flex-1 border border-gray-300 rounded px-3 py-2"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmNewInjury(proc.id, act.id, h.id)}
                                className="bg-[#7F3F00] text-white rounded-full w-8 h-8 flex items-center justify-center"
                              >
                                <MdCheck />
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Existing Risk Controls*
                          </label>
                          <textarea
                            rows={3}
                            value={h.existingControls}
                            onChange={(e) =>
                              updateHazard(proc.id, act.id, h.id, "existingControls", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded p-2"
                          />
                        </div>

                        <InputGroup
                          label="Additional Existing Risk Controls"
                          id={`add-controls-${h.id}`}
                          value={h.additionalControls}
                          onChange={(e) =>
                            updateHazard(proc.id, act.id, h.id, "additionalControls", e.target.value)
                          }
                        />

                        <div className="bg-blue-600 text-white p-2 rounded text-sm">
                          Risk Controls only reduce likelihood; Severity is constant
                        </div>

                        <div className="flex space-x-4">
                          {["Severity", "Likelihood", "RPN"].map((label) => (
                            <div key={label}>
                              <label className="block text-sm font-medium mb-1">
                                {label}
                              </label>
                              {label === "RPN" ? (
                                <select
                                  value={(h.severity || 1) * (h.likelihood || 1)}
                                  disabled
                                  className={`${getDropdownColor(
                                    "rpn",
                                    (h.severity || 1) * (h.likelihood || 1)
                                  )} text-white rounded px-2 py-1`}
                                >
                                  {[...Array(25)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {i + 1}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={h[label.toLowerCase()] || 1}
                                  onChange={(e) =>
                                    updateHazard(
                                      proc.id,
                                      act.id,
                                      h.id,
                                      label.toLowerCase(),
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className={`${getDropdownColor(
                                    label.toLowerCase(),
                                    h[label.toLowerCase()] || 1
                                  )} text-white rounded px-2 py-1`}
                                >
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex space-x-4 pt-2">
                          <InputGroup
                            label="Due Date"
                            id={`due-${h.id}`}
                            value="14/05/2025"
                            onChange={() => { }}
                            disabled
                            className="flex-1"
                          />
                          <InputGroup
                            label="Implementation Person"
                            id={`impl-${h.id}`}
                            value="Hajmath Begum (PO, POD)"
                            onChange={() => { }}
                            disabled
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Save button */}
      <div className="flex justify-end mt-4">
        <CTAButton
          text="Save"
          onClick={() => {
            // Force update to parent before saving
            triggerUpdateToParent(true);
            handleSave();
          }}
          className="px-6 py-2"
          disabled={isLoading}
        />
      </div>
    </div>
  );
});

export default Form2;