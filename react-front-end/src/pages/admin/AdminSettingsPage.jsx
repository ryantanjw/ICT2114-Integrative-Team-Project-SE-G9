import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import axios from "axios";
import AccordionArea from "../../components/AccordianArea.jsx";
import InputGroup from "../../components/InputGroup.jsx";

export default function AdminSetting() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

  const [existingPassword, setExistingPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [reverifyPassword, setReverifyPassword] = useState("");

  // Validate new password complexity (reuse logic)
  const newPasswordError = newPassword
    ? (() => {
        const errs = [];
        if (newPassword.length < 8) errs.push("at least 10 characters");
        if ((newPassword.match(/[^A-Za-z0-9]/g) || []).length < 1) errs.push("1 symbol");
        if ((newPassword.match(/[A-Z]/g) || []).length < 2) errs.push("2 uppercase letters");
        if ((newPassword.match(/[a-z]/g) || []).length < 3) errs.push("3 lowercase letters");
        if ((newPassword.match(/[0-9]/g) || []).length < 4) errs.push("4 numbers");
        return errs.length > 0 ? `Password must have ${errs.join(", ")}` : "";
      })()
    : ""; 
  const reverifyError = reverifyPassword && reverifyPassword !== newPassword
    ? "Passwords do not match"
    : "";

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

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
        <div className="flex flex-col justify-start mb-5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
              <AccordionArea title="Password" className="col-span-full">
                <InputGroup
                  label="Existing Password"
                  id="existing-password"
                  type="password"
                  value={existingPassword}
                  onChange={(e) => setExistingPassword(e.target.value)}
                  error={existingPassword && existingPassword.length < 10 ? "Password must be at least 10 characters long" : ""}
                />
                <InputGroup
                  label="New Password"
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={newPasswordError}
                />
                <InputGroup
                  label="Reverify New Password"
                  id="reverify-password"
                  type="password"
                  value={reverifyPassword}
                  onChange={(e) => setReverifyPassword(e.target.value)}
                  error={reverifyPassword && reverifyPassword !== newPassword ? "Passwords do not match" : ""}
                />
                <div className="flex justify-end">
                  <button className="bg-black text-white px-6 py-2 rounded">
                    Save
                  </button>
                </div>
              </AccordionArea>
            </div>
        </div>
      </div>
  );
}
