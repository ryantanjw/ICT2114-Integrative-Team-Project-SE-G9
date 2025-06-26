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
  
  const handleSave = async () => {
    //Get the sessionData here
    console.log('session data:', sessionData);
  
    if (isLoading) return false; // Prevent saving while already saving
  
    setIsLoading(true);
  
    const currentFormId = formIdRef.current;
  
    console.log("Form1 data:", { formId: currentFormId, title, division, processes });
  
    try {
      const requestBody = { title, division, processes, userId: sessionData.user_id };
  
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