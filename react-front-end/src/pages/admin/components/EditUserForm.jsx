import React, { useState, useEffect } from "react";
import axios from "axios";
import InputGroup from "../../../components/InputGroup.jsx";
import StatusCard from "../../../components/StatusCard";
import { FaCheckCircle, FaHourglassHalf } from "react-icons/fa";

export default function EditUserForm({ isOpen, user, onClose, onUserUpdated }) {
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        email: "",
        designation: "",
        role: "",
        cluster: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Update form data when user changes
    useEffect(() => {
        if (user) {
            console.log("Populating form with user data:", user);
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                designation: user.designation || "",
                role: user.role === "Admin" ? "0" : "1",
                cluster: user.cluster
            });
            // Reset success state when opening the form
            setSuccess(false);
            setError("");
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email) {
            setError("Name and email are required");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            // Prepare data for API
            const apiData = {
                user_id: formData.id,
                user_name: formData.name,
                user_email: formData.email,
                user_designation: formData.designation,
                user_role: parseInt(formData.role),
                user_cluster: formData.cluster
            };

            console.log("-------- UPDATING USER --------");
            console.log("User ID:", formData.id);
            console.log("Form data:", formData);
            console.log("API data being sent:", apiData);
            console.log("Cluster value being sent:", apiData.user_cluster, "Type:", typeof apiData.user_cluster);
            console.log("------------------------------");

            // Make API call to update user
            const response = await axios.post("/api/admin/update_user", apiData);

            if (response.data.success) {
                console.log("User updated successfully:", response.data);
                setSuccess(true);

                // Format the response for the parent component
                const updatedUser = {
                    id: response.data.user.user_id,
                    name: response.data.user.user_name,
                    email: response.data.user.user_email,
                    role: response.data.user.user_role === 0 ? "Admin" : "User",
                    designation: response.data.user.user_designation || "Not specified",
                    cluster: response.data.user.user_cluster
                };

                // Wait a moment for the success message to be seen
                setTimeout(() => {
                    onUserUpdated(updatedUser);
                }, 1000);
            } else {
                console.error("Failed to update user:", response.data.error);
                setError(response.data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            setError("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-xl space-y-6">
                <h2 className="text-2xl font-bold">Edit User Details</h2>

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputGroup
                        label="Full Name"
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <InputGroup
                        label="Email"
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    <InputGroup
                        label="Designation"
                        id="designation"
                        type="text"
                        value={formData.designation}
                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                        placeholder="e.g. Developer, Manager, etc."
                    />

                    <div className="space-y-1">
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                            Role
                        </label>
                        <select
                            id="role"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            required
                        >
                            <option value="0">Admin</option>
                            <option value="1">User</option>
                        </select>
                    </div>                    
                    <div className="space-y-1">
                        <label htmlFor="cluster" className="block text-sm font-medium text-gray-700">
                            Programme Cluster
                        </label>
                        <select
                            id="cluster"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={formData.cluster === null ? "" : formData.cluster}
                            onChange={e => {
                                console.log("Selected cluster:", e.target.value);
                                setFormData({...formData, cluster: e.target.value === "" ? null : e.target.value});
                            }}
                        >
                            <option value="">Not assigned</option>
                            <option value="ENG">Engineering (ENG)</option>
                            <option value="FCB">Food, Chemical and Biotechnology (FCB)</option>
                            <option value="ICT">Infocomm Technology (ICT)</option>
                            <option value="HSS">Health and Social Sciences (HSS)</option>
                            <option value="BCD">Business, Communication and Design (BCD)</option>
                        </select>
                    </div>
                    <StatusCard
                        title={success ? "Update Successful" : isSubmitting ? "Updating User..." : "Edit User Details"}
                        symbol={success ? <FaCheckCircle /> : <FaHourglassHalf />}
                        color={success ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    />

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}