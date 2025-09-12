import React, { useMemo, useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation } from "react-router-dom";
import FormCardC from "../../components/FormCardC.jsx";
import StatusSwitch from "../admin/components/StatusSwitch.jsx";
import TextField from "../admin/components/TextField.jsx";
import TableInfo from "../admin/components/TableInfo.jsx";
import CTAButton from "../../components/CTAButton.jsx";
import { MdDelete } from "react-icons/md";
import { FaSave } from "react-icons/fa";

export default function AdminDB() {
  const location = useLocation();
  const [status, setStatus] = useState("Pending");

    // --- Dummy nested data ---
  const data = useMemo(
  () => ({
    processes: [
      {
        id: "p1",
        name: "Practical lesson and Projects",
        activities: [
          {
            id: "a1",
            name: "Conducting Practical Sessions and Project",
            hazardCategories: [
              {
                id: "hc1",
                name: "Physical",
                hazards: [
                  {
                    id: "h1",
                    name: "Transmission of infectious disease from Symptomatic/Asymptomatic Users.",
                    injuries: [
                      { id: "i1", name: "Infectious disease", existingControls: "1) Mask policy in lab.\n\n2) Hand hygiene facilities available.", additionalControls: "1) Mandatory ART before sessions if community cases are high." },
                      { id: "i2", name: "Organ damage", existingControls: "1) Proper use of PPE.\n\n2) Adherence to BSL-2 protocols.", additionalControls: "1) Supervisor sign-off before handling high-risk biological agents." },
                    ],
                  },
                  {
                    id: "h2",
                    name: "Musculoskeletal strain due to improper lifting of equipment",
                    injuries: [
                      { id: "i3", name: "Back strain", existingControls: "1) Provide lifting aids (trolleys).\n\n2) Team lift for heavy items (>20kg).", additionalControls: "1) Annual refresher on manual handling techniques." }
                    ],
                  },
                ],
              },
              { 
                id: "hc2", 
                name: "Mechanical", 
                hazards: [ 
                  { 
                    id: "h3", 
                    name: "Pinch points on moving parts of lab apparatus", 
                    injuries: [
                      { id: "i4", name: "Crushing injury", existingControls: "1) Machine guarding in place.\n\n2) Emergency stop buttons are accessible.", additionalControls: "1) Visual inspection of guards before each use." }
                    ] 
                  } 
                ] 
              },
              { id: "hc3", name: "Electrical", hazards: [] },
              { id: "hc4", name: "Chemical", hazards: [] },
              { id: "hc5", name: "Psychological", hazards: [] },
            ],
          },
          { 
            id: "a2", 
            name: "Running Western Blot", 
            hazardCategories: [
              {
                id: "hc4",
                name: "Chemical",
                hazards: [
                  {
                    id: "h4",
                    name: "Exposure to Acrylamide/Bis-acrylamide solution",
                    injuries: [
                      { id: "i5", name: "Neurotoxicity", existingControls: "1) Use of pre-cast gels where possible.\n\n2) Work performed in a certified chemical fume hood.", additionalControls: "1) Substitution with less toxic alternatives is reviewed annually." },
                    ],
                  },
                  {
                    id: "h5",
                    name: "Inhalation of Methanol fumes",
                    injuries: [
                      { id: "i6", name: "Poisoning", existingControls: "1) Wear appropriate PPE (nitrile gloves, lab coat, safety goggles).\n\n2) Ensure adequate ventilation.", additionalControls: "1) Keep a methanol-specific spill kit readily available." },
                    ],
                  },
                ],
              },
              {
                id: "hc3",
                name: "Electrical",
                hazards: [
                  {
                    id: "h6",
                    name: "Electrocution from electrophoresis power supply",
                    injuries: [
                      { id: "i7", name: "Electric shock, Burns", existingControls: "1) Power supplies have safety interlocks.\n\n2) Inspect cables for fraying or damage before use.", additionalControls: "1) Annual Portable Appliance Testing (PAT) for all electrical lab equipment." },
                    ],
                  },
                ],
              },
            ] 
          },
          { id: "a3", name: "Experiment setup", hazardCategories: [] },
          { id: "a4", name: "Sample analysis", hazardCategories: [] },
          { 
            id: "a5", 
            name: "Waste disposal", 
            hazardCategories: [
              {
                id: "hc4",
                name: "Chemical",
                hazards: [
                  {
                    id: "h7",
                    name: "Mixing of incompatible chemical waste",
                    injuries: [
                      { id: "i8", name: "Explosion, Toxic Gas Release", existingControls: "1) Clearly labeled, segregated waste containers (e.g., halogenated vs. non-halogenated).\n\n2) Waste disposal chart displayed in the lab.", additionalControls: "1) Implement a digital waste tracking and inventory system." },
                    ],
                  },
                ],
              },
              {
                id: "hc1",
                name: "Physical",
                hazards: [
                  {
                    id: "h8",
                    name: "Puncture from contaminated sharps (needles, glassware)",
                    injuries: [
                      { id: "i9", name: "Cuts, Infection", existingControls: "1) Use of designated sharps containers.\n\n2) Never recap needles.", additionalControls: "1) Mandatory training on proper sharps disposal for all new lab users." },
                    ],
                  },
                ],
              },
            ] 
          },
        ],
      },
      { 
        id: "p2", 
        name: "Field Work", 
        activities: [
          {
            id: "a6",
            name: "Collecting environmental samples",
            hazardCategories: [
              {
                id: "hc1",
                name: "Physical",
                hazards: [
                  {
                    id: "h9",
                    name: "Slips, trips, and falls on uneven or wet terrain",
                    injuries: [
                      { id: "i10", name: "Sprains, Fractures", existingControls: "1) Mandate appropriate, sturdy footwear.\n\n2) Conduct site reconnaissance before work.", additionalControls: "1) Implement a buddy system for all off-campus fieldwork." },
                    ],
                  },
                ],
              },
              {
                id: "hc5",
                name: "Psychological",
                hazards: [
                  {
                    id: "h10",
                    name: "Stress from working alone in remote areas",
                    injuries: [
                      { id: "i11", name: "Anxiety", existingControls: "1) Regular check-in schedule with supervisor via mobile phone.", additionalControls: "1) Provide personal locator beacons (PLBs) for high-risk remote work." },
                    ],
                  },
                ],
              },
            ],
          },
        ] 
      },
      { id: "p3", name: "Office Procedures", activities: [] },
      { 
        id: "p4", 
        name: "Equipment Maintenance", 
        activities: [
          {
            id: "a7",
            name: "Calibrating a high-speed centrifuge",
            hazardCategories: [
              {
                id: "hc2",
                name: "Mechanical",
                hazards: [
                  {
                    id: "h11",
                    name: "Entanglement with rotating parts",
                    injuries: [
                      { id: "i12", name: "Amputation, Severe lacerations", existingControls: "1) Lockout-tagout (LOTO) procedures followed before maintenance.\n\n2) Machine is fully de-energized and tested for zero energy state.", additionalControls: "1) Only OEM-certified technicians are authorized to perform this maintenance." },
                    ],
                  },
                ],
              },
            ],
          },
        ] 
      },
      { id: "p5", name: "Chemical Handling", activities: [] },
      { id: "p6", name: "Miscellaneous", activities: [] },
    ],
  }),
  []
);

    // --- Selection state ---
  const [pIdx, setPIdx] = useState(0);
  const [aIdx, setAIdx] = useState(0);
  const [hcIdx, setHCIdx] = useState(0);
  const [hIdx, setHIdx] = useState(0);
  const [iIdx, setIIdx] = useState(0);

  const [existingControls, setExistingControls] = useState("");
  const [additionalControls, setAdditionalControls] = useState("");

  const processes = data.processes;
  const activities = processes[pIdx]?.activities ?? [];
  const hazCats = activities[aIdx]?.hazardCategories ?? [];
  const hazards = hazCats[hcIdx]?.hazards ?? [];
  const injuries = hazards[hIdx]?.injuries ?? [];

  // For fade/highlight: any item with children gets highlighted
  const activeP = processes.map((p) => (p.activities?.length ? 1 : 0));
  const activeA = activities.map((a) => (a.hazardCategories?.length ? 1 : 0));
  const activeHC = hazCats.map((hc) => (hc.hazards?.length ? 1 : 0));
  const activeH = hazards.map((h) => (h.injuries?.length ? 1 : 0));

  const selectedInjury = injuries[iIdx] || null;

  useEffect(() => {
    setExistingControls(selectedInjury?.existingControls || "");
    setAdditionalControls(selectedInjury?.additionalControls || "");
  }, [selectedInjury]);

  // console.log("Current status:", status);

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden px-5 2xl:px-40 pb-10">
      {/* Header */}
      <HeaderAdmin activePage={location.pathname} />

      {/* Page Title */}
      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          Database Management
        </h3>

      </div>

      <div className="mt-5">
        <StatusSwitch status={status} values={["Pending", "Existing"]} onToggle={setStatus} />
      </div>
      {/* <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 my-6 w-full items-start">
       
      </div> */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
        <TableInfo
          title="Process"
          items={processes.map((p) => p.name)}
          limit={5}
          activeIndices={activeP.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)}
          selectedIndex={pIdx}
          onSelect={(idx) => {
            setPIdx(idx);
            setAIdx(0); setHCIdx(0); setHIdx(0); setIIdx(0);
          }}
          position={1}
        />

        <TableInfo
          title="Activity"
          items={activities.map((a) => a.name)}
          limit={5}
          activeIndices={activeA.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)}
          selectedIndex={aIdx}
          onSelect={(idx) => {
            setAIdx(idx);
            setHCIdx(0); setHIdx(0); setIIdx(0);
          }}
          position={3}
          emptyText="No activities for this process"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-0">
        <TableInfo
          title="Hazard Categories"
          items={hazCats.map((hc) => hc.name)}
          limit={5}
          activeIndices={activeHC.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)}
          selectedIndex={hcIdx}
          onSelect={(idx) => {
            setHCIdx(idx);
            setHIdx(0); setIIdx(0);
          }}
          position={1}
          emptyText="No hazard categories for this activity"
        />

        <TableInfo
          title="Hazard List"
          items={hazards.map((h) => h.name)}
          limit={5}
          activeIndices={activeH.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)}
          selectedIndex={hIdx}
          onSelect={(idx) => {
            setHIdx(idx);
            setIIdx(0);
          }}
          position={3}
          emptyText="No hazards for this category"
        />
      </div>

      <div className="mt-6">
        <TableInfo
          title="Injuries"
          items={injuries.map((i) => i.name)}
          limit={3}
          activeIndices={[]}
          selectedIndex={iIdx}
          onSelect={setIIdx}
          position={4}
          emptyText="No injuries for this hazard"
        />
      </div>

      <div className="mt-6 mb-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <TextField
          header="Existing Risk Controls"
          value={existingControls}
          onChange={setExistingControls}
          fill
        />

        <TextField
          header="Additional Risk Controls"
          value={additionalControls}
          onChange={setAdditionalControls}
          fill
        />
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <CTAButton icon={FaSave} text="Save Entry" onClick={() => console.log("Save clicked")} />
        <CTAButton icon={MdDelete} text="Delete Entry" onClick={() => console.log("Delete clicked")} />
      </div>

    </div>
    
  );
}
