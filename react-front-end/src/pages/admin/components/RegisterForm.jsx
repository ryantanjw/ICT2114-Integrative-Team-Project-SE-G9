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

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: call your enrolment API here
    setSuccess(true);
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
            type="text"
            value={programmeCluster}
            onChange={e => setProgrammeCluster(e.target.value)}
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
