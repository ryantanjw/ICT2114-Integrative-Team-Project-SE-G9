import React, { useState, useEffect } from "react";
import Button from "../../components/ButtonGroup";
import InputGroup from "../../components/InputGroup";
import axios from 'axios';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Validate form fields
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    // Make a POST request to the Flask backend
    try {
      console.log("Attempting login with:", { email });
      
            // In your axios calls, use the proxy URLs:
      const response = await axios.post("/api/login_test", 
        { email, password },
        { 
          headers: { "Content-Type": "application/json" },
          withCredentials: true
        }
      );
      
      // And for check_session:
      const sessionResponse = await axios.get("/api/check_session", { 
        withCredentials: true 
      });

      console.log("Login response:", response.data);
      console.log("Login response cookies:", document.cookie);

      if (response.data.success) {
        // Wait a moment to ensure cookie is set
        setTimeout(() => {
          // Double-check session is established
          axios.get("/api/check_session", { withCredentials: true })
            .then(sessionResponse => {
              console.log("Session check after login:", sessionResponse.data);
              if (sessionResponse.data.logged_in) {
                // Redirect based on role
                if (response.data.user_role === 0) {
                  console.log("Admin user confirmed, redirecting to admin page");
                  window.location.href = "/admin";
                } else {
                  console.log("Regular user confirmed, redirecting to home");
                  window.location.href = "/home";
                }
              } else {
                console.error("Login succeeded but session verification failed");
                setErrorMessage("Session could not be established. Please try again.");
                setIsLoading(false);
              }
            })
            .catch(err => {
              console.error("Session check error:", err);
              setErrorMessage("Session verification failed. Please try again.");
              setIsLoading(false);
            });
        }, 500);
      } else {
        setErrorMessage(response.data.error || "Invalid credentials");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      if (error.response) {
        console.log("Error status:", error.response.status);
        console.log("Error data:", error.response.data);
        
        // Display specific error message based on status code
        if (error.response.status === 401) {
          setErrorMessage("Invalid email or password. Please try again.");
        } else if (error.response.status === 400) {
          setErrorMessage(error.response.data.error || "Please check your input.");
        } else if (error.response.status === 500) {
          setErrorMessage("Server error. Please try again later.");
        } else {
          setErrorMessage(error.response.data.error || "Login failed. Please try again.");
        }
      } else if (error.request) {
        // Request was made but no response received
        setErrorMessage("Cannot connect to server. Please check your internet connection.");
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
      setIsLoading(false);
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
                    Login
                  </h2>
                  <p className="mt-5 text-gray-500">
                    Log in using your registered SIT email address and associated password to access the system.
                  </p>
                </div>
              </div>

            <div className="mt-10">
              <form onSubmit={handleSubmit}>
                <InputGroup
                label="Email Address"
                id="email"
                type="email"
                placeholder="example@sit.singaporetech.edu.sg"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-6"
                />
        
                <InputGroup
                label="Password"
                id="password"
                type="password"
                placeholder="Your Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                action={<a href="/auth/forgot-password">Forgot password?</a>}
                className="mt-6"
                />

                <div className="mt-6 font-light">
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
                      <p className="font-medium">Login Error</p>
                      <p>{errorMessage}</p>
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
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