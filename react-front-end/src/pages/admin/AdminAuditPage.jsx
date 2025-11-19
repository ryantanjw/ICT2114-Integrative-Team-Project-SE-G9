import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import HeaderAdmin from '../../components/HeaderAdmin';
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Configure axios with explicit base URL to ensure correct paths
axios.defaults.baseURL = '';  // Empty string to use relative paths
axios.defaults.withCredentials = true;

export default function AdminAuditPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [audits, setAudits] = useState([]);
    const [filteredAudits, setFilteredAudits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [adminData, setAdminData] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCRUD, setSelectedCRUD] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');

    // Check session and fetch audit logs when component mounts
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

                // Now fetch audit logs from API
                console.log("Fetching audit logs from API...");
                const apiPath = "/api/admin/get_audit_logs";
                console.log("API Request URL:", apiPath);

                try {
                    const auditResponse = await axios.get(apiPath);
                    console.log("API Response:", auditResponse);

                    if (auditResponse.data.success) {
                        const auditData = auditResponse.data.audits;
                        console.log("Raw audit data from API:", auditData);

                        if (!auditData || !Array.isArray(auditData) || auditData.length === 0) {
                            console.warn("API returned empty or invalid audits array");
                            setError("No audit logs found");
                            setAudits([]);
                            setFilteredAudits([]);
                        } else {
                            console.log(`Successfully fetched ${auditData.length} audit logs from API`);
                            setAudits(auditData);
                            setFilteredAudits(auditData);
                        }
                    } else {
                        console.error("API returned error:", auditResponse.data.error);
                        setError(`Failed to load audit logs: ${auditResponse.data.error}`);
                    }
                } catch (apiError) {
                    console.error("API error details:", {
                        message: apiError.message,
                        response: apiError.response?.data,
                        status: apiError.response?.status,
                        headers: apiError.response?.headers
                    });

                    if (apiError.response?.status === 404) {
                        console.error("Endpoint not found");
                        setError("API endpoint not found. Check server configuration.");
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

    // Apply filters and search
    useEffect(() => {
        let filtered = [...audits];

        // Apply search filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(audit => 
                audit.audit_user_name.toLowerCase().includes(query) ||
                audit.audit_action.toLowerCase().includes(query) ||
                audit.audit_actiontype.toLowerCase().includes(query) ||
                audit.audit_targetuser_name.toLowerCase().includes(query)
            );
        }

        // Apply CRUD filter
        if (selectedCRUD !== 'all') {
            filtered = filtered.filter(audit => 
                audit.audit_actiontype.toUpperCase() === selectedCRUD.toUpperCase()
            );
        }

        // Apply Action filter
        if (selectedAction !== 'all') {
            filtered = filtered.filter(audit => 
                audit.audit_action.toLowerCase().includes(selectedAction.toLowerCase())
            );
        }

        setFilteredAudits(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [searchQuery, selectedCRUD, selectedAction, audits]);

    // Get unique CRUD types from audits
    const getCRUDTypes = () => {
        const types = new Set(audits.map(audit => audit.audit_actiontype));
        return Array.from(types).sort();
    };

    // Get unique actions from audits
    const getActionTypes = () => {
        const actions = new Set(audits.map(audit => {
            // Extract the main action (after the CRUD prefix)
            const parts = audit.audit_action.split(' - ');
            return parts.length > 1 ? parts[1] : audit.audit_action;
        }));
        return Array.from(actions).sort();
    };

    // Function to determine the color based on action
    const getActionColor = (action) => {
        const actionLower = action.toLowerCase();

        if (actionLower.includes('login')) {
            return 'bg-green-100 text-green-800';
        } else if (actionLower.includes('logout')) {
            return 'bg-gray-100 text-gray-800';
        } else if (actionLower.includes('edit user details')) {
            return 'bg-blue-100 text-blue-800';
        } else if (actionLower.includes('reset password')) {
            return 'bg-yellow-100 text-yellow-800';
        } else if (actionLower.includes('add user')) {
            return 'bg-green-100 text-green-800';
        } else if (actionLower.includes('remove user')) {
            return 'bg-red-100 text-red-800';
        } else {
            return 'bg-purple-100 text-purple-800';
        }
    };

    // Function to determine the color based on CRUD action type
    const getActionTypeColor = (actionType) => {
        if (!actionType) return 'bg-gray-100 text-gray-800';

        const actionUpper = actionType.toUpperCase();

        if (actionUpper === 'POST') {
            return 'bg-green-100 text-green-800'; // Green for Create
        } else if (actionUpper === 'PUT' || actionUpper === 'PATCH') {
            return 'bg-blue-100 text-blue-800'; // Blue for Update
        } else if (actionUpper === 'DELETE') {
            return 'bg-red-100 text-red-800'; // Red for Delete
        } else if (actionUpper === 'GET') {
            return 'bg-yellow-100 text-yellow-800'; // Yellow for Read
        } else {
            return 'bg-purple-100 text-purple-800'; // Purple for Other
        }
    };

    // Format date/time for display
    const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredAudits.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentAudits = filteredAudits.slice(startIndex, endIndex);

    // Pagination handlers
    const goToPage = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
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
        <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5 pb-5">
            <HeaderAdmin activePage={location.pathname} />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Audit Logs</h3>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Search and Filter Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-5">
                {/* Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by name, CRUD, action, or targeted user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CRUD Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by CRUD Type
                        </label>
                        <select
                            value={selectedCRUD}
                            onChange={(e) => setSelectedCRUD(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All CRUD Types</option>
                            {getCRUDTypes().map(crud => (
                                <option key={crud} value={crud}>{crud}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Action
                        </label>
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Actions</option>
                            {getActionTypes().map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(searchQuery || selectedCRUD !== 'all' || selectedAction !== 'all') && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Active filters:</span>
                        {searchQuery && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                Search: "{searchQuery}"
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {selectedCRUD !== 'all' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                                CRUD: {selectedCRUD}
                                <button
                                    onClick={() => setSelectedCRUD('all')}
                                    className="ml-2 text-green-600 hover:text-green-800"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {selectedAction !== 'all' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                                Action: {selectedAction}
                                <button
                                    onClick={() => setSelectedAction('all')}
                                    className="ml-2 text-purple-600 hover:text-purple-800"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCRUD('all');
                                setSelectedAction('all');
                            }}
                            className="text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            <div className="h-5"></div>

            {filteredAudits.length === 0 && !error ? (
                <div className="p-8 text-center bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600">No audit logs found.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                        <div className="p-2 bg-gray-100 text-gray-700 text-sm">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredAudits.length)} of {filteredAudits.length} audit log{filteredAudits.length !== 1 ? 's' : ''}
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Serial No.
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        CRUD
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Targeted User
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentAudits.map((audit, index) => (
                                    <tr key={audit.audit_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {audit.audit_user_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionTypeColor(audit.audit_actiontype)}`}>
                                                {audit.audit_actiontype}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(audit.audit_action)}`}>
                                                {audit.audit_action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {audit.audit_targetuser_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateTime(audit.audit_time)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
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
                                    disabled={currentPage === 1}
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
                                    disabled={currentPage === totalPages}
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
        </div>
    );
}
