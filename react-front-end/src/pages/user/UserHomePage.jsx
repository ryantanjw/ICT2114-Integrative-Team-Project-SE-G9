import Header from "../../components/Header.jsx";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import { MdNoteAdd } from "react-icons/md";



export default function UserHome() {
  const location = useLocation();
  const navigate = useNavigate();
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
        </div>
    </div>
  );
}