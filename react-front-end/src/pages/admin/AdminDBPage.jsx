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

export default function AdminDB() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

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

    checkSession();
  }, [navigate]);

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

      {/* Cards */}
      {currentTab === 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 my-6 w-full items-start">
          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />

          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />

          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />
        </div>
      )}
    </div>
  );
}
