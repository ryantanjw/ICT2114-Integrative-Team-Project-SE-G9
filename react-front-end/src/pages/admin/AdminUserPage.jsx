import React, { useState, useEffect } from "react";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import CTAButton from "../../components/CTAButton.jsx";
import { FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import SearchBar from "../../components/SearchBar.jsx";
import UserTable from "./components/AdminUserTable.jsx";
import RegisterForm from "./components/RegisterForm.jsx";
import EditUserForm from "./components/EditUserForm.jsx";
import ResetUserPasswordForm from "./components/ResetUserPassForm.jsx";
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
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;



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
                cluster: user.user_cluster,
                divisionName: user.division_name || 'No Division'
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
                  cluster: user.user_cluster,
                  divisionName: user.division_name || 'No Division'
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
    if (!searchTerm || searchTerm.trim() === "") {
      // If search term is empty, show all users
      setFilteredUsers(users);
      return;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    console.log("Searching for term:", lowercasedTerm);

    const filtered = users.filter(user => {
      // Check if name contains search term
      const nameMatch = user.name && user.name.toLowerCase().includes(lowercasedTerm);

      // Check if email contains search term
      const emailMatch = user.email && user.email.toLowerCase().includes(lowercasedTerm);

      // Check if designation contains search term (optional)
      const designationMatch = user.designation &&
        user.designation.toLowerCase().includes(lowercasedTerm);

      // Check if cluster contains search term (optional)
      const clusterMatch = user.cluster &&
        String(user.cluster).toLowerCase().includes(lowercasedTerm);

      // Log search matches for debugging
      if (nameMatch || emailMatch || designationMatch || clusterMatch) {
        console.log(`Match found for user: ${user.name}, term: ${lowercasedTerm}`);
      }

      return nameMatch || emailMatch || designationMatch || clusterMatch;
    });

    console.log(`Found ${filtered.length} matches out of ${users.length} total users`);
    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when search changes
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
  const handleResetUser = (user) => {
    console.log("Resetting password for user:", user);
    setSelectedUser(user);
    setResetPasswordModalOpen(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5 pb-10">
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
        onSearch={(term) => {
          console.log("Search term from SearchBar:", term);
          setSearchTerm(term);
        }}
        placeholder="Search users by name, email, or cluster..."
      />
      
      {/* Results Summary */}
      {filteredUsers.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
          {searchTerm && (
            <span className="ml-2 font-medium">
              (filtered results)
            </span>
          )}
        </div>
      )}
      
      {/* Add a debug indicator showing current search */}
      {searchTerm && (
        <div className="mb-2 text-sm text-gray-600">
          Searching for: "{searchTerm}" ({filteredUsers.length} results)
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="h-5"></div>

      {filteredUsers.length === 0 && !error ? (
        <div className="p-8 text-center bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No users found. {searchTerm ? "Try a different search term." : "Add users to get started."}</p>
        </div>
      ) : (
        <>
          <UserTable
            users={currentUsers}
            onRemove={handleRemoveUser}
            onReset={handleResetUser}
            onEdit={handleEditUser}
          />

          {/* Pagination Controls - Same style as AdminFormPage */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={!hasPrev}
                  className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="mr-1" size={12} />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => goToPage(1)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        1
                      </button>
                      {currentPage > 4 && <span className="px-2">...</span>}
                    </>
                  )}

                  {/* Show pages around current page */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <button
                        type="button"
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 border rounded-md ${
                          pageNum === currentPage
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Show last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                      <button
                        type="button"
                        onClick={() => goToPage(totalPages)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={!hasNext}
                  className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <FaChevronRight className="ml-1" size={12} />
                </button>
              </div>
            </div>
          )}
        </>
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
            cluster: newUser.user_cluster,
            divisionName: newUser.division_name || 'No Division'
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

      {/* Reset password form modal */}
      <ResetUserPasswordForm
        isOpen={resetPasswordModalOpen}
        user={selectedUser}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onPasswordReset={() => {
          // Show success notification if needed
          setResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
      />

    </div>
  );
}