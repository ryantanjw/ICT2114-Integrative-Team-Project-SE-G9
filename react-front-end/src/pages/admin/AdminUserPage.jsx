import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import CTAButton from "../../components/CTAButton.jsx";
import { FaPlus } from "react-icons/fa";
import SearchBar from "../../components/SearchBar.jsx";
import UserTable from "./components/AdminUserTable.jsx";
import RegisterForm from "./components/RegisterForm.jsx";
import EditUserForm from "./components/EditUserForm.jsx";
import axios from "axios";

// Configure axios with explicit base URL to ensure correct paths
axios.defaults.baseURL = '';  // Empty string to use relative paths
axios.defaults.withCredentials = true;

export default function AdminUser() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);


  // Check session and fetch users when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Checking admin session...");
        setIsLoading(true);
        setError(null);
    
        // Check session first
        const sessionResponse = await axios.get("/api/check_session");
        console.log("Session check response:", sessionResponse.data);
    
        // If not logged in, redirect to login page
        if (!sessionResponse.data.logged_in) {
          console.log("No active session found, redirecting to login");
          navigate("/auth/login");
          return;
        }
    
        // If user is not an admin, redirect to user dashboard
        if (sessionResponse.data.user_role !== 0) {
          console.log("Non-admin user detected, redirecting to user dashboard");
          navigate("/home");
          return;
        }
    
        // Store admin data
        setAdminData(sessionResponse.data);
    
        // Now fetch users from API with the correct path
        console.log("Fetching users from API with explicit path...");
        const apiPath = "/api/admin/get_users";
        console.log("API Request URL:", apiPath);
        
        try {
          const usersResponse = await axios.get(apiPath);
          console.log("API Response:", usersResponse);
          
          if (usersResponse.data.success) {
            const userData = usersResponse.data.users;
            console.log("Raw user data from API:", userData);
            
            if (!userData || !Array.isArray(userData) || userData.length === 0) {
              console.warn("API returned empty or invalid users array");
              setError("No users found in database");
              setUsers([]);
              setFilteredUsers([]);
            } else {
              console.log(`Successfully fetched ${userData.length} users from API`);
              
              // Format users for the table
              const formattedUsers = userData.map(user => ({
                id: user.user_id,
                name: user.user_name,
                email: user.user_email,
                role: user.user_role === 0 ? "Admin" : "User",
                designation: user.user_designation || "Not specified",
                cluster: user.user_cluster 
              }));
              
              console.log("Formatted users:", formattedUsers);
              setUsers(formattedUsers);
              setFilteredUsers(formattedUsers);
            }
          } else {
            console.error("API returned error:", usersResponse.data.error);
            setError(`Failed to load users: ${usersResponse.data.error}`);
          }
        } catch (apiError) {
          console.error("API error details:", {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            headers: apiError.response?.headers
          });
          
          if (apiError.response?.status === 404) {
            console.error("Endpoint not found, trying fallback endpoint...");
            try {
              // Try alternate path in case URL prefix is wrong
              const fallbackResponse = await axios.get("/admin/get_users");
              console.log("Fallback response:", fallbackResponse.data);
              
              if (fallbackResponse.data.success) {
                const userData = fallbackResponse.data.users;
                const formattedUsers = userData.map(user => ({
                  id: user.user_id,
                  name: user.user_name,
                  email: user.user_email,
                  role: user.user_role === 0 ? "Admin" : "User",
                  designation: user.user_designation || "Not specified",
                  cluster: user.user_cluster

                }));
                
                setUsers(formattedUsers);
                setFilteredUsers(formattedUsers);
                console.log("Using data from fallback endpoint");
              }
            } catch (fallbackError) {
              console.error("Both endpoints failed:", fallbackError);
              setError("API endpoint not found. Check server configuration.");
            }
          } else {
            setError(`API error: ${apiError.message}`);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        setError(`Session error: ${error.message}`);
        
        if (error.response && error.response.status === 401) {
          navigate("/auth/login");
        }
      } finally {
        setIsLoading(false);
      }
    };
     
    fetchData();
  }, [navigate]);

  
  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = users.filter(
        user =>
          user.name.toLowerCase().includes(lowercasedTerm) ||
          user.email.toLowerCase().includes(lowercasedTerm) ||
          // Add cluster search - convert cluster to string first
          (user.cluster != null && user.cluster.toString().includes(lowercasedTerm))
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Handle user editing
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  // Handle user removal
  const handleRemoveUser = async (user) => {
    if (window.confirm(`Are you sure you want to remove ${user.name}?`)) {
      try {
        console.log("Removing user:", user);
        const response = await axios.post("/api/admin/remove_user", { user_id: user.id });
        
        if (response.data.success) {
          setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
          console.log(`User ${user.name} removed successfully`);
        } else {
          console.error("Failed to remove user:", response.data.error);
          alert(response.data.error || "Failed to remove user. Please try again.");
        }
      } catch (error) {
        console.error("Error removing user:", error);
        alert("Failed to remove user. Please try again.");
      }
    }
  };

  // Handle password reset
  const handleResetUser = async (user) => {
    if (window.confirm(`Are you sure you want to reset password for ${user.name}?`)) {
      try {
        console.log("Resetting password for user:", user);
        const response = await axios.post("/api/admin/reset_password", { user_id: user.id });
        
        if (response.data.success) {
          alert(`Password has been reset for ${user.name}. New password: ${response.data.new_password}`);
        } else {
          console.error("Failed to reset password:", response.data.error);
          alert(response.data.error || "Failed to reset password. Please try again.");
        }
      } catch (error) {
        console.error("Error resetting user password:", error);
        alert("Failed to reset password. Please try again.");
      }
    }
  };

  // Show loading indicator
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

      <SearchBar
        onSearch={setSearchTerm}
        placeholder="Search users by name or email..."
      />
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {filteredUsers.length === 0 && !error ? (
        <div className="p-8 text-center bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No users found. {searchTerm ? "Try a different search term." : "Add users to get started."}</p>
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          onRemove={handleRemoveUser}
          onReset={handleResetUser}
          onEdit={handleEditUser}
        />
      )}

      {/* Registration modal */}
      <RegisterForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUserAdded={(newUser) => {
          // Add the new user to the list
          setUsers(prevUsers => [...prevUsers, {
            id: newUser.user_id,
            name: newUser.user_name,
            email: newUser.user_email,
            role: newUser.user_role === 0 ? "Admin" : "User",
            designation: newUser.user_designation || "Not specified",
            cluster: newUser.user_cluster
          }]);
          setModalOpen(false);
        }}
      />

        {/* Edit User Modal */}
        <EditUserForm 
          isOpen={editModalOpen}
          user={selectedUser}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          onUserUpdated={(updatedUser) => {
            setUsers(prevUsers => 
              prevUsers.map(u => 
                u.id === updatedUser.id ? updatedUser : u
              )
            );
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
        />

    </div>
  );
}