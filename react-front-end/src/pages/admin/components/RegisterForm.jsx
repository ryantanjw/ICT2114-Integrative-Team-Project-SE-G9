import React, { useState, useCallback, useEffect } from "react";
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

  // New state for divisions
  const [division, setDivision] = useState("");  
  const [divisions, setDivisions] = useState([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);

// Fetch divisions from API
  const fetchDivisions = useCallback(async () => {
    if (divisionsLoading) return; // Prevent multiple concurrent requests
    
    setDivisionsLoading(true);
    try {
      const response = await fetch('/api/user/retrieveDivisions');
      if (response.ok) {
        const data = await response.json();
        console.log('Divisions fetched:', data);
        
        // Transform the data to match the expected format for dropdown options
        // API returns: [{ division_id: 1, division_name: "Division Name" }, ...]
        const divisionOptions = data.map(div => ({
          value: String(div.division_id), // Ensure string type
          label: div.division_name // Use division_name as display text
        }));
        
        setDivisions(divisionOptions);
      } else {
        console.error('Failed to fetch divisions');
        // Fallback to default options if API fails
        setDivisions([
          { value: "division1", label: "Division 1" },
          { value: "division2", label: "Division 2" },
          { value: "division3", label: "Division 3" },
        ]);
      }
    } catch (error) {
      console.error('Error fetching divisions:', error);
      // Fallback to default options if API fails
      setDivisions([
        { value: "division1", label: "Division 1" },
        { value: "division2", label: "Division 2" },
        { value: "division3", label: "Division 3" },
      ]);
    } finally {
      setDivisionsLoading(false);
    }
  }, [divisionsLoading]);

  // Fetch divisions on component mount
  useEffect(() => {
    fetchDivisions();
  }, []);

  useEffect(() => {
  if (divisions.length > 0 && division && isNaN(division)) {
    // division holds a name, find matching ID
    const matchedDivision = divisions.find(d => d.label === division);
    if (matchedDivision) {
      setDivision(matchedDivision.value); // Set division state to ID string
    }
  }
}, [divisions, division]);

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

          <InputGroup
            label="Programme Cluster"
            id="programmeCluster"
            value={programmeCluster}
            onChange={(e) => setProgrammeCluster(e.target.value)}
            type="select"
            options={[
              { value: "", label: "Not assigned" },
              ...divisions
            ]}
            disabled={divisionsLoading}
            error={errors.programmeCluster}
          />

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