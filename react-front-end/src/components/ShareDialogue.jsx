import React, { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import axios from "axios";

export default function ShareDialogue({ isOpen, onClose, formId, currentUser, onShare }) {
  const [search, setSearch] = useState("");
  // const [teamMembers, setTeamMembers] = useState([
  //   {
  //     id: 1,
  //     name: "Wei Chen",
  //     email: "wei.chen@sit.singaporetech.edu.sg",
  //     avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //     role: "Owner",
  //   },
  //   {
  //     id: 2,
  //     name: "Alicia Tan",
  //     email: "alicia.tan@sit.singaporetech.edu.sg",
  //     avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //     role: "Editor",
  //   },
  //   {
  //     id: 3,
  //     name: "Devi Kumar",
  //     email: "devi.kumar@sit.singaporetech.edu.sg",
  //     avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //     role: "Editor",
  //   },
  // ]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Fetch all users for suggestions
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingUsers(true);
        const response = await axios.get('/api/user/users', {
          withCredentials: true
        });
        
        if (response.data && Array.isArray(response.data)) {
          setAllUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  // Fetch existing team members for the form
  // useEffect(() => {
  //   const fetchFormTeamMembers = async () => {
  //     if (!isOpen || !formId) return;
      
  //     try {
  //       setIsLoading(true);
  //       const response = await axios.get(`/api/user/getFormTeam/${formId}`, {
  //         withCredentials: true
  //       });
        
  //       if (response.data && response.data.team_data) {
  //         const members = [];
          
  //         // Add leader if exists
  //         if (response.data.team_data.leader) {
  //           members.push({
  //             id: response.data.team_data.leader.user_id || response.data.team_data.leader.id,
  //             name: response.data.team_data.leader.user_name || response.data.team_data.leader.name,
  //             email: response.data.team_data.leader.email || `${response.data.team_data.leader.user_name}`,
  //             avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //             role: "Owner",
  //           });
  //         }
          
  //         // Add team members if exist
  //         if (response.data.team_data.members && Array.isArray(response.data.team_data.members)) {
  //           response.data.team_data.members.forEach(member => {
  //             members.push({
  //               id: member.user_id || member.id,
  //               name: member.user_name || member.name,
  //               email: member.email || `${member.user_name}`,
  //               avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //               role: "Editor",
  //             });
  //           });
  //         }
          
  //         setTeamMembers(members);
  //       } else {
  //         // If no existing team, add current user as owner
  //         if (currentUser) {
  //           setTeamMembers([{
  //             id: currentUser.user_id || currentUser.id,
  //             name: currentUser.user_name || currentUser.name,
  //             email: currentUser.user_email || `${currentUser.user_name}`,
  //             avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //             role: "Owner",
  //           }]);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching form team members:", error);
  //       // If error, add current user as owner
  //       if (currentUser) {
  //         setTeamMembers([{
  //           id: currentUser.user_id || currentUser.id,
  //           name: currentUser.user_name || currentUser.name,
  //           email: currentUser.user_email || `${currentUser.user_name}`,
  //           avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
  //           role: "Owner",
  //         }]);
  //       }
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchFormTeamMembers();
  // }, [isOpen, formId, currentUser]);


  // const handleShareForm = async () => {
  //   if (!onShare) return;
    
  //   // Get only the users that were added (exclude owner)
  //   // const usersToShare = teamMembers.filter(member => member.role !== "Owner");


  //   const usersToShare = teamMembers;
    
  //   if (usersToShare.length === 0) {
  //     alert("Please add at least one user to share the form with.");
  //     return;
  //   }
    
  //   setIsSharing(true);
  //   console.log("set is sharing to true at 148");
  //   try {
  //     await onShare(formId, usersToShare);
  //     console.log("Awaiting onShare");
  //   } catch (error) {
  //     console.error("Error sharing form:", error);
  //   } finally {
  //     setIsSharing(false);
  //   }
  // };

  
const handleShareForm = async () => {
  console.log("=== handleShareForm called ===");
  console.log("onShare prop:", onShare);
  console.log("formId:", formId);
  console.log("teamMembers:", teamMembers);
  
  if (!onShare) {
    console.log("No onShare function provided!");
    return;
  }
  
  const usersToShare = teamMembers;
  console.log("usersToShare:", usersToShare);
  console.log("usersToShare length:", usersToShare.length);
  
  if (usersToShare.length === 0) {
    console.log("No users to share with - showing alert");
    alert("Please add at least one user to share the form with.");
    return;
  }
  
  console.log("About to call onShare with:", formId, usersToShare);
  setIsSharing(true);
  
  try {
    await onShare(formId, usersToShare);
    console.log("onShare completed successfully");
  } catch (error) {
    console.error("Error in onShare:", error);
  } finally {
    setIsSharing(false);
    console.log("setIsSharing set to false");
  }
};
 const handleAdd = async (user) => {
    try {
      const newMember = {
        id: user.user_id || user.id,
        name: user.user_name || user.name,
        email: user.email || `${user.user_name}@sit.singaporetech.edu.sg`,
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/340px-Default_pfp.svg.png",
        role: "Viewer",
      };
      
      setTeamMembers(prev => [...prev, newMember]);
      setSearch(""); // Clear search after adding
      
    } catch (error) {
      console.error("Error adding user to team:", error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      // Remove from local state
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      
    } catch (error) {
      console.error("Error removing team member:", error);
    }
  };

  // Filter users for suggestions (exclude current team members)
  const filteredUsers = allUsers.filter(user => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (user.user_name && user.user_name.toLowerCase().includes(searchLower)) ||
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.user_email && user.user_email.toLowerCase().includes(searchLower));
    
    const notInTeam = !teamMembers.some(member => 
      member.id === (user.user_id || user.id)
    );

    const isNormalUser = user.user_role === 1;

    
    return matchesSearch && notInTeam && isNormalUser;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col space-y-6">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold">Share this form</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoMdClose size={24} />
          </button>
        </div>
        <p className="text-gray-600">
          Sharing this form will create a copy of the form for the added users.
        </p>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search users by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
          
          {search && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto z-20">
              {isLoadingUsers ? (
                <div className="px-4 py-2 text-center text-gray-500">Loading users...</div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.user_id || user.id}
                    className="flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800">
                        {user.user_email || `${user.user_name || user.name}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.user_name || user.name}
                      </span>
                    </div>
                    <button
                      className="text-sm text-blue-500 hover:text-blue-700"
                      onClick={() => handleAdd(user)}
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-center text-gray-500">No users found</div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading team members...</span>
            </div>
          ) : teamMembers.length > 0 ? (
            teamMembers.map((member) => (
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
                  {member.role !== "Owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No team members found
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleShareForm}
            disabled={isSharing}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Sharing...</span>
              </>
            ) : (
              <span>Share Form</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}