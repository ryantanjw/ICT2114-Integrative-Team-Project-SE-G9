import React, { useEffect, useState, useRef, forwardRef } from "react";
import Header from "../../components/Header.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import { MdNoteAdd } from "react-icons/md";
import FormCardA2 from "../../components/FormCardA2.jsx";
import ShareDialogue from "../../components/ShareDialogue.jsx";
import DownloadDialogue from "../../components/DownloadDialogue.jsx";

export default function DevUserPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    role: 1
  });
  const [forms, setForms] = useState([
    {
      id: 101,
      title: "Fire Safety Risk Assessment",
      owner: "John Doe",
      status: "Draft",
      created_at: "2026-01-10",
      last_access_date: "2026-02-10",
      next_review_date: "2026-06-10",
      tags: ["Safety", "Fire"]
    },
    {
      id: 102,
      title: "Electrical Hazard Inspection",
      owner: "Jane Smith",
      status: "Submitted",
      created_at: "2026-01-15",
      last_access_date: "2026-02-12",
      next_review_date: "2026-07-01",
      tags: ["Electrical"]
    },
    {
      id: 103,
      title: "Workplace Ergonomics Review",
      owner: "Alex Tan",
      status: "Approved",
      created_at: "2026-01-20",
      last_access_date: "2026-02-14",
      next_review_date: "2026-08-01",
      tags: ["Ergonomics", "Office"]
    }
  ]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // User search functionality
  const [usersList, setUsersList] = useState([]);
  const [activeTeamMemberIndex, setActiveTeamMemberIndex] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Share form functionality
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedDownloadFormId, setSelectedDownloadFormId] = useState(null);
  const [selectedFormTitle, setSelectedFormTitle] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

 const handleDownload = (formId, formTitle) => {
  console.log(`Preparing download for form: ${formTitle} (ID: ${formId})`);
  setSelectedDownloadFormId(formId);
  setSelectedFormTitle(formTitle);
  setIsDownloadDialogOpen(true);
};

const handleView = async (formId) => {
  console.log(`Redirecting user to form with ID: ${formId}`);
  navigate(`/user/new/${formId}`);
}

const handleShare = (formId) => {
  console.log("=== handleShare called ===");
  console.log("Received formId:", formId);
  console.log("Setting selectedFormId to:", formId);
  
  setSelectedFormId(formId);
  setIsShareDialogOpen(true);
  
  console.log("Dialog should now be open");
  console.log("selectedFormId state:", selectedFormId); // Note: This might still show old value due to async state
};

const handleShareSubmit = async (formId, sharedUsers) => {
  console.log(`(Placeholder) Sharing form ${formId} with users:`, sharedUsers);
  alert("Placeholder: Form shared successfully!");
  setIsShareDialogOpen(false);
  setSelectedFormId(null);
};

const handleDuplicate = async (formId) => {
  alert("Placeholder: Form duplicated successfully!");
}

const handleDelete = async (formId) => {
  alert("Placeholder: Form deleted successfully!");
};

  // Show loading indicator while checking session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <Header activePage={location.pathname} />
      <div className="flex flex-col justify-start mb-5">
       
        
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          Available Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
          <ActionCard
            header="Create New Form"
            subtext="Submit risk assessment for potential hazards"
            onStart={() => navigate("/user/new")}
            icon={<MdNoteAdd className="text-3xl" />}
          />
        </div>
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-8">
          Recent Forms
        </h3>

        {/* Results Summary */}
        {forms.length > 0 && (
          <div className="mt-4 mb-4 text-sm text-gray-600">
            Showing {Math.min(9, forms.length)} most recent forms
          </div>
        )}

        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {forms.map((form) => (
              <FormCardA2
                key={form.id}
                formId={form.id}
                currentUser={userData}
                date={formatDate(form.last_access_date || form.created_at)}
                expiryDate={formatDate(form.next_review_date)}
                title={form.title}
                owner={form.owner}
                tags={form.tags}
                status={form.status}
                onDuplicate={() => handleDuplicate(form.id)}
                onView={() => handleView(form.id)}
                onShare={() => handleShare(form.id)}
                onDownload={() => handleDownload(form.id, form.title)}
                onDelete={() => handleDelete(form.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {isShareDialogOpen && (
        <ShareDialogue
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedFormId(null);
          }}
          formId={selectedFormId}
          currentUser={userData}
          onShare={handleShareSubmit}
        />
      )}

      {isDownloadDialogOpen && (
        <DownloadDialogue
          isOpen={isDownloadDialogOpen}
          onClose={() => {
            setIsDownloadDialogOpen(false);
            setSelectedDownloadFormId(null);
          }}
          formId={selectedDownloadFormId}
          formTitle={selectedFormTitle}
        />
      )}
    </div>
  );
}