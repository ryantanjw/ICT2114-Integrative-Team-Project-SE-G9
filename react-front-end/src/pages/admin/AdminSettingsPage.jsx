import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";


export default function AdminSetting() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
        <div className="flex flex-col justify-start mb-5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
            </div>
        </div>
    </div>
  );
}