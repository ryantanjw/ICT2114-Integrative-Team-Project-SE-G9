import { useState } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd, MdDelete } from "react-icons/md";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import { RiCollapseVerticalFill, RiExpandVerticalLine } from "react-icons/ri";

const hazardTypesList = ["Biological", "Chemicals", "Physical", "Electrical"];

export default function Form2({ sample }) {
  // Build RA processes with nested activities and default hazards
  const initialRaProcesses = (sample?.processes || []).map(proc => ({
    ...proc,
    activities: proc.activities.map(act => ({
      ...act,
      expanded: true,
      hazards: act.hazards && act.hazards.length > 0
        ? act.hazards
        : [
            {
              id: 1,
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
            }
          ],
    }))
  }));
  const [title, setTitle] = useState(sample?.title || "");
  const [division, setDivision] = useState(sample?.division || "");
  const [raProcesses, setRaProcesses] = useState(initialRaProcesses);
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Helper functions to operate on raProcesses (processes with nested activities)
  // All handlers now take processId and activityId as needed
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
  const handleSave = () => {
    console.log("Form2 data:", raProcesses);
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
                        value={act.activityNumber || act.id}
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
                                className={`px-3 py-1 rounded-full  ${
                                  h.type.includes(type)
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
                            onChange={() => {}}
                            disabled
                            className="flex-1"
                          />
                          <InputGroup
                            label="Implementation Person"
                            id={`impl-${h.id}`}
                            value="Hajmath Begum (PO, POD)"
                            onChange={() => {}}
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
        <CTAButton text="Save" onClick={handleSave} className="px-6 py-2" />
      </div>
    </div>
  );
}
