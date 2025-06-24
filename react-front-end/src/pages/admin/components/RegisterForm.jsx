import React, { useState } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import StatusCard from "../../../components/StatusCard";
import { FaCheckCircle, FaHourglassHalf } from "react-icons/fa";

export default function RegisterForm({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [programmeCluster, setProgrammeCluster] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({}); // Add missing errors state
  const [submitting, setSubmitting] = useState(false); // Add loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: call your enrolment API here
    setSubmitting(true);
    setErrors({});

    const formData = {
      email,
      password,
      fullName,
      accountType,
      programmeCluster
    };

      // TODO: call your enrolment API here
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/add_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Registration successful:', result);

        setSuccess(true); // Only set success on successful response

      } else {
              const errorData = await response.json();
              setErrors(errorData.errors || { general: 'Registration failed' });
      }
    } catch (error) {
      console.error('Network Error:', error);
      setErrors({ general: 'Network error occurred' });

    } finally {
      setSubmitting(false);
    }

  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xl space-y-6">
        <h2 className="text-2xl font-bold">New Account Enrolment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputGroup
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <InputGroup
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <InputGroup
            label="Full Name"
            id="fullName"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />

          <InputGroup
            label="Account Type"
            id="accountType"
            type="text"
            value={accountType}
            onChange={e => setAccountType(e.target.value)}
          />

          <InputGroup
            label="Programme Cluster"
            id="programmeCluster"
            type="select"
            value={programmeCluster}
            onChange={e => setProgrammeCluster(e.target.value)}
            options={[
              { value: "", label: "Select Programme Cluster" },
              { value: "ENG", label: "Engineering (ENG)" },
              { value: "FCB", label: "Food, Chemical and Biotechnology (FCB)" },
              { value: "ICT", label: "Infocomm Technology (ICT)" },
              { value: "HSS", label: "Health and Social Sciences (HSS)" },
              { value: "BCD", label: "Business, Communication and Design (BCD)" }
            ]}
          />
          <StatusCard
            title={success ? "Enrolment Successful" : "Enrolment Pending"}
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
            >
              Done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
