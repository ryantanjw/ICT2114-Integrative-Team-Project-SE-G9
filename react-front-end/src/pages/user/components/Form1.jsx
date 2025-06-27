import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdDelete } from "react-icons/md";

// Convert to forwardRef to expose methods to parent
const Form1 = forwardRef(({ sample, sessionData, updateFormData, formData }, ref) => {
  const [processes, setProcesses] = useState(
    sample?.processes || [
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
  const [formId, setFormId] = useState(null);
  const [title, setTitle] = useState(sample?.title || "");
  const [division, setDivision] = useState(sample?.division || "");
  const [isLoading, setIsLoading] = useState(false);
  const formIdRef = useRef(null);

  // Update parent's form data when our local state changes
  useEffect(() => {
    if (updateFormData) {
      updateFormData({
        title,
        division,
        processes,
        form_id: formId
      });
    }
  }, [title, division, processes, formId, updateFormData]);

  // Expose the saveForm method to parent component
  useImperativeHandle(ref, () => ({
    saveForm: handleSave
  }));

  const addProcess = () => {
    setProcesses([
      ...processes,
      {
        id: processes.length + 1,
        processNumber: processes.length + 1,
        location: "",
        activities: [{ id: 1, description: "", remarks: "" }],
        header: ``,
        headerColor: "#EEF1F4",
      }
    ]);
  };

  const removeProcess = (id) => {
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
            id: p.activities.length + 1,
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

  // Helper function to update both state and ref
  const updateFormId = (id) => {
    console.log('Updating formId to:', id);
    setFormId(id);
    formIdRef.current = id; // This is immediately available
  };
  
  const showSuccessMessage = (message) => {
    console.log('Success', message);
  };

  const showErrorMessage = (message) => {
    console.log('Error', message);
  };

  const mapDataForBackend = () => {
  return processes.map(proc => ({
    // Map your frontend structure to backend structure
    process_id: proc.process_id, // Will be undefined for new processes
    process_number: proc.processNumber,
    process_title: proc.header,
    process_location: proc.location,
    activities: proc.activities.map(act => ({
      activity_id: act.activity_id, // Will be undefined for new activities
      work_activity: act.description,
      activity_number: act.id, // or you might want a separate numbering
      remarks: act.remarks // You might need to add this field to your Activity model
    }))
  }));
};

  const handleSave = async () => {
    //Get the sessionData here
    console.log('session data:', sessionData);
  
    if (isLoading) return false; // Prevent saving while already saving
  
    setIsLoading(true);
  
    const currentFormId = formIdRef.current;
  
    console.log("Form1 data:", { formId: currentFormId, title, division, processes });
  
    try {
      const requestBody = { title, 
                            division, 
                            userId: sessionData.user_id 
      };
  
      if (currentFormId) {
        requestBody.form_id = currentFormId;
        console.log('Including form_id in request:', currentFormId);
      } else {
        console.log('No Form ID, creating new form');
      }
  
      const response = await fetch('/api/user/form1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Form save failed: ${response.statusText}`);
    }

      const formResult = await response.json();
      console.log('Form save success:', formResult);
      
      let formId = formResult.form_id;
      
      // Update form ID if new form
      if (formResult.action === 'created') {
        updateFormId(formId);
        await storeFormIdInSession(formId);
        console.log('New form created with ID:', formId);
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
              activity_number: activity.id || (j + 1),
              work_activity: activity.description,
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
      }
        updateProcessesWithSavedIds(savedProcesses);

    }
    
    setIsLoading(false);
    console.log('All data saved successfully');
    
    showSuccessMessage('Form saved successfully!');
    
    return true; 
    
  } catch (error) {
    console.error('Save operation failed:', error);
    setIsLoading(false);
    
    showErrorMessage(`Save failed: ${error.message}`);
    
    return false; 
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
  
  // Add this helper function to store form_id in session
  const storeFormIdInSession = async (form_id) => {
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
            {/* Rest of your component... */}
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
                  <h5 className="font-medium">Work Activity {act.id}</h5>
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
                  value={act.remarks}
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