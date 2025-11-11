import React, { useMemo, useState, useEffect, useRef } from "react";
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


// --- Lightweight client cache (localStorage) ---
const HAZARD_CACHE_KEYS = {
  pending: "admin_pending_hazards_v1",
  approved: "admin_approved_hazards_v1",
};
const HAZARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { ts, data } = parsed;
    if (!ts || Date.now() - ts > HAZARD_CACHE_TTL_MS) return null; // stale
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore quota errors
  }
}

function clearCache(key) {
  try { localStorage.removeItem(key); } catch {}
}


export default function AdminDB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDBPage, setIsLoadingDBPage] = useState(true);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [status, setStatus] = useState("Pending");
  // Toggle data source at code level: "API" or "Placeholder"
  const DATA_SOURCE = "API"; // change to "Placeholder" to use nested demo

    // --- Dummy nested data ---
  // --- API hazard state ---
  const [hazards, setHazards] = useState([]);           // pending/unapproved
  const [approvedHazards, setApprovedHazards] = useState([]); // approved
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

  // API: Normalize approved hazards for consistent display
  const normalizeApproved = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((it) => ({
      ...it,
      hazard: typeof it.hazard === "string" ? it.hazard : String(it.hazard ?? ""),
      existing_risk_control: Array.isArray(it.existing_risk_control)
        ? it.existing_risk_control.join("\n\n")
        : (it.existing_risk_control ?? ""),
      injury: Array.isArray(it.injury) ? it.injury.join(" && ") : (it.injury ?? ""),
      work_activity: typeof it.work_activity === "string" ? it.work_activity : String(it.work_activity ?? ""),
      hazard_type: typeof it.hazard_type === "string" ? it.hazard_type : String(it.hazard_type ?? ""),
    }));
  };

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
          clearCache(HAZARD_CACHE_KEYS.pending);
          clearCache(HAZARD_CACHE_KEYS.approved);
          navigate("/auth/login");
          return false;
        }

        // If user is not an admin, redirect to user dashboard
        if (response.data.user_role !== 0) {
          console.log("Non-admin user detected, redirecting to user dashboard");
          clearCache(HAZARD_CACHE_KEYS.pending);
          clearCache(HAZARD_CACHE_KEYS.approved);
          navigate("/home");
          return false;
        }

        // Store admin data for display
        setAdminData(response.data);
        return true;
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        clearCache(HAZARD_CACHE_KEYS.pending);
        clearCache(HAZARD_CACHE_KEYS.approved);
        navigate("/auth/login");
        return false;
      } finally {
        setIsLoading(false);
      }
    };

    const init = async () => {
      const ok = await checkSession();

      // 1) Try cache hydration first for instant UI
      let hadCache = false;
      if (ok && DATA_SOURCE === "API") {
        const cachedPending = loadCache(HAZARD_CACHE_KEYS.pending);
        const cachedApproved = loadCache(HAZARD_CACHE_KEYS.approved);
        if (cachedPending) { setHazards(cachedPending); hadCache = true; }
        if (cachedApproved) { setApprovedHazards(cachedApproved); hadCache = true; }
        if (hadCache) {
          setHydratedFromCache(true);
          setIsLoadingDBPage(false); // hide overlay immediately when we have cache
        }
      }

      // 2) Kick off network refresh in the background (don’t block UI)
      if (ok && DATA_SOURCE === "API") {
        (async () => {
          try {
            const [pending, approved] = await Promise.all([
              axios.get("/api/admin/get_new_hazard", { withCredentials: true }).then(r => r.data?.hazards || []),
              axios.get("/api/admin/get_approved_hazard", { withCredentials: true }).then(r => normalizeApproved(r.data?.hazards || [])),
            ]);
            setHazards(pending);
            setApprovedHazards(approved);
            saveCache(HAZARD_CACHE_KEYS.pending, pending);
            saveCache(HAZARD_CACHE_KEYS.approved, approved);
          } catch (err) {
            console.error("Error fetching hazards:", err);
            if (!hadCache) toast.error("Failed to load hazards");
          } finally {
            if (!hadCache) setIsLoadingDBPage(false); // only toggle here if we didn’t already hide it via cache
          }
        })();
      } else {
        // Not OK or not API mode
        setIsLoadingDBPage(false);
      }
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
      const actPairLocal = parsePair(it.work_activity);
      const act = actPairLocal.text || "Unspecified Activity";
      const cat = it.hazard_type || (it.hazard_type_id != null ? String(it.hazard_type_id) : "Other");
      const hazPair = parsePair(it.hazard);
      // Build a list of existing risk controls; support alternating [text, state] arrays and '&&' delimiters
      let existingRCList = [];
      let rcHasNew = false;
      if (Array.isArray(it.existing_risk_control)) {
        for (let k = 0; k < it.existing_risk_control.length; k += 2) {
          const part = it.existing_risk_control[k];
          const state = it.existing_risk_control[k + 1];
          if (state === "new") rcHasNew = true;
          if (!part) continue;
          String(part)
            .split("&&")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((s) => existingRCList.push(s));
        }
      } else if (typeof it.existing_risk_control === "string") {
        existingRCList = String(it.existing_risk_control)
          .split("&&")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const hz = hazPair.text || "(Unnamed Hazard)";
      // Build a list of injury strings; split on '&&' to create multiple entries
      let injuryList = [];
      if (Array.isArray(it.injury)) {
        // Backend sometimes sends alternating [text, state, text, state, ...]
        for (let k = 0; k < it.injury.length; k += 2) {
          const part = it.injury[k];
          if (!part) continue;
          String(part)
            .split("&&")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((s) => injuryList.push(s));
        }
      } else if (typeof it.injury === "string") {
        injuryList = String(it.injury)
          .split("&&")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (injuryList.length === 0) injuryList = ["—"]; // fallback when no text
      const existingRC = existingRCList.length ? existingRCList.join("\n\n") : "";
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

      injuryList.forEach((injName, injIdx) => {
        h.injuries.push({
          id: `i_${it.hazard_activity_id}_${it.hazard_id}_${injIdx}`,
          name: injName,
          existingControls: existingRC,
          additionalControls: additionalRC,
          rcIsNew: rcHasNew,
          hazard_id: it.hazard_id,
        });
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

  // Re-sync form fields whenever the highlighted injury changes (after API overrides)
  const selectedInjuryKey = selectedInjury?.id || "none";
  useEffect(() => {
    setExistingControls(selectedInjury?.existingControls || "");
    setAdditionalControls(selectedInjury?.additionalControls || "");
  }, [selectedInjuryKey]);

  // --- Approve/Reject handlers for API hazards ---
  // Selected hazard id recomputed each render
  const selectedHazardId = hazardsList?.[hIdx]?.hazard_id ?? injuries?.[iIdx]?.hazard_id ?? null;

  async function handleApprove(e) {
    e?.preventDefault && e.preventDefault();
    e?.stopPropagation && e.stopPropagation();
    if (!selectedHazardId) { toast.error("No hazard selected to approve"); return; }
    await toast.promise(
      axios.post("/api/admin/approve_hazard", { hazard_id: selectedHazardId }, { headers: { "Content-Type": "application/json" }, withCredentials: true })
        .then(async () => {
          // Optimistically remove from pending
          setHazards((prev) => prev.filter((h) => h.hazard_id !== selectedHazardId));
          // Keep cache in sync for Pending
          saveCache(HAZARD_CACHE_KEYS.pending, (loadCache(HAZARD_CACHE_KEYS.pending) || []).filter((h) => h.hazard_id !== selectedHazardId));
          // Refresh approved list so it appears in Existing immediately (Option A)
          try {
            const approved = await axios.get("/api/admin/get_approved_hazard", { withCredentials: true });
            setApprovedHazards(normalizeApproved(approved.data?.hazards || []));
            saveCache(HAZARD_CACHE_KEYS.approved, normalizeApproved(approved.data?.hazards || []));
          } catch (err) {
            console.error("Error refreshing approved hazards after approval", err);
          }
        })
        ,
      { loading: "Approving hazard...", success: "Hazard approved successfully!", error: "Failed to approve hazard" }
    );
    setIIdx(0); setHIdx(0); setHCIdx(0);
  }

  async function handleReject(e) {
    e?.preventDefault && e.preventDefault();
    e?.stopPropagation && e.stopPropagation();
    if (!selectedHazardId) { toast.error("No hazard selected to reject"); return; }
    await toast.promise(
      axios.post("/api/admin/reject_hazard", { hazard_id: selectedHazardId }, { headers: { "Content-Type": "application/json" }, withCredentials: true })
        .then(() => {
          // Optimistically remove from pending
          setHazards((prev) => prev.filter((h) => h.hazard_id !== selectedHazardId));
          // Keep cache in sync for Pending after rejection
          saveCache(HAZARD_CACHE_KEYS.pending, (loadCache(HAZARD_CACHE_KEYS.pending) || []).filter((h) => h.hazard_id !== selectedHazardId));
        })
        ,
      { loading: "Rejecting hazard...", success: "Hazard rejected successfully!", error: "Failed to reject hazard" }
    );
    setIIdx(0); setHIdx(0); setHCIdx(0);
  }

  // --- Date formatter helper for API cards ---
  const fmtDateTime = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
  };

  // Optional: Refresh caches on window focus without blocking UI
  useEffect(() => {
    function onFocus() {
      if (DATA_SOURCE !== "API") return;
      Promise.all([
        axios.get("/api/admin/get_new_hazard", { withCredentials: true }).catch(() => ({ data: { hazards: null } })),
        axios.get("/api/admin/get_approved_hazard", { withCredentials: true }).catch(() => ({ data: { hazards: null } })),
      ]).then(([p, a]) => {
        const pList = Array.isArray(p?.data?.hazards) ? p.data.hazards : null;
        const aList = Array.isArray(a?.data?.hazards) ? normalizeApproved(a.data.hazards) : null;
        if (pList) { setHazards(pList); saveCache(HAZARD_CACHE_KEYS.pending, pList); }
        if (aList) { setApprovedHazards(aList); saveCache(HAZARD_CACHE_KEYS.approved, aList); }
      });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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
            DATA_SOURCE === "API" && status === "Pending"
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
            DATA_SOURCE === "API" && status === "Pending"
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
          key={`erc-${selectedInjury?.id || 'none'}`}
          header="Existing Risk Controls"
          value={existingControls}
          onChange={setExistingControls}
          fill
        />

        <TextField
          key={`arc-${selectedInjury?.id || 'none'}`}
          header="Additional Risk Controls"
          value={additionalControls}
          onChange={setAdditionalControls}
          fill
        />
      </div>
      {/* --- Hazard approval/rejection controls --- */}
      <div className="mt-6 flex justify-end gap-4">
        {status === "Pending" && (
          <CTAButton icon={FaSave} text="Save Entry" onClick={(e) => handleApprove(e)} />
        )}
        <CTAButton icon={MdDelete} text="Reject Entry" onClick={(e) => handleReject(e)} />
      </div>



    </div>
  );
}