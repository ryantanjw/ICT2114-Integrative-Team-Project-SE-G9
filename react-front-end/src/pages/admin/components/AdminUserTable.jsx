import React from "react";
import { FaTrash, FaKey } from "react-icons/fa";

export default function UserTable({ users, onRemove, onReset }) {
    // Enhanced debugging to see exactly what data is being received
    console.log("UserTable rendering with users:", JSON.stringify(users, null, 2));
    
    // Check if users is undefined or empty
    if (!users || users.length === 0) {
        return (
            
            <div className="p-8 text-center bg-white rounded-lg shadow-sm">
                <p className="text-gray-600">No users found.</p>
            </div>
        );
    }
    
    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <div className="p-2 bg-gray-100 text-gray-700 text-sm">
                Showing {users.length} users
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Designation
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => {
                        // More robust debugging for individual user entries
                        console.log(`Rendering user ${index}:`, user);
                        
                        return (
                            <tr key={user.id || `user-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user.name || "Unknown Name"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {user.email || "Unknown Email"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        user.role === "Admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                                    }`}>
                                        {user.role || "Unknown Role"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.designation || "Not specified"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => onReset(user)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        <FaKey className="inline mr-1" />
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => onRemove(user)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <FaTrash className="inline mr-1" />
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}