import { useState } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdDelete } from "react-icons/md";

export default function Form1({ sample }) {
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
  const [title, setTitle] = useState(sample?.title || "");
  const [division, setDivision] = useState(sample?.division || "");

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

  // Save handler
  const handleSave = () => {
    console.log("Form1 data:", { title, division, processes });
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
            <option key={i+1} value={i+1}>{i+1}</option>
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
        <CTAButton text="Save" onClick={handleSave} className="px-6 py-2" />
      </div>
    </div>
  );
}
