import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import ActionCard from "../../components/ActionCard.jsx";
import DatabaseTabs from "./components/DatabaseTabs.jsx";
import FormCardC from "../../components/FormCardC.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";

export default function AdminDB() {
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState(0);
  const [expandedCardIndex, setExpandedCardIndex] = useState(null);

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden px-5 2xl:px-40 pb-10">
      {/* Header */}
      <HeaderAdmin activePage={location.pathname} />

      {/* Page Title */}
      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          Database Management
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
          {/* Optional: Action cards can go here */}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <DatabaseTabs onTabChange={setCurrentTab} />
      </div>

      {/* Cards */}
      {currentTab === 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 my-6 w-full items-start">
          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />

          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />

          <FormCardC
            status="Unapproved"
            date="19/05/2025"
            title="Usage of Z-ray Machines"
            owner="Dave Timothy Johnson"
            isExpanded={expandedCardIndex === 0}
            onToggle={() =>
              setExpandedCardIndex(expandedCardIndex === 0 ? null : 0)
            }
            onApproveHazard={() => console.log("Hazard approved: Z-ray")}
            onApproveRisk={() => console.log("Risk approved: Z-ray")}
          />
        </div>
      )}
    </div>
  );
}
