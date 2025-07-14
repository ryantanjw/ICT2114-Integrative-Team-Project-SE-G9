import { MdSave } from "react-icons/md";
import { IoWarning } from "react-icons/io5";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import WarningDialog from "./WarningDialog.jsx";
import StickyBottomNav from "../../../components/StickyBottomNav.jsx";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd } from "react-icons/md";
import { LuMinus } from "react-icons/lu";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { RiCollapseVerticalFill, RiExpandVerticalLine } from "react-icons/ri";
import { v4 as uuidv4 } from 'uuid';
import { IoIosWarning } from "react-icons/io";
import { toast } from "react-hot-toast";

const Form2 = forwardRef(({ sample, sessionData, updateFormData, formData }, ref) => {
  // Build RA processes with nested activities and default hazards
  // Initialize with empty array instead of hardcoded values
  const [hazardTypesList, setHazardTypesList] = useState([]);
  const [title, setTitle] = useState("");
  const [division, setDivision] = useState("");  // Initialize as empty string
  const [divisions, setDivisions] = useState([]); // State for division options
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [raProcesses, setRaProcesses] = useState([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [formId, setFormId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserDesignation, setCurrentUserDesignation] = useState("");
  const [lastSaveTime, setLastSaveTime] = useState(0); // Track when we last saved

  // For warning dialog on hazard removal
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningInfo, setWarningInfo] = useState({ processId: null, activityId: null, hazardId: null });
  // For warning dialog on activity removal
  const [activityWarningOpen, setActivityWarningOpen] = useState(false);
  const [activityWarningInfo, setActivityWarningInfo] = useState({ processId: null, activityId: null });
  // For warning dialog on risk control removal
  const [riskControlWarningOpen, setRiskControlWarningOpen] = useState(false);
  const [riskControlWarningInfo, setRiskControlWarningInfo] = useState({ processId: null, activityId: null, hazardId: null, riskControlId: null });
  // For warning dialog on additional risk control removal
  const [additionalRiskControlWarningOpen, setAdditionalRiskControlWarningOpen] = useState(false);
  const [additionalRiskControlWarningInfo, setAdditionalRiskControlWarningInfo] = useState({ processId: null, activityId: null, hazardId: null, acIndex: null });

  // Temporary hardcoded list of risk control categories
  const riskcontrolTypesList = [
    { value: "Elimination", display: "Elimination" },
    { value: "Substitution", display: "Substitution" },
    { value: "Engineering Controls", display: "Engineering Controls" },
    { value: "Administrative Controls", display: "Administrative Controls" },
    { value: "Personal Protective Equipment (PPE)", display: "Personal Protective Equipment (PPE)" }
  ];


  const formIdRef = useRef(null);
  const lastFetchTime = useRef(0);
  const pendingUpdatesRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const initialLoadRef = useRef(true);


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

  // Updated initializeHazards function that parses formatted risk controls
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
        severity: 0,
        likelihood: 0,
        rpn: 0,
        newSeverity: 0,
        newLikelihood: 0,
        newRpn: 0,
        implementationPerson: "",
        // Collapse/expand flags
        additionalControlsExpanded: true,
        riskControls: [{
          id: uuidv4(),
          existingControls: "",
          riskControlType: "",
          expanded: true
        }]
      }];
    }

    // Make sure all required fields exist while preserving existing data
    return hazards.map(hazard => {
      console.log('Processing hazard:', hazard);

      let formattedDueDate = null;
      if (hazard.hazard_due_date) {
        try {
          // Convert from ISO to YYYY-MM-DD
          formattedDueDate = hazard.hazard_due_date.split('T')[0];
        } catch (e) {
          console.error("Failed to parse due date:", hazard.hazard_due_date);
        }
      }

      // Parse existing risk controls (format: "a) risk control category - existing risk control")
      const parsedRiskControls = [];
      if (hazard.existingControls) {
        // Check if the string contains formatted controls (with a) b) c) prefixes)
        const controlLines = hazard.existingControls.split(/\n|(?=[a-z]\))/);
        
        // If we have properly formatted controls
        if (controlLines.length > 0 && /^[a-z]\)/.test(controlLines[0].trim())) {
          console.log('Parsing formatted existing controls:', controlLines);
          
          controlLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Match the pattern: a) Category - Text
              const match = trimmedLine.match(/^[a-z]\)\s*(.*?)\s*-\s*(.*)/);
              if (match) {
                const [, category, controlText] = match;
                parsedRiskControls.push({
                  id: uuidv4(),
                  riskControlType: category,
                  existingControls: controlText.trim(),
                  expanded: true
                });
              } else {
                // If not matching expected format, just add as-is
                parsedRiskControls.push({
                  id: uuidv4(),
                  riskControlType: "",
                  existingControls: trimmedLine,
                  expanded: true
                });
              }
            }
          });
        } else {
          // If no proper formatting, use the old format
          parsedRiskControls.push({
            id: uuidv4(),
            existingControls: hazard.existingControls,
            riskControlType: hazard.riskControlType || "",
            expanded: true
          });
        }
      }

      // If no risk controls were parsed, add an empty one
      if (parsedRiskControls.length === 0) {
        parsedRiskControls.push({
          id: uuidv4(),
          existingControls: "",
          riskControlType: "",
          expanded: true
        });
      }
      
      // Parse additional risk controls (format: "a) risk control category - additional risk control")
      const parsedAdditionalRiskControls = [];
      if (hazard.additionalControls) {
        // Check if the string contains formatted controls (with a) b) c) prefixes)
        const controlLines = hazard.additionalControls.split(/\n|(?=[a-z]\))/);
        
        // If we have properly formatted controls
        if (controlLines.length > 0 && /^[a-z]\)/.test(controlLines[0].trim())) {
          console.log('Parsing formatted additional controls:', controlLines);
          
          controlLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Match the pattern: a) Category - Text
              const match = trimmedLine.match(/^[a-z]\)\s*(.*?)\s*-\s*(.*)/);
              if (match) {
                const [, category, controlText] = match;
                parsedAdditionalRiskControls.push({
                  id: uuidv4(),
                  controlType: category,
                  controlText: controlText.trim(),
                  expanded: true
                });
              } else {
                // If not matching expected format, just add as-is
                parsedAdditionalRiskControls.push({
                  id: uuidv4(),
                  controlType: "",
                  controlText: trimmedLine.replace(/^[a-z]\)\s*/, ''), // Remove the prefix if present
                  expanded: true
                });
              }
            }
          });
        } else {
          // If no proper formatting, use the old format
          parsedAdditionalRiskControls.push({
            id: uuidv4(),
            controlText: hazard.additionalControls,
            controlType: hazard.additionalControlType || "",
            expanded: true
          });
        }
      }

      // If no additional risk controls were parsed, add an empty one
      if (parsedAdditionalRiskControls.length === 0) {
        parsedAdditionalRiskControls.push({
          id: uuidv4(),
          controlText: "",
          controlType: "",
          expanded: true
        });
      }

      return {
        id: hazard.id || hazard.hazard_id || uuidv4(),
        hazard_id: hazard.hazard_id || hazard.id,
        description: hazard.description || "",

        // Fix: Handle type field properly - it might be missing from API
        type: Array.isArray(hazard.type) ? [...hazard.type] :
          (hazard.type ? [hazard.type] : []),

        // Fix: Handle injuries field properly - split by comma if string, handle arrays
        injuries: (() => {
          if (Array.isArray(hazard.injuries)) {
            // If it's already an array, flatten and split any comma-separated strings
            return hazard.injuries.flatMap(injury =>
              typeof injury === 'string' ? injury.split(',').map(i => i.trim()).filter(i => i) : [injury]
            );
          } else if (hazard.injury) {
            // Handle single injury field (split by comma)
            return typeof hazard.injury === 'string'
              ? hazard.injury.split(',').map(i => i.trim()).filter(i => i)
              : [hazard.injury];
          } else if (hazard.injuries) {
            // Handle injuries as string (split by comma)
            return typeof hazard.injuries === 'string'
              ? hazard.injuries.split(',').map(i => i.trim()).filter(i => i)
              : [hazard.injuries];
          }
          return [];
        })(),

        existingControls: hazard.existingControls || "",
        additionalControls: hazard.additionalControls || "",
        severity: hazard.severity ?? 0,
        likelihood: hazard.likelihood ?? 0,
        rpn: hazard.rpn ?? 0,
        newSeverity: hazard.severity ?? 0,  // Always equal to severity
        newLikelihood: hazard.newLikelihood ?? hazard.likelihood ?? 0,
        newRpn: (hazard.severity ?? 0) * (hazard.newLikelihood ?? hazard.likelihood ?? 0),
        dueDate: formattedDueDate || "",
        implementationPerson: hazard.implementationPerson ||
          hazard.implementation_person ||
          hazard.hazard_implementation_person || "",
        // UI state fields
        newInjury: "",
        newType: "",
        showTypeInput: false,
        showInjuryInput: false,
        // Collapse/expand flags
        additionalControlsExpanded: true,
        // Use the parsed risk controls
        riskControls: parsedRiskControls,
        // Use the parsed additional risk controls
        additionalRiskControls: parsedAdditionalRiskControls
      };
    });
  };

  // Fetch current user details on mount  
  useEffect(() => {
    // Function to get current user's details
    const fetchCurrentUser = async () => {
      if (!sessionData || !sessionData.user_id) {
        console.log("No user ID available in session data:", sessionData);
        return;
      }

      console.log(`Attempting to fetch user data for ID: ${sessionData.user_id}`);

      try {
        const response = await fetch(`/api/user/user/${sessionData.user_id}`, {
          credentials: 'include'
        });

        console.log("API response status:", response.status);

        if (response.ok) {
          const userData = await response.json();
          console.log("User data fetched:", userData);

          // FIXED: Use the correct property names from the API response
          const userName = userData.user_name || sessionData.username || "Unknown User";
          const userDesignation = userData.user_designation || userData.user_role || "Unknown Dept";

          console.log(`Setting user name: "${userName}" and role: "${userDesignation}"`);

          setCurrentUserName(userName);
          setCurrentUserDesignation(userDesignation);
        } else {
          console.error("Failed to fetch user data, status:", response.status);
          // Set fallback values on error
          setCurrentUserName(sessionData.username || "Unknown User");
          setCurrentUserDesignation("Unknown Dept");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Set fallback values on error
        setCurrentUserName(sessionData.username || "Unknown User");
        setCurrentUserDesignation("Unknown Dept");
      }
    };

    fetchCurrentUser();
  }, [sessionData]);

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

    // Don't fetch if we already have data loaded for this form
    if (dataLoaded && formId === id) {
      console.log('Data already loaded for this form, skipping fetch');
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
      setDivision(basicData.division_id || "");

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
        })); setRaProcesses(processesWithEmptyHazards);

        // Trigger parent update during initialization
        setTimeout(() => {
          triggerUpdateToParent(true);
        }, 100);
      }

      updateFormId(id);

      // Also fetch hazard types list if needed
      if (hazardData.hazardTypesList && hazardData.hazardTypesList.length > 0) {
        setHazardTypesList(hazardData.hazardTypesList);
      }

      // Store form ID in session
      await storeFormIdInSession(id);
      setDataLoaded(true);

      // Trigger parent update during initialization
      setTimeout(() => {
        triggerUpdateToParent(true);
      }, 100);
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeFormIdInSession, hazardTypesList, fetchHazardTypes, dataLoaded, formId]);

  // Initialize data from either formData prop or directly from API
  useEffect(() => {
    const initializeFormData = () => {
      console.log('=== FORM2 INITIALIZATION DEBUG ===');
      console.log('dataLoaded:', dataLoaded);
      console.log('raProcesses.length:', raProcesses.length);
      console.log('Form2 received formData:', formData);
      console.log('formData.form_id:', formData?.form_id);
      console.log('current formId:', formId);

      // If we already have data loaded and the form ID matches, don't reinitialize
      if (dataLoaded && formId && formData?.form_id === formId) {
        console.log('Skipping initialization - data already loaded for this form');
        return true;
      }

      // If we just saved recently (within 5 seconds), don't reinitialize from potentially stale parent data
      const timeSinceLastSave = Date.now() - lastSaveTime;
      if (dataLoaded && timeSinceLastSave < 5000) {
        console.log('Skipping initialization - recent save detected, avoiding stale data');
        return true;
      }

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

          // Trigger parent update during initialization
          setTimeout(() => {
            triggerUpdateToParent(true);
          }, 100);

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
    
  }, [formData?.form_id, sessionData?.current_form_id, formData?.processes?.length]); // Also depend on processes length changes

  // Autocomplete starts from here
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

  // Batched update function - now only updates the pending data, doesn't trigger parent updates
  const scheduleBatchedUpdate = useCallback(() => {
    // Cancel any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Only store the current form data for later use, don't send to parent
    pendingUpdatesRef.current = {
      form_id: formId,
      title,
      division,
      processes: raProcesses
    };

    // Clear any existing timeout - we don't automatically update parent anymore
    updateTimeoutRef.current = null;
  }, [title, division, raProcesses, formId]);

  // Only update parent when explicitly requested (Save button) or during initialization
  const triggerUpdateToParent = useCallback((force = false) => {
    // Cancel any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Prevent too frequent updates unless forced
    const now = Date.now();
    if (!force && now - lastUpdateTime.current < 1000) {
      console.log("Skipping parent update - too soon");
      return;
    }
    lastUpdateTime.current = now;

    if (updateFormData && dataLoaded) {
      // Use pending updates if available, otherwise create fresh data
      const updatedFormData = pendingUpdatesRef.current || {
        form_id: formId,
        title,
        division,
        processes: raProcesses
      };

      console.log("Explicitly updating parent", force ? "(forced)" : "");
      updateFormData(updatedFormData, force);

      // Clear pending updates after sending
      pendingUpdatesRef.current = null;
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

      // Call the save handler (which will trigger parent update after successful save)
      return handleSave();
    },
    validateForm: () => {
      return validateForm();
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
                      severity: 0,
                      likelihood: 0,
                      rpn: 0,
                      newSeverity: 0,
                      newLikelihood: 0,
                      newRpn: 0,
                      implementationPerson: "",
                      // Collapse/expand flags
                      additionalControlsExpanded: true,
                      // Add empty risk controls
                      riskControls: [{
                        id: uuidv4(),
                        existingControls: "",
                        riskControlType: "",
                        expanded: true
                      }],
                      // Add empty additional risk controls
                      additionalRiskControls: [{
                        id: uuidv4(),
                        controlText: "",
                        controlType: "",
                        expanded: true
                      }]
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
                    h.id === hazardId 
                      ? { 
                        ...h, 
                        [key]: value,
                        // If severity is updated, sync newSeverity too
                        ...(key === 'severity' ? { newSeverity: value } : {}),
                        // If newSeverity is updated, sync severity too
                        ...(key === 'newSeverity' ? { severity: value } : {})
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

  // Toggle the selected risk control category for a hazard
  const toggleRiskControlType = (processId, activityId, hazardId, type, controlId) => {
    console.log("Toggling risk control type:", { processId, activityId, hazardId, type, controlId });
    
    // Find the hazard to check its current state
    const hazard = raProcesses
      .find(p => p.id === processId)
      ?.activities.find(a => a.id === activityId)
      ?.hazards.find(h => h.id === hazardId);
      
    console.log("Current hazard:", hazard);
    console.log("Risk controls:", hazard?.riskControls);
    console.log("Risk control to toggle:", hazard?.riskControls?.find(rc => rc.id === controlId));
    
    // Find the display name for this risk control type
    const typeObj = riskcontrolTypesList.find(item => item.value === type);
    const typeDisplay = typeObj ? typeObj.display : "";
    
    // Determine if we're adding, changing, or removing this type
    const currentRiskControl = hazard?.riskControls?.find(rc => rc.id === controlId);
    const isToggling = currentRiskControl?.riskControlType === type; // If same type is clicked, we're removing it
    
    setRaProcesses(prev =>
      prev.map(proc =>
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
                              // Update the risk control type - ensure only one selection at a time
                              riskControls: (h.riskControls || []).map(rc => {
                                if (rc.id === controlId) {
                                  console.log("Updating risk control:", rc);
                                  const newRiskControlType = isToggling ? "" : type;
                                  
                                  // Update the existingControls field to include/exclude the risk control type
                                  let existingText = h.existingControls || "";
                                  
                                  // Extract the type prefix if it exists
                                  const typeRegex = /^\[(.*?)\]\s*/;
                                  const match = existingText.match(typeRegex);
                                  
                                  if (newRiskControlType) {
                                    // Adding or changing type
                                    if (match) {
                                      // Replace existing type
                                      existingText = existingText.replace(typeRegex, `[${typeDisplay}] `);
                                    } else {
                                      // Add new type prefix
                                      existingText = `[${typeDisplay}] ${existingText}`;
                                    }
                                  } else {
                                    // Removing type
                                    if (match) {
                                      existingText = existingText.replace(typeRegex, '');
                                    }
                                  }
                                  
                                  return { 
                                    ...rc, 
                                    riskControlType: newRiskControlType,
                                    existingControls: existingText
                                  };
                                }
                                return rc;
                              }),
                              // Also update the main existingControls field for the hazard
                              existingControls: (() => {
                                const typeRegex = /^\[(.*?)\]\s*/;
                                const currentText = h.existingControls || "";
                                const match = currentText.match(typeRegex);
                                
                                if (isToggling) {
                                  // Removing the current type
                                  return match ? currentText.replace(typeRegex, "") : currentText;
                                } else {
                                  // Adding or changing the type
                                  if (match) {
                                    // Replace existing type
                                    return currentText.replace(typeRegex, `[${typeDisplay}] `);
                                  } else {
                                    // Add new type prefix
                                    return `[${typeDisplay}] ${currentText}`;
                                  }
                                }
                              })()
                            }
                          : h
                      )
                    }
                  : a
              )
            }
          : proc
      )
    );

    setTimeout(scheduleBatchedUpdate, 0);
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

  // Validation function to check all required fields
  const validateForm = () => {
    // Check all required fields for each hazard in each activity
    const invalidHazards = [];
    
    // Track if form is valid
    let isValid = true;
    
    // Check all processes, activities, and hazards
    raProcesses.forEach((process, processIndex) => {
      process.activities.forEach((activity, activityIndex) => {
        activity.hazards.forEach((hazard, hazardIndex) => {
          const missingFields = [];
          
          // Check each required field
          if (!hazard.description.trim()) missingFields.push('Hazard Description');
          if (hazard.type.length === 0) missingFields.push('Hazard Type');
          if (hazard.injuries.length === 0) missingFields.push('Possible Injuries');
          if (!hazard.existingControls.trim()) missingFields.push('Existing Risk Controls');
          if (hazard.severity === 0) missingFields.push('Severity');
          if (hazard.likelihood === 0) missingFields.push('Likelihood');
          
          // Calculate RPN (Risk Priority Number)
          const rpn = (hazard.severity || 0) * (hazard.likelihood || 0);
          const newRpn = (hazard.severity || 0) * (hazard.newLikelihood || 0);
          
          // Additional required fields when RPN >= 15
          if (rpn >= 15) {
            if (!hazard.additionalControls.trim()) missingFields.push('Additional Risk Controls');
            if (hazard.newLikelihood === 0) missingFields.push('New Likelihood (After Controls)');
            if (!hazard.dueDate) missingFields.push('Due Date');
            if (!hazard.implementationPerson.trim()) missingFields.push('Implementation Person');
            
            // Ensure that new RPN is less than 15 after additional controls
            if (newRpn >= 15) missingFields.push('Stronger controls needed (RPN must be <15)');
          }
          
          // If any fields are missing, add to invalid hazards list
          if (missingFields.length > 0) {
            invalidHazards.push({
              process: `Process ${process.processNumber || processIndex + 1}`,
              activity: `Activity ${activity.activityNumber || activityIndex + 1}`,
              hazard: `Hazard ${hazardIndex + 1}`,
              rpn: rpn,
              missingFields
            });
            isValid = false;
          }
        });
      });
    });

    return {
      valid: isValid,
      message: isValid 
        ? "" 
        : `Missing required fields:${invalidHazards.map(h => 
            `\n• ${h.process}, ${h.activity}, ${h.hazard}${h.rpn >= 15 ? ` (RPN: ${h.rpn})` : ''}:\n  ${h.missingFields.map(field => `   - ${field}`).join('\n  ')}`
          ).join('')}${invalidHazards.some(h => h.missingFields.includes('Stronger controls needed (RPN must be <15)')) ? 
            '\n\nReminder: High-risk hazards (RPN ≥ 15) must have controls that reduce risk below 15.' : 
            ''}`,
      invalidHazards
    };
  };

  // Save handler  
  const handleSave = async () => {
    if (isLoading) return false; // Prevent saving while already saving

    // Validate form before saving
    const validation = validateForm();
    if (!validation.valid) {
      toast.error(validation.message);
      setIsLoading(false);
      return false;
    }

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
      }        const requestBody = {
          title,
          division,
          processes: raProcesses.map(proc => ({
            ...proc,
            activities: proc.activities.map(act => ({
              ...act,
              hazards: act.hazards.map(h => {
                // Format existing risk controls with alphabetical prefixes
                let formattedExistingControls = "";
                if (h.riskControls && h.riskControls.length > 0) {
                  formattedExistingControls = h.riskControls.map((rc, idx) => {
                    // Create alphabetical prefix (a, b, c, etc.)
                    const prefix = String.fromCharCode(97 + idx) + ") ";
                    
                    // Find the risk control type display text
                    const typeObj = riskcontrolTypesList.find(type => type.value === rc.riskControlType);
                    const typeText = typeObj ? typeObj.display : "";
                    
                    // Format as "a) risk control category - existing risk control"
                    return `${prefix}${typeText ? typeText + " - " : ""}${rc.existingControls}`;
                  }).join("\n");
                } else if (h.existingControls) {
                  // Fallback to use the legacy field if no riskControls array
                  formattedExistingControls = `a) ${h.existingControls}`;
                }
                
                return {
                  id: h.id,
                  hazard_id: h.hazard_id,
                  description: h.description,
                  type: h.type,
                  injuries: h.injuries,
                  existingControls: formattedExistingControls, // Use formatted controls
                  additionalControls: (() => {
                    // Format additional risk controls with alphabetical prefixes just like existing controls
                    let formattedAdditionalControls = "";
                    if (h.additionalRiskControls && h.additionalRiskControls.length > 0) {
                      formattedAdditionalControls = h.additionalRiskControls.map((ac, idx) => {
                        // Create alphabetical prefix (a, b, c, etc.)
                        const prefix = String.fromCharCode(97 + idx) + ") ";
                        
                        // Find the risk control type display text
                        const typeObj = riskcontrolTypesList.find(type => type.value === ac.controlType);
                        const typeText = typeObj ? typeObj.display : "";
                        
                        // Format as "a) risk control category - additional risk control"
                        return `${prefix}${typeText ? typeText + " - " : ""}${ac.controlText}`;
                      }).join("\n");
                    } else if (h.additionalControls) {
                      // Fallback to use the legacy field if no additionalRiskControls array
                      formattedAdditionalControls = `a) ${h.additionalControls}`;
                    }
                    return formattedAdditionalControls;
                  })(),
                  severity: h.severity ?? 0,
                  likelihood: h.likelihood ?? 0,
                  rpn: (h.severity ?? 0) * (h.likelihood ?? 0),
                  newSeverity: h.severity ?? 0,  // Always use severity value
                  newLikelihood: h.newLikelihood ?? 0,
                  newRpn: (h.severity ?? 0) * (h.newLikelihood ?? 0),
                  dueDate: h.dueDate || "",
                  implementationPerson: h.implementationPerson || "",
                  additionalControlType: h.additionalControlType || ""
                };
              })
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

        // Record the save time to prevent reinitialization from stale data
        setLastSaveTime(Date.now());

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
    // For unselected values (0), use gray
    if (value === 0) return "bg-gray-200";
    
    if (key === "severity" || key === "likelihood") {
      if (value >= 4) return "bg-red-700";
      if (value === 3) return "bg-yellow-400";
      return "bg-green-600";
    }
    if (key === "rpn") {
      if (value >= 15) return "bg-red-700 animate-pulse"; // Add animation for high RPN
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
    riskControlType = "",   // newly added for rag function
    existingControls = "",
    additionalControls = "",
    severity = 0,
    likelihood = 0,
    rpn = 0,
    newSeverity = 0,
    newLikelihood = 0,
    newRpn = 0,
    implementationPerson = "",
    additionalControlType = ""
  } = {}) => {
    // // Extract any existing risk control type from existingControls
    // const typeRegex = /^\[(.*?)\]\s*/;
    // const match = existingControls.match(typeRegex);
    // let riskControlType = "";
    
    // // If there's a type in the existingControls, extract it
    // if (match) {
    //   const typeLabel = match[1];
    //   const typeObj = riskcontrolTypesList.find(item => item.display === typeLabel);
    //   riskControlType = typeObj ? typeObj.value : "";
    // }
    // newly added for rag function 
    let finalRiskControlType = riskControlType; // if provided, use it
    if (!finalRiskControlType) {
      // If there's a type in the existingControls, extract it
      const typeRegex = /^\[(.*?)\]\s*/;
      const match = existingControls.match(typeRegex);

      if (match) {
        const typeLabel = match[1];
        const typeObj = riskcontrolTypesList.find(item => item.display === typeLabel);
        finalRiskControlType = typeObj ? typeObj.value : "";
      }
    }
    // end of newly added for rag function
    return {
    id: uuidv4(),
    hazard_id: uuidv4(),
    description,
    type: Array.isArray(type) ? type : (type ? [type] : []),
    // Handle injuries - split by comma if string, handle arrays
    injuries: (() => {
      if (Array.isArray(injuries)) {
        return injuries.flatMap(injury =>
          typeof injury === 'string' ? injury.split(',').map(i => i.trim()).filter(i => i) : [injury]
        );
      } else if (injuries) {
        return typeof injuries === 'string'
          ? injuries.split(',').map(i => i.trim()).filter(i => i)
          : [injuries];
      }
      return [];
    })(),
    newInjury: "",
    newType: "",
    showTypeInput: false,
    showInjuryInput: false,
    existingControls,
    implementationPerson: implementationPerson || "",
    additionalControls: "",
    severity,
    likelihood,
    rpn,
    newSeverity: severity,  // Always set newSeverity equal to severity
    newLikelihood,
    newRpn,
    // Collapse/expand flags
    additionalControlsExpanded: true,
    additionalControlType: additionalControlType || "", // Use provided or empty string
    riskControls: [{
      id: uuidv4(),
      existingControls: existingControls || "",
      // riskControlType, // Set the extracted risk control type
      riskControlType: finalRiskControlType, // newly added for rag function
      expanded: true
    }],
    // Add additionalRiskControls array
    additionalRiskControls: [{
      id: uuidv4(),
      controlText: additionalControls || "",
      controlType: additionalControlType || "",
      expanded: true
    }]
  };
};
  // Toggle collapse on a specific Risk Controls sub-section
  const toggleRiskControlSection = (processId, activityId, hazardId, sectionId) => {
    setRaProcesses(prev =>
      prev.map(proc =>
        proc.id !== processId ? proc : {
          ...proc,
          activities: proc.activities.map(act =>
            act.id !== activityId ? act : {
              ...act,
              hazards: act.hazards.map(haz =>
                haz.id !== hazardId ? haz : {
                  ...haz,
                  riskControls: (haz.riskControls || []).map(rc =>
                    rc.id !== sectionId
                      ? rc
                      : { ...rc, expanded: !rc.expanded }
                  )
                }
              )
            }
          )
        }
      )
    );
    scheduleBatchedUpdate();
  };

  // Toggle collapse on Additional Risk Controls block
  const toggleAdditionalControlsSection = (processId, activityId, hazardId) => {
    setRaProcesses(prev => {
      const hazard = prev
        .find(p => p.id === processId)
        ?.activities.find(a => a.id === activityId)
        ?.hazards.find(h => h.id === hazardId);
      
      // Check if we need to create an additionalControlId
      const isExpanding = !(hazard?.additionalControlsExpanded || false);
      const additionalControlId = hazard?.additionalControlId || uuidv4();
      
      return prev.map(proc =>
        proc.id !== processId ? proc : {
          ...proc,
          activities: proc.activities.map(act =>
            act.id !== activityId ? act : {
              ...act,
              hazards: act.hazards.map(haz =>
                haz.id !== hazardId ? haz : {
                  ...haz,
                  additionalControlsExpanded: !haz.additionalControlsExpanded,
                  additionalControlId: haz.additionalControlId || additionalControlId,
                  // If expanding and there's no additionalControlId, ensure there's a risk control entry
                  riskControls: isExpanding && !haz.additionalControlId 
                    ? [
                        ...(haz.riskControls || []),
                        {
                          id: additionalControlId,
                          existingControls: haz.additionalControls || "",
                          riskControlType: "",
                          expanded: true,
                          isAdditionalControl: true
                        }
                      ]
                    : haz.riskControls
                }
              )
            }
          )
        }
      );
    });
    scheduleBatchedUpdate();
  };

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

            console.log("Generated hazards:", hazardsArray);

            const newHazards = hazardsArray.map(h =>
              createNewHazard({
                description: h.description,
                type: h.type,
                injuries: h.injuries,
                riskControlType: h.risk_type, // newly added for rag function
                existingControls: h.existingControls,
                severity: h.severity,
                likelihood: h.likelihood,
                rpn: h.rpn
              })
            );

            return {
              ...act,
              hazards: [...newHazards, ...act.hazards]
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
        <CTAButton
          icon={allCollapsed ? RiExpandVerticalLine : RiCollapseVerticalFill}
          text={allCollapsed ? "Expand All" : "Collapse All"}
          onClick={toggleExpandAll}
          className="ml-auto bg-gray-100 text-black"
        />
      </div>
      {/* Render a section for each process */}
      {raProcesses.map((proc) => (
        <div key={proc.id} className="hello">
          <div className="inset-x-0 z-50 flex items-center bg-gray-100 px-4 py-2 rounded-t border border-gray-200 rounded-lg">
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
              <div key={act.id} className="">
                <div className="sticky top-5 border border-gray-200 rounded-lg inset-x-0 z-20 flex items-center justify-between bg-gray-100 p-3 rounded-t">
                  <div
                    className="flex items-center space-x-2 cursor-pointer flex"
                    onClick={() => toggleExpand(proc.id, act.id)}
                  >
                    {act.expanded ? <FiChevronUp /> : <FiChevronDown />}
                    <span className="font-semibold text-xl">
                      Work Activity {idx + 1} {act.description && `- ${act.description}`}
                    </span>
                  </div>
                  {proc.activities.length > 1 && (
                    <CTAButton
                      icon={LuMinus}
                      text="Remove"
                      onClick={() => {
                        setActivityWarningInfo({ processId: proc.id, activityId: act.id });
                        setActivityWarningOpen(true);
                      }}
                      className="text-black"
                    />
                  )}
                </div>
                {act.expanded && (
                  <div className="p-4 space-y-4 bg-white rounded-b">
                    {/* Activity Number */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Activity Number</label>
                      <select
                        value={act.activityNumber || idx + 1}
                        onChange={(e) => {
                          updateActivityField(proc.id, act.id, "activityNumber", parseInt(e.target.value));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        {/* Generate options from 1 to the total number of activities in this process */}
                        {[...Array(proc.activities.length)].map((_, num) => {
                          const activityNumber = num + 1;
                          // Check if this number is already used by another activity in the same process
                          const isUsed = proc.activities.some(
                            (otherAct) =>
                              otherAct.id !== act.id && // Not the current activity
                              (otherAct.activityNumber || proc.activities.findIndex(a => a.id === otherAct.id) + 1) === activityNumber // Has this number
                          );

                          return (
                            <option
                              key={activityNumber}
                              value={activityNumber}
                              disabled={isUsed}
                            >
                              {activityNumber}{isUsed ? " (in use)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Hazard sections */}
                    {act.hazards.map((h, hi) => (
                      <div
                        key={h.id}
                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                      >
                        {/* header with remove/add hazard */}
                        <div className="flex justify-between items-center">
                          <h6 className="font-semibold text-xl">Hazard {hi + 1}</h6>
                          <div className="space-x-2 flex">
                            <button
                              onClick={() => {
                                setWarningInfo({ processId: proc.id, activityId: act.id, hazardId: h.id });
                                setWarningOpen(true);
                              }}
                              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                              disabled={act.hazards.length === 1}
                            >
                              <LuMinus />
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
                          label="Hazard Description*"
                          id={`hazard-desc-${h.id}`}
                          value={h.description}
                          placeholder="Hazard description"
                          onChange={(e) =>
                            updateHazard(proc.id, act.id, h.id, "description", e.target.value)
                          }
                        />

                        <div>
                          <label className="block text-base text-gray-600 mb-2">
                            Type of Hazard*
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
                            {h.type.length > 0 && !hazardTypesList.includes(h.type[0]) && (
                              <span className="px-3 py-1 rounded-full bg-black text-white">
                                {h.type[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-base text-gray-600 mb-2">
                            Possible Injuries*
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {h.injuries.map((inj, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-1 rounded-full text-white relative group"
                                style={{ backgroundColor: "#7F3F00" }}
                              >
                                {inj}
                                <div
                                  className="absolute right-0 top-0 bg-red-700 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transform translate-x-1 -translate-y-1 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete "${inj}"?`)) {
                                      removeInjury(proc.id, act.id, h.id, inj);
                                    }
                                  }}
                                >
                                  <LuMinus size={12} className="text-white" />
                                </div>
                              </div>
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

                        {/* Only show the rest of the form if there's at least one injury added */}
                        {h.injuries.length > 0 ? (
                          <>

                            {/* <-Existing Risk Control Section START --> */}
                            <div className="mb-2 border border-gray-200 rounded-lg">
                              <div
                                className="flex items-center justify-between bg-blue-100 px-4 py-2 rounded-t cursor-pointer"
                                onClick={() => toggleRiskControlSection(proc.id, act.id, h.id, (h.riskControls?.[0] || {}).id)}
                              >
                                <span className="text-lg font-medium text-blue-800">
                                  Existing Risk Controls*
                                </span>
                                <span>
                                  {(h.riskControls?.[0] || {}).expanded ? <FiChevronUp /> : <FiChevronDown />}
                                </span>
                              </div>
                              {(h.riskControls?.[0] || {}).expanded && (
                                <div className="p-3">
                                  {/* Risk control blocks */}
                                  {(h.riskControls || [{ id: uuidv4(), existingControls: h.existingControls || "", riskControlType: h.riskControlType || "", expanded: true }]).map((rc, rcIndex) => (
                                    <div key={rc.id} className="mb-4 pb-4 border-b border-gray-200">
                                      {/* Label + Buttons */}
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-base font-medium">Existing Risk Controls {rcIndex + 1}</span>
                                        <div className="flex space-x-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRiskControlWarningInfo({ processId: proc.id, activityId: act.id, hazardId: h.id, riskControlId: rc.id });
                                              setRiskControlWarningOpen(true);
                                            }}
                                            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                                            disabled={(h.riskControls || []).length <= 1}
                                          >
                                            <LuMinus />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Add a new risk control to the current hazard
                                              setRaProcesses(prev =>
                                                prev.map(p =>
                                                  p.id === proc.id ? {
                                                    ...p,
                                                    activities: p.activities.map(a =>
                                                      a.id === act.id ? {
                                                        ...a,
                                                        hazards: a.hazards.map(hz =>
                                                          hz.id === h.id ? {
                                                            ...hz,
                                                            riskControls: [
                                                              ...(hz.riskControls || [{ 
                                                                id: uuidv4(), 
                                                                existingControls: hz.existingControls || "", 
                                                                riskControlType: hz.riskControlType || "", 
                                                                expanded: true 
                                                              }]),
                                                              {
                                                                id: uuidv4(),
                                                                existingControls: "",
                                                                riskControlType: "",
                                                                expanded: true
                                                              }
                                                            ]
                                                          } : hz
                                                        )
                                                      } : a
                                                    )
                                                  } : p
                                                )
                                              );
                                              scheduleBatchedUpdate();
                                            }}
                                            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                                          >
                                            <MdAdd />
                                          </button>
                                        </div>
                                      </div>
                                      {/* Risk Control Category Block */}
                                      <div className="mb-2">
                                        <label className="block text-base text-gray-600 mb-2">
                                          Risk Control Category*
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {riskcontrolTypesList.map(typeObj => (
                                            <button
                                              type="button"
                                              key={typeObj.value}
                                              onClick={() => {
                                                // Update the risk control's type in the array
                                                setRaProcesses(prev =>
                                                  prev.map(p =>
                                                    p.id === proc.id ? {
                                                      ...p,
                                                      activities: p.activities.map(a =>
                                                        a.id === act.id ? {
                                                          ...a,
                                                          hazards: a.hazards.map(hz =>
                                                            hz.id === h.id ? {
                                                              ...hz,
                                                              riskControls: (hz.riskControls || []).map(riskCtrl =>
                                                                riskCtrl.id === rc.id ? {
                                                                  ...riskCtrl,
                                                                  riskControlType: riskCtrl.riskControlType === typeObj.value ? "" : typeObj.value
                                                                } : riskCtrl
                                                              )
                                                            } : hz
                                                          )
                                                        } : a
                                                      )
                                                    } : p
                                                  )
                                                );
                                                scheduleBatchedUpdate();
                                              }}
                                              className={`px-3 py-1 rounded-full ${rc.riskControlType === typeObj.value
                                                ? "bg-black text-white"
                                                : "bg-gray-200"
                                              }`}
                                            >
                                              {typeObj.display}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Risk Control Text Area */}
                                      <div className="mb-4">
                                        <textarea
                                          rows={3}
                                          value={rc.existingControls}
                                          onChange={(e) => {
                                            // Update the risk control's text in the array
                                            setRaProcesses(prev =>
                                              prev.map(p =>
                                                p.id === proc.id ? {
                                                  ...p,
                                                  activities: p.activities.map(a =>
                                                    a.id === act.id ? {
                                                      ...a,
                                                      hazards: a.hazards.map(hz =>
                                                        hz.id === h.id ? {
                                                          ...hz,
                                                          riskControls: (hz.riskControls || []).map(riskCtrl =>
                                                            riskCtrl.id === rc.id ? {
                                                              ...riskCtrl,
                                                              existingControls: e.target.value
                                                            } : riskCtrl
                                                          )
                                                        } : hz
                                                      )
                                                    } : a
                                                  )
                                                } : p
                                              )
                                            );
                                            scheduleBatchedUpdate();
                                          }}
                                          placeholder="Describe existing risk controls..."
                                          className="w-full border border-gray-300 rounded p-2"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                
                                  {/* RPN Alert */}
                                  {(h.severity || 0) * (h.likelihood || 0) >= 15 && (
                                    <div className="bg-red-700 text-white p-2 rounded text-base mt-2 mb-2">
                                      <div className="flex items-center space-x-2">
                                        <IoIosWarning className="text-xl" />
                                        <span className="font-medium">High Risk Detected (RPN ≥ 15)</span>
                                      </div>
                                      <p>
                                        Additional Risk Controls, New Likelihood, Due Date, and Implementation Person are required.
                                        <span className="font-medium inline"> The risk level must be reduced below 15 to submit the form.</span>
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Initial Risk Assessment Required Fields - These are common for all risk controls */}
                                  <div className="flex space-x-4 mt-4 pt-4 border-t border-gray-200">
                                    {[
                                      { name: "Severity", required: true },
                                      { name: "Likelihood", required: true },
                                      { name: "RPN", required: false }
                                    ].map((field) => (
                                      <div key={field.name}>
                                        <label className="block text-base font-medium mb-1">
                                          {field.name}{field.required && "*"}
                                          {field.name === "RPN" && (h.severity ?? 0) * (h.likelihood ?? 0) >= 15 && (
                                            <span className="ml-1 text-red-700 font-bold">(High Risk!)</span>
                                          )}
                                        </label>
                                        {field.name === "RPN" ? (
                                          <select
                                            value={(h.severity ?? 0) * (h.likelihood ?? 0)}
                                            disabled
                                            className={`${getDropdownColor(
                                              "rpn",
                                              (h.severity ?? 0) * (h.likelihood ?? 0)
                                            )} text-white rounded px-2 py-1`}
                                          >
                                            {[...Array(26)].map((_, i) => (
                                              <option key={i} value={i}>
                                                {i}{i >= 15 ? " (High Risk)" : ""}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <select
                                            value={h[field.name.toLowerCase()] ?? 0}
                                            onChange={(e) =>
                                              updateHazard(
                                                proc.id,
                                                act.id,
                                                h.id,
                                                field.name.toLowerCase(),
                                                parseInt(e.target.value)
                                              )
                                            }
                                            className={`${getDropdownColor(
                                              field.name.toLowerCase(),
                                              h[field.name.toLowerCase()] ?? 0
                                            )} text-white rounded px-2 py-1`}
                                          >
                                            <option value={0}>Select</option>
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
                                </div>
                              )}
                            </div>
                            {/* <- Existing Risk Control Section END --> */}

                            <div className="bg-blue-600 text-white p-2 my-5 rounded text-base">
                              Risk Controls only reduce likelihood; Severity is constant
                            </div>

                            {/* Additional Risk Controls Section */}
                            <div className="mb-2 border border-gray-200 rounded-lg">
                              <div
                                className="bg-yellow-100 px-4 py-2 rounded-t cursor-pointer"
                                onClick={() => toggleAdditionalControlsSection(proc.id, act.id, h.id)}
                              >
                                <span className="text-lg font-medium text-zinc-900">
                                  Additional Risk Controls*
                                </span>
                                <span className="float-right">
                                  {h.additionalControlsExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                </span>
                              </div>
                              {h.additionalControlsExpanded && (
                                <div className="p-3">
                                  {/* Render each additional risk control */}
                                  {(h.additionalRiskControls || [{ 
                                    id: uuidv4(),
                                    controlText: h.additionalControls || "",
                                    controlType: h.additionalControlType || "",
                                    expanded: true
                                  }]).map((additionalControl, acIndex) => (
                                    <div key={additionalControl.id} className="mb-4 pb-4 border-b border-gray-200">
                                      {/* Label + Buttons */}
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-base font-medium">
                                          Additional Risk Control {acIndex + 1}
                                        </span>
                                        <div className="flex space-x-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAdditionalRiskControlWarningInfo({ processId: proc.id, activityId: act.id, hazardId: h.id, acIndex });
                                              setAdditionalRiskControlWarningOpen(true);
                                            }}
                                            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                                            disabled={(h.additionalRiskControls || []).length <= 1}
                                          >
                                            <LuMinus />
                                          </button>
                                          <button                                            
                                            type="button"
                                            onClick={() => {
                                              // Add a new additional risk control to the current hazard
                                              setRaProcesses(prev =>
                                                prev.map(p =>
                                                  p.id === proc.id ? {
                                                    ...p,
                                                    activities: p.activities.map(a =>
                                                      a.id === act.id ? {
                                                        ...a,
                                                        hazards: a.hazards.map(hz =>
                                                          hz.id === h.id ? {
                                                            ...hz,
                                                            // Make sure we keep existing additionalRiskControls if any
                                                            additionalRiskControls: [
                                                              ...(hz.additionalRiskControls || [{
                                                                id: uuidv4(),
                                                                controlText: hz.additionalControls || "",
                                                                controlType: hz.additionalControlType || "",
                                                                expanded: true
                                                              }]),
                                                              // Add a new empty additional risk control
                                                              {
                                                                id: uuidv4(),
                                                                controlText: "",
                                                                controlType: "",
                                                                expanded: true
                                                              }
                                                            ]
                                                          } : hz
                                                        )
                                                      } : a
                                                    )
                                                  } : p
                                                )
                                              );
                                              scheduleBatchedUpdate();
                                              console.log("Added new additional risk control");
                                            }}
                                            className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-gray-600"
                                          >
                                            <MdAdd />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Risk Control Category Block */}
                                      <div className="mb-2">
                                        <label className="block text-base text-gray-600 mb-2">
                                          Risk Control Category*
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {riskcontrolTypesList.map(typeObj => (
                                            <button
                                              type="button"
                                              key={typeObj.value}
                                              onClick={() => { 
                                                // Update specific additional risk control
                                                setRaProcesses(prev =>
                                                  prev.map(p =>
                                                    p.id === proc.id ? {
                                                      ...p,
                                                      activities: p.activities.map(a =>
                                                        a.id === act.id ? {
                                                          ...a,
                                                          hazards: a.hazards.map(hz =>
                                                            hz.id === h.id ? {
                                                              ...hz,
                                                              // Update the additionalRiskControls array
                                                              additionalRiskControls: (hz.additionalRiskControls || []).map((ctrl, index) => 
                                                                index === acIndex ? {
                                                                  ...ctrl,
                                                                  controlType: ctrl.controlType === typeObj.value ? "" : typeObj.value
                                                                } : ctrl
                                                              ),
                                                              // For backward compatibility with the first control
                                                              additionalControlType: acIndex === 0 ? 
                                                                (additionalControl.controlType === typeObj.value ? "" : typeObj.value) 
                                                                : hz.additionalControlType
                                                            } : hz
                                                          )
                                                        } : a
                                                      )
                                                    } : p
                                                  )
                                                );
                                                setTimeout(scheduleBatchedUpdate, 0);
                                              }}
                                              className={`px-3 py-1 rounded-full ${
                                                additionalControl.controlType === typeObj.value
                                                  ? "bg-black text-white"
                                                  : "bg-gray-200"
                                              }`}
                                            >
                                              {typeObj.display}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Text Area */}
                                      <div className="mb-4">
                                        <textarea
                                          rows={3}
                                          id={`add-controls-${h.id}-${acIndex}`}
                                          value={additionalControl.controlText}
                                          onChange={(e) => {
                                            // Update specific additionalRiskControl
                                            setRaProcesses(prev =>
                                              prev.map(p =>
                                                p.id === proc.id ? {
                                                  ...p,
                                                  activities: p.activities.map(a =>
                                                    a.id === act.id ? {
                                                      ...a,
                                                      hazards: a.hazards.map(hz =>
                                                        hz.id === h.id ? {
                                                          ...hz,
                                                          // Update the additionalRiskControls array
                                                          additionalRiskControls: (hz.additionalRiskControls || []).map((ctrl, index) => 
                                                            index === acIndex ? {
                                                              ...ctrl,
                                                              controlText: e.target.value
                                                            } : ctrl
                                                          ),
                                                          // For backward compatibility with the first control
                                                          additionalControls: acIndex === 0 ? e.target.value : hz.additionalControls
                                                        } : hz
                                                      )
                                                    } : a
                                                  )
                                                } : p
                                              )
                                            );
                                            scheduleBatchedUpdate();
                                          }}
                                          placeholder={(h.severity || 0) * (h.likelihood || 0) >= 15 && (h.severity || 0) * (h.newLikelihood || 0) >= 15 ?
                                            "Provide additional risk controls that will reduce RPN below 15"
                                            : "Provide additional risk controls if needed"
                                          }
                                          className={`w-full border ${(h.severity || 0) * (h.likelihood || 0) >= 15 && !additionalControl.controlText.trim() ? "border-red-500" : "border-gray-300"}
                                            ${(h.severity || 0) * (h.likelihood || 0) >= 15 && (h.severity || 0) * (h.newLikelihood || 0) >= 15 ? "border-2 border-red-500" : ""}
                                            rounded p-2`}
                                        />
                                      </div>
                                    </div>
                                  ))}

                                  {/* Warning Message */}
                                  {(h.severity || 0) * (h.likelihood || 0) >= 15 && (
                                    <div className="bg-blue-600 text-white p-2 rounded text-base mb-2">
                                      <span className="font-base">
                                        For high-risk hazards (RPN ≥ 15), the new RPN must be below 15 to submit.
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Severity/Likelihood/RPN section remains outside the risk controls loop */}
                                  <div className="flex space-x-4">
                                    {[
                                      { name: "Severity", required: false, isDisabled: true },
                                      { name: "Likelihood", required: (h.severity || 0) * (h.likelihood || 0) >= 15, field: "newLikelihood" },
                                      { name: "RPN", required: false }
                                    ].map((field) => (
                                      <div key={field.name}>
                                        <label className="block text-base font-medium mb-1">
                                          {field.name}{field.required && "*"}
                                          {field.required && field.name === "Likelihood" &&
                                            <span className="ml-1 text-xs text-red-700">(Required for high risk)</span>}
                                          {field.name === "RPN" && (h.newSeverity ?? 0) * (h.newLikelihood ?? 0) >= 15 && (
                                            <span className="ml-1 text-xs text-red-700 font-medium">(Still High Risk!)</span>
                                          )}
                                        </label>
                                        {field.name === "RPN" ? (
                                          <select
                                            value={(h.newSeverity ?? 0) * (h.newLikelihood ?? 0)}
                                            disabled
                                            className={`${getDropdownColor(
                                              "rpn",
                                              (h.newSeverity ?? 0) * (h.newLikelihood ?? 0)
                                            )} text-white rounded px-2 py-1`}
                                          >
                                            {[...Array(26)].map((_, i) => (
                                              <option key={i} value={i}>
                                                {i}{i >= 15 ? " (High Risk)" : ""}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <select
                                            value={field.name === "Severity" ? (h.severity ?? 0) : (h.newLikelihood ?? 0)}
                                            onChange={(e) =>
                                              updateHazard(
                                                proc.id,
                                                act.id,
                                                h.id,
                                                field.name === "Severity" ? "severity" : "newLikelihood",
                                                parseInt(e.target.value)
                                              )
                                            }
                                            disabled={field.isDisabled}
                                            className={`${getDropdownColor(
                                              field.name.toLowerCase(),
                                              field.name === "Severity" ? (h.severity ?? 0) : (h.newLikelihood ?? 0)
                                            )} text-white rounded px-2 py-1 ${field.name === "Likelihood" && (h.severity || 0) * (h.newLikelihood || 0) >= 15 ? "border-2 border-red-500 animate-pulse" : ""}`}
                                          >
                                            <option value={0}>Select</option>
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
                                </div>
                              )}
                            </div>

                            {/* DUE Date */}
                            <div>
                              <label className="block text-base font-medium mb-1">
                                Due Date{(h.severity || 0) * (h.likelihood || 0) >= 15 ? "*" : ""}
                                {(h.severity || 0) * (h.likelihood || 0) >= 15 && 
                                  <span className="ml-2 text-xs text-red-700">(Required for high risk)</span>}
                              </label>
                              <InputGroup
                                id={`due-${h.id}`}
                                type="date"
                                value={h.dueDate || ""}
                                min={new Date().toISOString().split('T')[0]} // Prevent selecting dates earlier than today
                                onChange={(e) => updateHazard(proc.id, act.id, h.id, "dueDate", e.target.value)}
                                className={`flex-1 ${(h.severity || 0) * (h.likelihood || 0) >= 15 && !h.dueDate ? "border-red-500" : ""}`}
                                required={(h.severity || 0) * (h.likelihood || 0) >= 15}
                              />
                            </div>

                            <div>
                              <label className="block text-base font-medium mb-1">
                                Implementation Person{(h.severity || 0) * (h.likelihood || 0) >= 15 ? "*" : ""}
                                {(h.severity || 0) * (h.likelihood || 0) >= 15 && 
                                  <span className="ml-2 text-xs text-red-700">(Required for high risk)</span>}
                              </label>
                              <InputGroup
                                id={`impl-${h.id}`}
                                value={h.implementationPerson || ""}
                                onChange={(e) =>
                                  updateHazard(proc.id, act.id, h.id, "implementationPerson", e.target.value)
                                }
                                className={`flex-1 ${(h.severity || 0) * (h.likelihood || 0) >= 15 && !h.implementationPerson.trim() ? "border-red-500" : ""}`}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-600 mt-4">
                            Please add at least one possible injury to continue
                          </div>
                        )}
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
      <StickyBottomNav
        buttonsRight={[
          {
            text: "Save",
            onClick: () => { triggerUpdateToParent(true); handleSave(); },
            disabled: isLoading,
            className: "px-6 py-2",
            icon: MdSave
          }
        ]}
        position="bottom"
      />
      <WarningDialog
        isOpen={warningOpen}
        icon={<IoWarning />}
        title="Removing Hazard"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          removeHazard(warningInfo.processId, warningInfo.activityId, warningInfo.hazardId);
          setWarningOpen(false);
        }}
        onClose={() => setWarningOpen(false)}
      />
      <WarningDialog
        isOpen={activityWarningOpen}
        icon={<IoWarning />}
        title="Removing Activity"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          removeActivity(activityWarningInfo.processId, activityWarningInfo.activityId);
          setActivityWarningOpen(false);
        }}
        onClose={() => setActivityWarningOpen(false)}
      />
      <WarningDialog
        isOpen={riskControlWarningOpen}
        icon={<IoWarning />}
        title="Removing Risk Control"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          const { processId, activityId, hazardId, riskControlId } = riskControlWarningInfo;
          setRaProcesses(prev =>
            prev.map(p =>
              p.id === processId ? {
                ...p,
                activities: p.activities.map(a =>
                  a.id === activityId ? {
                    ...a,
                    hazards: a.hazards.map(hz =>
                      hz.id === hazardId ? {
                        ...hz,
                        riskControls: (hz.riskControls || []).filter(control => control.id !== riskControlId)
                      } : hz
                    )
                  } : a
                )
              } : p
            )
          );
          setRiskControlWarningOpen(false);
          scheduleBatchedUpdate();
        }}
        onClose={() => setRiskControlWarningOpen(false)}
      />
      <WarningDialog
        isOpen={additionalRiskControlWarningOpen}
        icon={<IoWarning />}
        title="Removing Additional Risk Control"
        message="This action is NOT reversible. Please check before executing this action."
        onDelete={() => {
          const { processId, activityId, hazardId, acIndex } = additionalRiskControlWarningInfo;
          setRaProcesses(prev =>
            prev.map(p =>
              p.id === processId ? {
                ...p,
                activities: p.activities.map(a =>
                  a.id === activityId ? {
                    ...a,
                    hazards: a.hazards.map(hz =>
                      hz.id === hazardId ? {
                        ...hz,
                        additionalRiskControls: (hz.additionalRiskControls || []).filter((_, index) => index !== acIndex),
                        additionalControls: acIndex === 0 && (hz.additionalRiskControls || []).length > 1 
                          ? (hz.additionalRiskControls || [])[1].controlText 
                          : hz.additionalControls
                      } : hz
                    )
                  } : a
                )
              } : p
            )
          );
          setAdditionalRiskControlWarningOpen(false);
          scheduleBatchedUpdate();
        }}
        onClose={() => setAdditionalRiskControlWarningOpen(false)}
      />
    </div>
  );
});

export default Form2;
