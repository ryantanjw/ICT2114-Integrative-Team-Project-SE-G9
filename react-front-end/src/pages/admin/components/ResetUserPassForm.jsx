import React, { useState, useEffect } from "react";
import axios from "axios";
import InputGroup from "../../../components/InputGroup.jsx";
import StatusCard from "../../../components/StatusCard";
import { FaCheckCircle, FaHourglassHalf, FaRandom } from "react-icons/fa";

export default function ResetUserPasswordForm({ isOpen, user, onClose, onPasswordReset }) {
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Clear form when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            // Reset form state when the modal opens
            setPassword("");
            setError("");
            setSuccess(false);
        }
    }, [isOpen]);

    const generateRandomPassword = () => {
        // Generate a random password that meets all requirements:
        // - At least 10 characters
        // - At least 1 symbol
        // - At least 2 uppercase letters
        // - At least 3 lowercase letters
        // - At least 4 numbers
        
        const symbols = "!@#$%^&*()_-+=";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        
        // Ensure minimum requirements are met
        let newPassword = "";
        
        // Add 1 symbol
        newPassword += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Add 2 uppercase letters
        for (let i = 0; i < 2; i++) {
            newPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
        }
        
        // Add 3 lowercase letters
        for (let i = 0; i < 3; i++) {
            newPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
        }
        
        // Add 4 numbers
        for (let i = 0; i < 4; i++) {
            newPassword += numbers[Math.floor(Math.random() * numbers.length)];
        }
        
        // Add 2 more random characters to reach at least 12 characters total
        const allChars = symbols + uppercase + lowercase + numbers;
        for (let i = 0; i < 2; i++) {
            newPassword += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // Shuffle the password to make it more random
        newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('');
        
        setPassword(newPassword);
    };

    const newPasswordError = password
  ? (() => {
      const errs = [];
      if (password.length < 10)
        errs.push("at least 10 characters");
      if ((password.match(/[^A-Za-z0-9]/g) || []).length < 1)
        errs.push("1 symbol");
      if ((password.match(/[A-Z]/g) || []).length < 2)
        errs.push("2 uppercase letters");
      if ((password.match(/[a-z]/g) || []).length < 3)
        errs.push("3 lowercase letters");
      if ((password.match(/[0-9]/g) || []).length < 4)
        errs.push("4 numbers");
      return errs.length > 0
        ? `Password must have ${errs.join(", ")}`
        : "";
    })()
  : "";


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password) {
            setError("Password is required");
            return;
        }

        if (newPasswordError) {
            setError(newPasswordError);  
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            // Prepare data for API
            const apiData = {
                user_id: user.id,
                new_password: password
            };

            console.log("Resetting password for user:", user.name);
            
            // Make API call to reset password
            const response = await axios.post("/api/admin/reset_password", apiData);

            if (response.data.success) {
                console.log("Password reset successfully");
                setSuccess(true);
                
                // Clear form on success
                setPassword("");
                
                // Wait a moment for the success message to be seen
                setTimeout(() => {
                    onPasswordReset && onPasswordReset(user);
                    // No need to clear again here as the modal will close
                }, 1000);
            } else {
                console.error("Failed to reset password:", response.data.error);
                setError(response.data.error || "Failed to reset password");
            }
        } catch (error) {
            console.error("Error resetting password:", error);
            setError("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancel button click
    const handleCancel = () => {
        // Clear form and close
        setPassword("");
        setError("");
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-xl space-y-6">
                <h2 className="text-2xl font-bold">Reset Password</h2>
                
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomPassword}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FaRandom className="mr-1" /> Generate
                            </button>
                        </div>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <InputGroup
                                label=""
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                            />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Resetting password for user: <strong>{user?.name}</strong>
                        </p>
                    </div>

                    <StatusCard
                        title={success ? "Password Reset Successful" : isSubmitting ? "Resetting Password..." : "Reset User Password"}
                        symbol={success ? <FaCheckCircle /> : <FaHourglassHalf />}
                        color={success ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    />

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                            disabled={isSubmitting || !password}
                        >
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}