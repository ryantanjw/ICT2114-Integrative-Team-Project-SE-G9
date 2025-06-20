import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";


export default function AdminHome() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
        <div className="flex flex-col justify-start mb-5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                Available Actions (Admin)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
                <ActionCard
                    header="Account Enrolment"
                    subtext="Grant new personnel access to risk assessments"
                    onStart={() => alert("Account Enrolment clicked!")}
                    icon={<MdPeople className="text-3xl" />}
                />
                <ActionCard
                    header="User Management"
                    subtext="Manage personnel account information"
                    onStart={() => alert("Manage Users clicked!")}
                    icon={<BiSolidUserAccount className="text-3xl" />}
                    startText = "Manage"
                />
                <ActionCard
                    header="View Forms"
                    subtext="Manage risk assessment forms"
                    onStart={() => alert("View Forms clicked!")}
                    icon={<IoMdDocument className="text-3xl" />}
                    startText = "View"
                />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mt-8">
            Recent Forms
            </h3>
        </div>
    </div>
  );
}