import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd, MdDelete } from "react-icons/md";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { RiCollapseVerticalFill, RiExpandVerticalLine } from "react-icons/ri";

const Form2 = forwardRef(({ sample, sessionData, updateFormData, formData }, ref) => {
  // Build RA processes with nested activities and default hazards
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

  // Helper function to update both state and ref
  const updateFormId = (id) => {
    console.log('Updating formId to:', id);
    setFormId(id);
    formIdRef.current = id; // This is immediately available
  };

  // Function to properly initialize hazards data structure
  const initializeHazards = (hazards) => {
    if (!hazards || hazards.length === 0) {
      return [{
        id: Date.now(),
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
    
    // Make sure all required fields exist
    return hazards.map(hazard => ({
      id: hazard.id || hazard.hazard_id || Date.now(),
      hazard_id: hazard.hazard_id || hazard.id,
      description: hazard.description || "",
      type: hazard.type || [],
      injuries: hazard.injuries || [],
      existingControls: hazard.existingControls || "",
      additionalControls: hazard.additionalControls || "",
      severity: hazard.severity || 1,
      likelihood: hazard.likelihood || 1,
      rpn: hazard.rpn || 1,
      newInjury: "",
      newType: "",
      showTypeInput: false,
      showInjuryInput: false,
    }));
  };

  // Initialize data from either formData prop or directly from API
  useEffect(() => {
    const initializeFormData = () => {
      // If we have formData passed from parent, use that
      if (formData && Object.keys(formData).length > 0) {
        console.log('Initializing from formData prop:', formData);
        
        setTitle(formData.title || "");
        setDivision(formData.division || "");
        
        if (formData.form_id) {
          updateFormId(formData.form_id);
        }
        
        // Only process the processes if we have them
        if (formData.processes && formData.processes.length > 0) {
          const processesWithHazards = formData.processes.map(proc => ({
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
        }
        
        setDataLoaded(true);
        return true;
      }
      
      return false;
    };
    
    // Try to initialize from props first
    const initialized = initializeFormData();
    
    // If not initialized from props and we have a form ID in session, fetch from API
    if (!initialized && sessionData?.current_form_id && !dataLoaded) {
      fetchFormData(sessionData.current_form_id);
    }
  }, [formData, sessionData, dataLoaded]);

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

  // Fetch form data from API
  const fetchFormData = useCallback(async (id) => {
    if (!id) {
      console.log('No form ID provided, skipping data fetch');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Fetching form data for ID: ${id}`);
      
      const response = await fetch(`/api/user/get_form2_data/${id}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Form2 data loaded:', data);

        setTitle(data.title || "");
        setDivision(data.division || "");
        
        // Process and initialize the processes with proper hazard structure
        if (data.processes && data.processes.length > 0) {
          const processesWithHazards = data.processes.map(proc => ({
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
        }
        
        updateFormId(data.form_id);
        
        // Also set hazard types list if it's included
        if (data.hazardTypesList) {
          setHazardTypesList(data.hazardTypesList);
        }

        // Also store form ID in session
        await storeFormIdInSession(data.form_id);
        
        setDataLoaded(true);
      } else {
        console.error('Failed to fetch form data');
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeFormIdInSession]);

  // Fetch hazard types list separately
  useEffect(() => {
    const fetchHazardTypes = async () => {
      try {
        const response = await fetch('/api/user/hazard_types');
        if (response.ok) {
          const data = await response.json();
          setHazardTypesList(data.hazard_types?.map(ht => ht.type) || []);
        }
      } catch (error) {
        console.error('Error fetching hazard types:', error);
      }
    };

    fetchHazardTypes();
  }, []);

  // Update parent's form data when our local state changes
  useEffect(() => {
    if (updateFormData && dataLoaded) {
      const updatedFormData = {
        form_id: formId,
        title,
        division,
        processes: raProcesses
      };
      
      updateFormData(updatedFormData);
    }
  }, [title, division, raProcesses, formId, updateFormData, dataLoaded]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    saveForm: handleSave,
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
    })
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
  };

  const addHazard = (processId, activityId) => {
    setRaProcesses(
      raProcesses.map(proc =>
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
                      id: Date.now(),
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
  };

  const handleConfirmNewType = (processId, activityId, hazardId) => {
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
                        type: [h.newType],
                        newType: "",
                        showTypeInput: false,
                        injuries: [],
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
  };

  const handleConfirmNewInjury = (processId, activityId, hazardId) => {
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
  };

  const toggleHazardType = (processId, activityId, hazardId, type) => {
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
                    h.id === hazardId ? { ...h, type: [type] } : h
                  ),
                }
                : a
            ),
          }
          : proc
      )
    );
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
  };

  const toggleExpandAll = () => {
    setRaProcesses(
      raProcesses.map(proc => ({
        ...proc,
        activities: proc.activities.map(a => ({ ...a, expanded: allCollapsed }))
      }))
    );
    setAllCollapsed(!allCollapsed);
  };

  // Save handler  
  const handleSave = async () => {
    if (isLoading) return false; // Prevent saving while already saving

    setIsLoading(true);

    const currentFormId = formIdRef.current;

    console.log("Form2 data:", { formId: currentFormId, title, division, processes: raProcesses });

    try {
      const requestBody = {
        title,
        division,
        processes: raProcesses,
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

        // Show success message
        if (result.action === 'created') {
          console.log('New form created with ID:', result.form_id);
        } else {
          console.log('Form updated successfully');
        }
        setIsLoading(false);
        return true; // Indicate success
      } else {
        console.log('Error:', response.statusText);
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
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <InputGroup
            label="Division"
            id="form2-division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
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
              onClick={() => { /* generate for this processId */ }}
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
                  <CTAButton
                    icon={<MdDelete />}
                    text="Remove"
                    onClick={() => removeActivity(proc.id, act.id)}
                    className="text-black"
                  />
                </div>
                {act.expanded && (
                  <div className="p-4 space-y-4 bg-white rounded-b">
                    {/* Activity Number */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Activity Number</label>
                      <select
                        value={act.activityNumber || idx + 1}
                        onChange={(e) =>
                          updateActivityField(proc.id, act.id, "activityNumber", parseInt(e.target.value))
                        }
                        className="border border-gray-300 rounded px-2 py-1"
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
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
                          />
                          <InputGroup
                            label="Implementation Person"
                            id={`impl-${h.id}`}
                            value="Hajmath Begum (PO, POD)"
                            onChange={() => { }}
                            disabled
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
          onClick={handleSave}
          className="px-6 py-2"
          disabled={isLoading}
        />
      </div>
    </div>
  );
});

export default Form2;