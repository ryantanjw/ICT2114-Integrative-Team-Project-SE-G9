import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import CTAButton from "../../components/CTAButton.jsx";
import { FaPlus } from "react-icons/fa";
import SearchBar from "../../components/SearchBar.jsx";
import UserTable from "./components/TableLayout.jsx";
import RegisterForm from "./components/RegisterForm.jsx";
import axios from "axios";

export default function AdminUser() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
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
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">User Management</h3>
        <CTAButton
          icon={<FaPlus />}
          text="Add User"
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto"
        />
      </div>
      
      <SearchBar />
      
      <UserTable
        users={[
          { name: "Dave Timothy Johnson", email: "davejohnson@sit.singaporetech.edu.sg" },
          { name: "Andrew Jones Johnson", email: "JoneJohnson@sit.singaporetech.edu.sg" },
          { name: "Charlie David James", email: "Charliedavid@sit.singaporetech.edu.sg" }
        ]}
        onRemove={(user) => console.log("Remove", user)}
        onReset={(user) => console.log("Reset", user)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
      </div>
      
      {/* Registration modal */}
      <RegisterForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}