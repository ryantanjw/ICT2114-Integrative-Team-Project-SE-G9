

import { useState } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd, MdDelete } from "react-icons/md";

export default function Form3({ sample }) {
  // Initialize simple fields, falling back to sample if provided
  const [referenceNumber, setReferenceNumber] = useState(sample?.referenceNumber || "");
  const [division, setDivision] = useState(sample?.division || "");
  const [title, setTitle] = useState(sample?.title || "");
  const [location, setLocation] = useState(sample?.location || "");
  const [lastReviewDate, setLastReviewDate] = useState(sample?.lastReviewDate || "");
  const [nextReviewDate, setNextReviewDate] = useState(sample?.nextReviewDate || "");
  const [raLeader, setRaLeader] = useState(sample?.raLeader || "");
  // Dynamic RA Team list
  const [raTeam, setRaTeam] = useState(sample?.raTeam || [""]);

  // Handlers for RA Team
  const addTeamMember = () => setRaTeam([...raTeam, ""]);
  const removeTeamMember = (idx) => {
    if (raTeam.length <= 1) return;
    setRaTeam(raTeam.filter((_, i) => i !== idx));
  };
  const updateTeamMember = (idx, val) =>
    setRaTeam(raTeam.map((m, i) => (i === idx ? val : m)));

  // Simple fields for approval
  const [approvedBy, setApprovedBy] = useState(sample?.approvedBy || "");
  const [signature, setSignature] = useState(sample?.signature || "");
  const [designation, setDesignation] = useState(sample?.designation || "");
  const [approvalDate, setApprovalDate] = useState(sample?.approvalDate || "");

  const handleSave = () => {
    // TODO: collect and submit Form3 data
    console.log("Form3 data:", {
      referenceNumber,
      division,
      title,
      location,
      lastReviewDate,
      nextReviewDate,
      raLeader,
      raTeam,
      approvedBy,
      signature,
      designation,
      approvalDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <InputGroup
          label="Reference Number"
          id="ref-number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
        <InputGroup
          label="Division"
          id="form3-division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
        />
        <InputGroup
          label="Title"
          id="form3-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <InputGroup
          label="Location"
          id="form3-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <InputGroup
          label="Last Review Date"
          id="last-review"
          type="date"
          value={lastReviewDate}
          onChange={(e) => setLastReviewDate(e.target.value)}
        />
        <InputGroup
          label="Next Review Date"
          id="next-review"
          type="date"
          value={nextReviewDate}
          onChange={(e) => setNextReviewDate(e.target.value)}
        />
        <InputGroup
          label="RA Leader"
          id="ra-leader"
          value={raLeader}
          onChange={(e) => setRaLeader(e.target.value)}
        />
      </div>

      {/* RA Team */}
      <div className="space-y-2">
        <label className="block mb-1 text-sm text-gray-600">RA Team</label>
        {raTeam.map((member, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <InputGroup
              label=""
              id={`ra-team-${idx}`}
              placeholder={`Team member ${idx + 1}`}
              value={member}
              onChange={(e) => updateTeamMember(idx, e.target.value)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeTeamMember(idx)}
              disabled={raTeam.length === 1}
              className={`bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center ${
                raTeam.length === 1 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <MdDelete />
            </button>
            <button
              type="button"
              onClick={addTeamMember}
              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
            >
              <MdAdd />
            </button>
          </div>
        ))}
      </div>

      {/* Approval row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <InputGroup
          label="Approved by"
          id="approved-by"
          value={approvedBy}
          onChange={(e) => setApprovedBy(e.target.value)}
        />
        <InputGroup
          label="Signature"
          id="signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
        <InputGroup
          label="Designation"
          id="designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
        <InputGroup
          label="Date"
          id="approval-date"
          type="date"
          value={approvalDate}
          onChange={(e) => setApprovalDate(e.target.value)}
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-4">
        <CTAButton text="Save" onClick={handleSave} className="px-6 py-2" />
      </div>
    </div>
  );
}