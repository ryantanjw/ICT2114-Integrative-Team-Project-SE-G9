import React, { useState } from "react";
import { IoMdClose } from "react-icons/io";

export default function ShareDialogue({ isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: "Wei Chen",
      email: "wei.chen@sit.singaporetech.edu.sg",
      avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
      role: "Owner",
    },
    {
      id: 2,
      name: "Alicia Tan",
      email: "alicia.tan@sit.singaporetech.edu.sg",
      avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
      role: "Editor",
    },
    {
      id: 3,
      name: "Devi Kumar",
      email: "devi.kumar@sit.singaporetech.edu.sg",
      avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
      role: "Editor",
    },
  ]);

  const handleAdd = (sugg) => {
    setTeamMembers(prev => [
      ...prev,
      {
        id: Date.now(),
        name: sugg.name,
        email: sugg.email,
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
        role: "Viewer",
      },
    ]);
  };

  const suggestionMembers = [
    { id: "s1", name: "Joanna Wilcox", email: "joanna.wilcox@sit.singaporetech.edu.sg" },
    { id: "s2", name: "Joseph Ray",   email: "joseph.ray@sit.singaporetech.edu.sg" },
    { id: "s3", name: "Joy Malone",    email: "joy.malone@sit.singaporetech.edu.sg" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col space-y-6">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold">Share this project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoMdClose size={24} />
          </button>
        </div>
        <p className="text-gray-600">
          Invite your team to review and collaborate.
        </p>
        <div className="relative">
          <input
            type="text"
            placeholder="Add team member"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
          {search && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto z-20">
              {suggestionMembers
                .filter((s) =>
                  s.email.toLowerCase().includes(search.toLowerCase())
                )
                .map((sugg) => (
                  <div
                    key={sugg.id}
                    className="flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800">{sugg.email}</span>
                      <span className="text-xs text-gray-500">{sugg.name}</span>
                    </div>
                    {teamMembers.some((m) => m.email === sugg.email) ? (
                      <span className="text-sm text-gray-500">In team</span>
                    ) : (
                      <button
                        className="text-sm text-blue-500"
                        onClick={() => handleAdd(sugg)}
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800">{member.name}</span>
                  <span className="text-gray-500 text-sm">{member.email}</span>
                </div>
              </div>
              <select
                value={member.role}
                onChange={() => {}}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none"
              >
                <option>Owner</option>
                <option>Editor</option>
                <option>Viewer</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}