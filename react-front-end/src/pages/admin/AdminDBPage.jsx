import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import DatabaseTabs from "./components/DatabaseTabs.jsx";
import FormCardC from "../../components/FormCardC.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function AdminDB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

  const [currentTab, setCurrentTab] = useState(0);
  const [expandedCardIndex, setExpandedCardIndex] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [isLoadingDBPage, setIsLoadingDBPage] = useState(true);
  
  // Check session when component mounts
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking admin session...");
        setIsLoading(true);
        
        const response = await axios.get("/api/check_session", {
          withCredentials: true
        });
        
        console.log("Session check response:", response.data);
        
        // If not logged in, redirect to login page
        if (!response.data.logged_in) {
          console.log("No active session found, redirecting to login");
          navigate("/auth/login");
          return;
        }
        
        // If user is not an admin, redirect to user dashboard
        if (response.data.user_role !== 0) {
          console.log("Non-admin user detected, redirecting to user dashboard");
          navigate("/home");
          return;
        }
        
        // Store admin data for display
        setAdminData(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, assume not logged in and redirect
        navigate("/auth/login");
      }
    };

    const fetchHazards = async () => {
      try {
        const res = await axios.get("/api/admin/get_new_hazard");
        if (res.data.hazards.length > 0) {
          // setHazards(res.data.hazards);
          // console.log("successfully fetched hazards", res.data.hazards);
          console.log("successfully fetched hazards");
          res.data.hazards.forEach((item, i) => {
            console.log(`#${i}`, item.hazard, item.existing_risk_control);
          });
        }
      } catch (err) {
        console.error("Error fetching hazards", err);
      }
    };

    const init = async () => {
    setIsLoadingDBPage(true); // Start fullscreen loading
    await checkSession();
    await fetchHazards();
    setIsLoadingDBPage(false); // Stop fullscreen loading
  };

  init();
  }, [navigate]);

  if (isLoadingDBPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="text-lg font-medium text-gray-700">Fetching data…</span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading indicator while checking session
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
      {/* Header */}
      <HeaderAdmin activePage={location.pathname} />

      {/* Page Title */}
      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          Database Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
          {/* Optional: Action cards can go here */}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <DatabaseTabs onTabChange={setCurrentTab} />
      </div>

      {currentTab === 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 my-6 w-full items-start">
          {hazards.map((hazard, index) => (
            <FormCardC
              key={hazard.hazard_id}
              status={hazard.approval ?? "Unapproved"}
              date={hazard.form_date}
              title={hazard.form_title}
              owner={hazard.owner}
              activity={hazard.work_activity}
              hazard={hazard.hazard}
              hazardType={hazard.hazard_type}
              injury={hazard.injury}
              remarks={hazard.remarks}
              existingRiskControl={hazard.existing_risk_control}
              additionalRiskControl={hazard.additional_risk_control}
              severity={hazard.severity}
              likelihood={hazard.likelihood}
              RPN={hazard.RPN}
              process={hazard.process}
              isExpanded={expandedCardIndex === index}
              onExpand={() =>
                setExpandedCardIndex(expandedCardIndex === index ? null : index)
              }
              // onApproveHazard={async () => {
              //   try {
              //     // Send the full hazard data to the backend
              //     const res = await axios.post(
              //       "/api/admin/approve_hazard",
              //       { ...hazard },
              //       { withCredentials: true }
              //     );
              //     // Optionally update UI by removing the approved hazard from the list
              //     setHazards((prev) =>
              //       prev.filter((h) => h.hazard_id !== hazard.hazard_id)
              //     );
                  
              //     console.log("Hazard approved:", res.data);
              //   } catch (err) {
              //     console.error("Error approving hazard:", err);
              //   }
              // }}
              onApproveHazard={async () => {
                const toastId = toast.loading("Approving hazard...");
                try {
                  const res = await axios.post(
                    "/api/admin/approve_hazard",
                    hazard,
                    { withCredentials: true }
                  );

                  // If the request was successful (status code 2xx), you can access the data:
                  console.log("Hazard approved:", res.data);
                  toast.success("Hazard approved successfully.", { id: toastId });

                  // Remove the approved hazard from the list
                  setHazards((prev) =>
                    prev.filter((h) => h.hazard_id !== hazard.hazard_id)
                  );

                } catch (err) {
                  if (err.response) {
                    // Server responded with a status other than 2xx
                    console.error("Error approving hazard:", err.response.data);
                  } else if (err.request) {
                    // Request was made but no response received
                    console.error("No response from server:", err.request);
                  } else {
                    // Something else happened
                    console.error("Error:", err.message);
                  }
                  toast.error("Failed to approve hazard.", { id: toastId });
                }
              }}



              onRejectHazard={async () => {
                const toastId = toast.loading("Rejecting hazard...");
                try {
                  const res = await axios.post(
                    "/api/admin/reject_hazard",
                    hazard,
                    { withCredentials: true }
                  );

                  // If the request was successful (status code 2xx), you can access the data:
                  console.log("Hazard rejected:", res.data);
                  toast.success("Hazard rejected successfully.", { id: toastId });

                  // Optionally update UI by removing the rejected hazard from the list
                  setHazards((prev) =>
                    prev.filter((h) => h.hazard_id !== hazard.hazard_id)
                  );

                } catch (err) {
                  if (err.response) {
                    // Server responded with a status other than 2xx
                    console.error("Error rejecting hazard:", err.response.data);
                  }
                  else if (err.request) {
                    // Request was made but no response received
                    console.error("No response from server:", err.request);
                  } else {
                    // Something else happened
                    console.error("Error:", err.message);
                  }
                  toast.error("Failed to reject hazard.", { id: toastId });
                }
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
