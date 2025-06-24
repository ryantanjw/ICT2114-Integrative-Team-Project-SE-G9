import React, { useState } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import StatusCard from "../../../components/StatusCard";
import { FaCheckCircle, FaHourglassHalf } from "react-icons/fa";
import axios from "axios";

export default function RegisterForm({ isOpen, onClose, onUserAdded }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [programmeCluster, setProgrammeCluster] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setAccountType("");
    setProgrammeCluster("");
    setSuccess(false);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const formData = {
      email,
      password,
      fullName,
      accountType,
      programmeCluster
    };

    try {
      // Use axios for consistent API calls across your app
      const response = await axios.post('/api/admin/add_user', formData);

      console.log('Registration response:', response.data);

      if (response.data.success) {
        console.log('Registration successful:', response.data);
        setSuccess(true);
        
        // Wait a moment to show success message
        setTimeout(() => {
          // Close the form
          onClose();
          
          // Reset the form for next time
          resetForm();
          
          // If onUserAdded is provided, call it with the new user data
          if (onUserAdded && response.data.user) {
            onUserAdded(response.data.user);
          } else {
            // Otherwise, reload the page to show the updated user list
            window.location.reload();
          }
        }, 1000);
      } else {
        // Handle API error response
        setErrors({ general: response.data.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Network Error:', error);
      setErrors({ general: error.response?.data?.error || 'Network error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xl space-y-6">
        <h2 className="text-2xl font-bold">New Account Enrolment</h2>
        
        {/* Display general errors */}
        {errors.general && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputGroup
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            error={errors.email}
          />

          <InputGroup
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            error={errors.password}
          />

          <InputGroup
            label="Full Name"
            id="fullName"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            error={errors.fullName}
          />

          <div className="space-y-1">
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">
              Account Type
            </label>
            <select
              id="accountType"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
              required
            >
              <option value="">Select Account Type</option>
              <option value="0">Admin</option>
              <option value="1">User</option>
            </select>
            {errors.accountType && (
              <p className="mt-1 text-sm text-red-600">{errors.accountType}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="programmeCluster" className="block text-sm font-medium text-gray-700">
              Programme Cluster
            </label>
            <select
              id="programmeCluster"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={programmeCluster}
              onChange={e => setProgrammeCluster(e.target.value)}
            >
              <option value="">Not assigned</option>
              <option value="ENG">Engineering (ENG)</option>
              <option value="FCB">Food, Chemical and Biotechnology (FCB)</option>
              <option value="ICT">Infocomm Technology (ICT)</option>
              <option value="HSS">Health and Social Sciences (HSS)</option>
              <option value="BCD">Business, Communication and Design (BCD)</option>
            </select>
            {errors.programmeCluster && (
              <p className="mt-1 text-sm text-red-600">{errors.programmeCluster}</p>
            )}
          </div>

          <StatusCard
            title={success ? "Enrolment Successful" : submitting ? "Processing..." : "Enrolment Pending"}
            symbol={success ? <FaCheckCircle /> : <FaHourglassHalf />}
            color={success ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Done"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}