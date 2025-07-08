import React, { useState, useEffect } from "react";
import Button from "../../components/ButtonGroup";
import InputGroup from "../../components/InputGroup";
import axios from 'axios';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export default function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [reverifyPassword, setReverifyPassword] = useState("");

  // Validate new password complexity
  const newPasswordError = newPassword
    ? (() => {
        const errs = [];
        if (newPassword.length < 8)
          errs.push("at least 10 characters");
        if ((newPassword.match(/[^A-Za-z0-9]/g) || []).length < 1)
          errs.push("1 symbol");
        if ((newPassword.match(/[A-Z]/g) || []).length < 2)
          errs.push("2 uppercase letters");
        if ((newPassword.match(/[a-z]/g) || []).length < 3)
          errs.push("3 lowercase letters");
        if ((newPassword.match(/[0-9]/g) || []).length < 4)
          errs.push("4 numbers");
        return errs.length > 0
          ? `Password must have ${errs.join(", ")}`
          : "";
      })()
    : "";

    const reverifyError = reverifyPassword && reverifyPassword !== newPassword
    ? "Passwords do not match"
    : "";

  // Check if user is already logged in when component loads
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        console.log("Checking for existing session...");
        const response = await axios.get("/api/check_session", {
          withCredentials: true
        });
        console.log("Session check on login page:", response.data);
        
        // If already logged in, redirect based on role
        if (response.data.logged_in) {
          console.log("User already logged in, redirecting...");
          if (response.data.user_role === 0) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/home";
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkExistingSession();
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();

  if (newPasswordError || reverifyError) {
    alert("Please fix password validation errors first.");
    return;
  }

  if (!verifyEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

  try {
    const response = await axios.post(
      "/api/forgot_password",
      {
        email: verifyEmail,
        new_password: newPassword,
      },
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.success) {
      alert("Password has been reset successfully.");
      // Optionally reset inputs
      setNewPassword("");
      setReverifyPassword("");
      setVerifyEmail("");
      window.location.href = "/auth/login"; //redirect back to login page
    } else {
      alert("Failed to reset password: " + (response.data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("API error:", error);
    alert("An error occurred while resetting password.");
  }
};

  return (
    <div className="bg-white w-screen">
      <div className="flex justify-center h-screen">
         {/* Left form panel */}
        <div className="flex flex-col items-center justify-start w-full px-2 mx-auto xl:w-1/3">
          <div className="w-full p-8 space-y-6 bg-white">
              <div>
                <div className="flex justify-center my-30">
                  <img
                    src="/SIT_Logo.svg"
                    alt="SIT Logo"
                    className="h-20"
                  />
                </div>
                <div className="text-start mt-20">
                  <h2 className="text-4xl font-bold text-gray-700">
                    Forgot Password?
                  </h2>
                  <p className="mt-5 text-gray-500">
                    Provide the registered SIT email address associated with your account and new password to reset your password.
                  </p>
                </div>
              </div>

            {/* Form */}
            <div className="mt-10">
              <form onSubmit={handlePasswordReset}>
                <InputGroup
                  label="Email Address"
                  id="verify-email"
                  type="email"
                  value={verifyEmail}
                  onChange={(e) => setVerifyEmail(e.target.value)}
                  placeholder="example@sit.singaporetech.edu.sg"
                  className="mt-6"
                />

                <InputGroup
                  label="New Password"
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (!newPasswordTouched) setNewPasswordTouched(true);
                  }}
                  onBlur={() => setNewPasswordTouched(true)}
                  error={newPasswordTouched ? newPasswordError : ""}
                  className="mt-6"
                />

                <InputGroup
                  label="Reverify New Password"
                  id="reverify-password"
                  type="password"
                  value={reverifyPassword}
                  onChange={(e) => setReverifyPassword(e.target.value)}
                  error={reverifyError}
                  className="mt-6"
                />

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
                    <p className="font-medium">Reset Error</p>
                    <p>{errorMessage}</p>
                  </div>
                )}

                <div className="mt-6 font-light">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Right image panel */}
        <div className="hidden xl:block xl:w-2/3 bg-[#F7FAFC] h-screen overflow-hidden p-10">
          <div className="w-full h-full overflow-hidden rounded-xl">
            <img
              src="https://www.singaporetech.edu.sg/sites/default/files/2023-07/PunggolCampus_CampusCourtSWview.jpg"
              alt="SIT Campus"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}