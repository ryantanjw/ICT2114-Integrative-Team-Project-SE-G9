import Header from "../../components/Header.jsx";
import { useLocation } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";


export default function UserHome() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden lg:px-40 px-5">
      <Header activePage={location.pathname} />
        <div className="flex flex-col justify-start mb-5">
            <h3 className="xl:text-3xl text-2xl font-semibold">
                Available Actions
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
            <h3 className="xl:text-3xl text-2xl font-semibold mt-8">
            Recent Forms
            </h3>
        </div>
    </div>
  );
}