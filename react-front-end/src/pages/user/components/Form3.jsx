import { useState, useEffect, useRef, forwardRef } from "react";
import InputGroup from "../../../components/InputGroup.jsx";
import CTAButton from "../../../components/CTAButton.jsx";
import { MdAdd, MdDelete } from "react-icons/md";
import { LuMinus } from "react-icons/lu";


const Form3 = forwardRef(({ sample, sessionData, updateFormData, formData }, ref) => {
  // Initialize simple fields, falling back to sample if provided
  const [referenceNumber, setReferenceNumber] = useState("");
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [lastReviewDate, setLastReviewDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [raLeader, setRaLeader] = useState("");
  const [raTeam, setRaTeam] = useState([""]);
  const [formId, setFormId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // User search functionality
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTeamMemberIndex, setActiveTeamMemberIndex] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Simple fields for approval
  const [approvedBy, setApprovedBy] = useState("");
  const [signature, setSignature] = useState("");
  const [designation, setDesignation] = useState("");

  // Current user data
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch users for the dropdown search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/user/users');
        if (response.ok) {
          const data = await response.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Set current date as last review date and calculate next review date
  useEffect(() => {
    if (!lastReviewDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setLastReviewDate(formattedDate);

      // Set next review date to 3 years from now
      const nextDate = new Date(today);
      nextDate.setFullYear(nextDate.getFullYear() + 3);
      setNextReviewDate(nextDate.toISOString().split('T')[0]);
    }
  }, [lastReviewDate]);

  // Fetch current user information
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/current');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          // Set RA Leader to current user's name
          setRaLeader(userData.user_name);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Load form data from API if formId exists
  useEffect(() => {
    const fetchFormData = async (id) => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/user/get_form3_data/${id}`);
        if (response.ok) {
          const data = await response.json();

          // Update form fields
          setTitle(data.title || "");
          setDivision(data.division || "");
          setLocation(data.location || "");
          setReferenceNumber(data.form_reference_number || "");
          setFormId(data.form_id);

          // Format dates if they exist
          if (data.last_review_date) {
            const lastDate = new Date(data.last_review_date);
            setLastReviewDate(lastDate.toISOString().split('T')[0]);
          }

          if (data.next_review_date) {
            const nextDate = new Date(data.next_review_date);
            setNextReviewDate(nextDate.toISOString().split('T')[0]);
          }

          // Set RA Team information
          if (data.team_data) {
            // Set leader
            if (data.team_data.leader) {
              setRaLeader(data.team_data.leader.user_name);
            }

            // Set team members
            if (data.team_data.members && data.team_data.members.length > 0) {
              setRaTeam(data.team_data.members.map(member => member.user_name));
            }
          }

          // Set approval information
          if (data.approved_by) {
            setApprovedBy(data.approved_by.user_name || "");
            setDesignation(data.approved_by.user_designation || "");
          }

          setDataLoaded(true);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize data from either formData prop or session
    if (formData && formData.form_id) {
      setFormId(formData.form_id);
      fetchFormData(formData.form_id);
    } else if (sessionData && sessionData.current_form_id) {
      setFormId(sessionData.current_form_id);
      fetchFormData(sessionData.current_form_id);
    } else {
      // No form_id found - this is a new form creation
      console.log("No form_id found, Form3 will create a new form");
      setDataLoaded(true);
    }
  }, [formData, sessionData]);

  // Fetch RA Team members from RA_team and RA_team_member tables
  const fetchRATeam = async (teamId) => {
    try {
      const response = await fetch(`/api/ra_team/${teamId}`);
      if (response.ok) {
        const teamData = await response.json();

        // Set RA Leader from RA_team
        if (teamData.leader) {
          setRaLeader(teamData.leader.user_name);
        }

        // Set RA Team members from RA_team_member
        if (teamData.members && teamData.members.length > 0) {
          setRaTeam(teamData.members.map(member => member.user_name));
        }
      }
    } catch (error) {
      console.error("Error fetching RA team:", error);
    }
  };

  // Fetch approver information
  const fetchApprover = async (approverId) => {
    try {
      const response = await fetch(`/api/user/${approverId}`);
      if (response.ok) {
        const userData = await response.json();
        setApprovedBy(userData.user_name || "");
        setDesignation(userData.user_designation || "");
      }
    } catch (error) {
      console.error("Error fetching approver:", error);
    }
  };

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter users based on search term
  const filteredUsers = usersList.filter(user =>
    user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers for RA Team
  const addTeamMember = () => setRaTeam([...raTeam, ""]);
  const removeTeamMember = (idx) => {
    if (raTeam.length <= 1) return;
    setRaTeam(raTeam.filter((_, i) => i !== idx));
  };
  const updateTeamMember = (idx, val) =>
    setRaTeam(raTeam.map((m, i) => (i === idx ? val : m)));

  // Handle user selection from dropdown
  const handleUserSelect = (user, idx) => {
    updateTeamMember(idx, user.user_name);
    setShowDropdown(false);
    setSearchTerm("");
  };

  // Handle focus on team member input
  const handleTeamMemberFocus = (idx) => {
    setActiveTeamMemberIndex(idx);
    setShowDropdown(true);
  };

  const hasDuplicateMembers = (members) => {
    // Remove empty values
    const nonEmptyMembers = members.filter(member => member.trim() !== "");

    // Check for duplicates
    const uniqueMembers = new Set(nonEmptyMembers);
    return uniqueMembers.size !== nonEmptyMembers.length;
  };

  const handleSave = async () => {
    try {
      // Only check for duplicates if there are non-empty team members
      const nonEmptyTeamMembers = raTeam.filter(member => member.trim() !== "");
      if (nonEmptyTeamMembers.length > 0 && hasDuplicateMembers(raTeam)) {
        alert("Error: Duplicate team members are not allowed. Please ensure each team member is unique.");
        return false;
      }
  
      setIsLoading(true);
  
      // Prepare form data
      const formData = {
        title,
        division,
        location,
        form_reference_number: referenceNumber,
        last_review_date: lastReviewDate,
        next_review_date: nextReviewDate,
        raLeader,
        raTeam: raTeam.filter(member => member.trim() !== ""),
        approvedBy,
        signature,
        designation
      };

      // Only include form_id if it exists (for updates)
      if (formId) {
        formData.form_id = formId;
      }

      // Call /form3 endpoint (which handles both creation and updates)
      const response = await fetch('/api/user/form3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Form saved successfully:", result);

        // Update formId if it was created (new form)
        if (result.action === 'created' && result.form_id) {
          setFormId(result.form_id);
        }

        // Update parent component if needed
        if (updateFormData) {
          updateFormData({
            ...formData,
            form_id: result.form_id
          });
        }

        // Show success message
        return true;
      } else {
        const errorData = await response.json();
        console.error("Error saving form:", errorData);
        alert(`Error: ${errorData.error || "Failed to save form"}`);
        return false;
      }
    } catch (error) {
      console.error("Error saving form:", error);
      alert("An error occurred while saving the form. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  // Update the ref to properly expose save and validation methods
  useEffect(() => {
    if (ref) {
      ref.current = {
        saveForm: async () => {
          try {
            // Only check for duplicates if there are non-empty team members
            const nonEmptyTeamMembers = raTeam.filter(member => member.trim() !== "");
            if (nonEmptyTeamMembers.length > 0 && hasDuplicateMembers(raTeam)) {
              alert("Error: Duplicate team members are not allowed. Please ensure each team member is unique.");
              return null;
            }
        
            setIsLoading(true);
        
            // Prepare form data
            const formData = {
              title,
              division,
              location,
              form_reference_number: referenceNumber,
              last_review_date: lastReviewDate,
              next_review_date: nextReviewDate,
              raLeader,
              raTeam: raTeam.filter(member => member.trim() !== ""),
              approvedBy,
              signature,
              designation
            };

            // Only include form_id if it exists (for updates)
            if (formId) {
              formData.form_id = formId;
            }

            // Call /form3 endpoint (which handles both creation and updates)
            const response = await fetch('/api/user/form3', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(formData),
            });

            if (response.ok) {
              const result = await response.json();
              console.log("Form saved successfully:", result);

              // Update formId if it was created (new form)
              const updatedFormId = result.form_id;
              if (result.action === 'created' && updatedFormId) {
                setFormId(updatedFormId);
              }

              // Update parent component if needed
              if (updateFormData) {
                updateFormData({
                  ...formData,
                  form_id: updatedFormId
                });
              }

              setIsLoading(false);
              
              // Return the saved form data with the correct form_id
              return {
                form_id: updatedFormId,
                title,
                division,
                location,
                form_reference_number: referenceNumber,
                last_review_date: lastReviewDate,
                next_review_date: nextReviewDate,
                raLeader,
                raTeam: raTeam.filter(member => member.trim() !== ""),
                approvedBy,
                signature,
                designation
              };
            } else {
              const errorData = await response.json();
              console.error("Error saving form:", errorData);
              alert(`Error: ${errorData.error || "Failed to save form"}`);
              setIsLoading(false);
              return null;
            }
          } catch (error) {
            console.error("Error saving Form 3:", error);
            alert("An error occurred while saving the form. Please try again.");
            setIsLoading(false);
            return null;
          }
        },
        validate: () => {
          // Validate required fields
          if (!title.trim()) {
            alert("Error: Title is required");
            return false;
          }
          
          if (!division.trim()) {
            alert("Error: Division is required");
            return false;
          }
          
          // Check for duplicate team members
          if (hasDuplicateMembers(raTeam)) {
            alert("Error: Duplicate team members are not allowed. Please ensure each team member is unique.");
            return false;
          }
          
          // Important: Always return true here for cases with no validation errors
          return true;
        },
        getData: () => ({
          form_id: formId,
          title,
          division,
          location,
          form_reference_number: referenceNumber,
          last_review_date: lastReviewDate,
          next_review_date: nextReviewDate,
          raLeader,
          raTeam: raTeam.filter(member => member.trim() !== ""),
          approvedBy,
          signature,
          designation
        }),
        goBack: () => {
          // No special handling needed for going back from Form 3
          return true;
        }
      };
    }
  }, [
    ref, formId, title, division, location, referenceNumber,
    lastReviewDate, nextReviewDate, raLeader, raTeam,
    approvedBy, signature, designation, hasDuplicateMembers, handleSave
  ]);
  
  return (
    <div className="space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <InputGroup
          label="Reference Number"
          id="ref-number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          disabled
        />
        <InputGroup
          label="Division"
          id="form3-division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
        />
        <InputGroup
          label="Title"
          id="form3-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <InputGroup
          label="Location"
          id="form3-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <InputGroup
          label="Last Review Date"
          id="last-review"
          type="date"
          value={lastReviewDate}
          onChange={(e) => setLastReviewDate(e.target.value)}
        />
        <InputGroup
          label="Next Review Date"
          id="next-review"
          type="date"
          value={nextReviewDate}
          onChange={(e) => setNextReviewDate(e.target.value)}
        />
        <InputGroup
          label="RA Leader"
          id="ra-leader"
          value={raLeader}
          onChange={(e) => setRaLeader(e.target.value)}
          disabled={true} // RA Leader is set to current user
        />
      </div>

      {/* RA Team */}
      <div className="space-y-2">
        <label className="block mb-1 text-sm text-gray-600">RA Team</label>
        {raTeam.map((member, idx) => (
          <div key={idx} className="flex items-center space-x-2 relative">
            <div className="flex-1 relative">
              <InputGroup
                label=""
                id={`ra-team-${idx}`}
                placeholder={`Team member ${idx + 1}`}
                value={member}
                onChange={(e) => {
                  updateTeamMember(idx, e.target.value);
                  setSearchTerm(e.target.value);
                }}
                onFocus={() => handleTeamMemberFocus(idx)}
                className="flex-1"
              />

              {showDropdown && activeTeamMemberIndex === idx && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto"
                >
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleUserSelect(user, idx)}
                      >
                        <div>{user.user_name}</div>
                        <div className="text-xs text-gray-500">{user.user_email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-500">No users found</div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeTeamMember(idx)}
              disabled={raTeam.length === 1}
              className={`bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center ${raTeam.length === 1 ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              <LuMinus />
            </button>
            <button
              type="button"
              onClick={addTeamMember}
              className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
            >
              <MdAdd />
            </button>
          </div>
        ))}
      </div>

      {/* Approval row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <InputGroup
          label="Approved by"
          id="approved-by"
          value={approvedBy}
          onChange={(e) => setApprovedBy(e.target.value)}
          disabled
        />
        <InputGroup
          label="Signature"
          id="signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          disabled
        />
        <InputGroup
          label="Designation"
          id="designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          disabled
        />
      </div>

      {/* Save button */}
      <div className="fixed bottom-6 right-6 z-50">
        <CTAButton
          text="Save"
          onClick={handleSave}
          className="px-6 py-2 shadow-lg"
          disabled={isLoading}
        />
      </div>
    </div>
  );
});

export default Form3;