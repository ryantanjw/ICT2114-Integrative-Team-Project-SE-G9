import React, { useMemo, useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import FormCardC from "../../components/FormCardC.jsx";
import StatusSwitch from "./components/StatusSwitch.jsx";
import TextField from "./components/TextField.jsx";
import TableInfo from "./components/TableInfo.jsx";
import CTAButton from "../../components/CTAButton.jsx";
import { MdDelete } from "react-icons/md";
import { FaSave } from "react-icons/fa";
import axios from "axios";

export default function AdminDB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDBPage, setIsLoadingDBPage] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [approvedHazards, setApprovedHazards] = useState([]);
  const [status, setStatus] = useState("Pending");
  // Toggle data source at code level: "API" or "Placeholder"
  const DATA_SOURCE = "API"; // change to "Placeholder" to use nested demo

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

  let processes = data.processes;
  let activities = processes[pIdx]?.activities ?? [];
  let hazCats = activities[aIdx]?.hazardCategories ?? [];
  let hazardsList = hazCats[hcIdx]?.hazards ?? [];
  let injuries = hazardsList[hIdx]?.injuries ?? [];

  // For fade/highlight: any item with children gets highlighted
  let activeP = processes.map((p) => (p.activities?.length ? 1 : 0));
  let activeA = activities.map((a) => (a.hazardCategories?.length ? 1 : 0));
  let activeHC = hazCats.map((hc) => (hc.hazards?.length ? 1 : 0));
  let activeH = hazardsList.map((h) => (h.injuries?.length ? 1 : 0));

  let selectedInjury = injuries[iIdx] || null;

  useEffect(() => {
    setExistingControls(selectedInjury?.existingControls || "");
    setAdditionalControls(selectedInjury?.additionalControls || "");
  }, [selectedInjury]);

  // Session handling + methods (moved from AdminDBPage_Old.jsx)
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking admin session...");
        setIsLoading(true);

        const response = await axios.get("/api/check_session", {
          withCredentials: true,
        });

        console.log("Session check response:", response.data);

        // If not logged in, redirect to login page
        if (!response.data.logged_in) {
          console.log("No active session found, redirecting to login");
          navigate("/auth/login");
          return false;
        }

        // If user is not an admin, redirect to user dashboard
        if (response.data.user_role !== 0) {
          console.log("Non-admin user detected, redirecting to user dashboard");
          navigate("/home");
          return false;
        }

        // Store admin data for display
        setAdminData(response.data);
        return true;
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        navigate("/auth/login");
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHazards = async () => {
      try {
        const res = await axios.get("/api/admin/get_new_hazard");
        const list = res.data?.hazards || [];

        if (Array.isArray(list) && list.length > 0) {
          setHazards(list);

          console.log("[API] /api/admin/get_new_hazard → count:", list.length);
          console.log("[API] sample item structure:", list[0]);

          const getPair = (val) => Array.isArray(val) ? { text: val[0], state: val[1] } : { text: val, state: "" };

          // Detailed line-by-line printout
          list.forEach((item, i) => {
            const hz = getPair(item.hazard);
            const rc = getPair(item.existing_risk_control);
            console.log(
              `[#${i}] HAZARD: "${hz.text}" [${hz.state}]  |  RISK_CONTROL: "${rc.text}" [${rc.state}]`,
            );
          });

          // Summary counts by status ("new" vs "old")
          const isNew = (x) => Array.isArray(x) && x[1] === "new";
          const isOld = (x) => Array.isArray(x) && x[1] === "old";

          const pendingItems = list.filter((it) => isNew(it.hazard) || isNew(it.existing_risk_control));
          const existingItems = list.filter((it) => isOld(it.hazard) && isOld(it.existing_risk_control));

          console.log(`[SUMMARY] pending(new) items: ${pendingItems.length}`);
          console.log(`[SUMMARY] existing(old) items: ${existingItems.length}`);
        } else {
          setHazards([]);
          console.log("[API] /api/admin/get_new_hazard → empty list");
        }
      } catch (err) {
        console.error("Error fetching hazards", err);
      }
    };

    // Helper to normalize approved hazard API payload
    const normalizeApproved = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map((it) => ({
        ...it,
        // approved API returns plain strings/lists; convert to the shapes our builder expects
        hazard: typeof it.hazard === "string" ? it.hazard : String(it.hazard ?? ""),
        existing_risk_control: Array.isArray(it.existing_risk_control)
          ? it.existing_risk_control.join(" && ")
          : (it.existing_risk_control ?? ""),
        injury: Array.isArray(it.injury) ? it.injury.join(" && ") : (it.injury ?? ""),
        work_activity: typeof it.work_activity === "string" ? it.work_activity : String(it.work_activity ?? ""),
        hazard_type: typeof it.hazard_type === "string" ? it.hazard_type : String(it.hazard_type ?? ""),
      }));
    };

    const fetchApprovedHazards = async () => {
      try {
        const res = await axios.get("/api/admin/get_approved_hazard");
        const list = res.data?.hazards || [];
        setApprovedHazards(normalizeApproved(list));
        console.log("[API] /api/admin/get_approved_hazard → count:", list.length);
      } catch (err) {
        console.error("Error fetching approved hazards", err);
      }
    };

    const init = async () => {
      const ok = await checkSession();
      if (ok && DATA_SOURCE === "API") {
        await fetchHazards();
        await fetchApprovedHazards();
      }
      setIsLoadingDBPage(false); // Stop fullscreen loading
    };

    init();
  }, [navigate]);

  // console.log("Current status:", status);

  // --- Helpers & derived lists for API mode ---
  const parsePair = (val) => (Array.isArray(val) ? { text: val[0], state: val[1] } : { text: String(val ?? ""), state: "" });
  // Pending tab shows ALL unapproved hazards (both "Distinctive" and "Similar")
  const apiPendingAll = hazards;
  // Existing tab shows APPROVED hazards from dedicated endpoint
  const apiExistingApproved = approvedHazards;
  const apiList = status === "Pending" ? apiPendingAll : apiExistingApproved;


  // Build tree matching the placeholder shape from flat API items
  const buildTreeFromAPI = (items) => {
    const procs = new Map();
    items.forEach((it, idx) => {
      const proc = it.process || "Unspecified Process";
      const act = it.work_activity || "Unspecified Activity";
      const cat = it.hazard_type || (it.hazard_type_id != null ? String(it.hazard_type_id) : "Other");
      const hazPair = parsePair(it.hazard);
      const rcPair = parsePair(it.existing_risk_control);
      const hz = hazPair.text || "(Unnamed Hazard)";
      const inj = it.injury || "—";
      const existingRC = rcPair.text || "";
      const additionalRC = it.additional_risk_control || "";

      if (!procs.has(proc)) procs.set(proc, { id: `p_${proc}`, name: proc, activities: [] });
      const p = procs.get(proc);

      let a = p.activities.find((x) => x.name === act);
      if (!a) {
        a = { id: `a_${proc}_${act}`, name: act, hazardCategories: [] };
        p.activities.push(a);
      }

      let hc = a.hazardCategories.find((x) => x.name === cat);
      if (!hc) {
        hc = { id: `hc_${proc}_${act}_${cat}`, name: cat, hazards: [] };
        a.hazardCategories.push(hc);
      }

      let h = hc.hazards.find((x) => x.name === hz);
      if (!h) {
        h = { id: `h_${proc}_${act}_${cat}_${idx}`, name: hz, injuries: [], isNew: hazPair.state === "new" };
        // propagate hazard_id from backend
        h.hazard_id = it.hazard_id;
        hc.hazards.push(h);
      } else {
        // if hazard already exists, preserve any previous flag or set to true if any item marks it as new
        h.isNew = Boolean(h.isNew || (hazPair.state === "new"));
        // update hazard_id if not already set
        if (h.hazard_id == null && it.hazard_id != null) h.hazard_id = it.hazard_id;
      }

      h.injuries.push({
        id: `i_${it.hazard_activity_id}_${it.hazard_id}_${h.injuries.length}`,
        name: inj,
        existingControls: existingRC,
        additionalControls: additionalRC,
        rcIsNew: rcPair.state === "new",
        hazard_id: it.hazard_id,
      });
    });
    return { processes: Array.from(procs.values()) };
  };

  const apiTree = useMemo(() => buildTreeFromAPI(apiList), [apiList]);

  // If using API, override the base collections so the existing tables render the live data
  if (DATA_SOURCE === "API") {
    processes = apiTree.processes;
    activities = processes[pIdx]?.activities ?? [];
    hazCats = activities[aIdx]?.hazardCategories ?? [];
    hazardsList = hazCats[hcIdx]?.hazards ?? [];
    injuries = hazardsList[hIdx]?.injuries ?? [];

    activeP = processes.map((p) => (p.activities?.length ? 1 : 0));
    activeA = activities.map((a) => (a.hazardCategories?.length ? 1 : 0));
    activeHC = hazCats.map((hc) => (hc.hazards?.length ? 1 : 0));
    activeH = hazardsList.map((h) => (h.injuries?.length ? 1 : 0));

    selectedInjury = injuries[iIdx] || null;
  }

  // --- Date formatter helper for API cards ---
  const fmtDateTime = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
  };

  if (isLoadingDBPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-lg font-medium text-gray-700">Fetching data…</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden px-5 2xl:px-40 pb-10">
      <Toaster position="top-right" />
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
          items={hazardsList.map((h) => (
            DATA_SOURCE === "API"
              ? (
                <div className="flex items-center justify-between">
                  <span className={
                    "mr-2 px-2 py-0.5 text font-medium rounded-full border " +
                    (h.isNew
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-gray-100 text-gray-700 border-gray-300")
                  }>
                    {h.isNew ? "Distinctive" : "Similar"}
                  </span>
                  <span className="truncate">{h.name}</span>
                </div>
              )
              : h.name
          ))}
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
          items={injuries.map((i) => (
            DATA_SOURCE === "API"
              ? (
                <div className="flex items-center justify-between">
                  <span className={
                    "mr-2 px-2 py-0.5 text font-medium rounded-full border " +
                    (i.rcIsNew
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-gray-100 text-gray-700 border-gray-300")
                  }>
                    {i.rcIsNew ? "Distinctive" : "Similar"}
                  </span>
                  <span className="truncate">{i.name}</span>
                </div>
              )
              : i.name
          ))}
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
      {/* --- Hazard approval/rejection controls --- */}
      {(() => {
        // More robust computation of selectedHazardId
        const selectedHazardId =
          hazardsList?.[hIdx]?.hazard_id ??
          injuries?.[iIdx]?.hazard_id ??
          null;

        // Approve handler with event, toast.promise, optimistic update, and headers
        async function handleApprove(e) {
          e?.preventDefault && e.preventDefault();
          e?.stopPropagation && e.stopPropagation();
          if (!selectedHazardId) {
            toast.error("No hazard selected to approve");
            return;
          }
          await toast.promise(
            axios.post(
              "/api/admin/approve_hazard",
              { hazard_id: selectedHazardId },
              {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
              }
            ),
            {
              loading: "Approving hazard...",
              success: "Hazard approved successfully!",
              error: "Failed to approve hazard",
            }
          ).then((res) => {
            // Optimistically remove the approved hazard from state
            setHazards((prev) => {
              const filtered = prev.filter((hz) => hz.hazard_id !== selectedHazardId);
              // Recompute indices safely (reset if out of bounds)
              if (filtered.length === 0) {
                setPIdx(0); setAIdx(0); setHCIdx(0); setHIdx(0); setIIdx(0);
              } else {
                setPIdx((idx) => Math.min(idx, Math.max(0, filtered.length - 1)));
                setAIdx(0); setHCIdx(0); setHIdx(0); setIIdx(0);
              }
              return filtered;
            });
          });
        }

        // Reject handler with event, toast.promise, optimistic update, and headers
        async function handleReject(e) {
          e?.preventDefault && e.preventDefault();
          e?.stopPropagation && e.stopPropagation();
          if (!selectedHazardId) {
            toast.error("No hazard selected to reject");
            return;
          }
          await toast.promise(
            axios.post(
              "/api/admin/reject_hazard",
              { hazard_id: selectedHazardId },
              {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
              }
            ),
            {
              loading: "Rejecting hazard...",
              success: "Hazard rejected successfully!",
              error: "Failed to reject hazard",
            }
          ).then((res) => {
            // Optimistically remove the rejected hazard from state
            setHazards((prev) => {
              const filtered = prev.filter((hz) => hz.hazard_id !== selectedHazardId);
              // Recompute indices safely (reset if out of bounds)
              if (filtered.length === 0) {
                setPIdx(0); setAIdx(0); setHCIdx(0); setHIdx(0); setIIdx(0);
              } else {
                setPIdx((idx) => Math.min(idx, Math.max(0, filtered.length - 1)));
                setAIdx(0); setHCIdx(0); setHIdx(0); setIIdx(0);
              }
              return filtered;
            });
          });
        }

        return (
          <div className="mt-6 flex justify-end gap-4">
            <CTAButton
              icon={FaSave}
              text="Save Entry"
              onClick={(e) => handleApprove(e)}
            />
            <CTAButton
              icon={MdDelete}
              text="Delete Entry"
              onClick={(e) => handleReject(e)}
            />
          </div>
        );
      })()}



    </div>
  );
}
  