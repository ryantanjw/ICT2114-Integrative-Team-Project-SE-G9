import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation } from "react-router-dom";
import ActionCard from "../../components/ActionCard.jsx";
import { MdPeople } from "react-icons/md";
import { BiSolidUserAccount } from "react-icons/bi";
import { IoMdDocument } from "react-icons/io";
import CTAButton from "../../components/CTAButton.jsx";
import { FaPlus } from "react-icons/fa";
import SearchBar from "../../components/SearchBar.jsx";
import UserTable from "./components/TableLayout.jsx";

export default function AdminUser() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
        <div className="flex items-center justify-between mt-5 mb-5">
          <h3 className="text-3xl font-semibold">User Management</h3>
          <CTAButton
            icon={<FaPlus />}
            text="Add User"
            onClick={() => console.log("Add User clicked")}
          />
        </div>
        <SearchBar></SearchBar>
        <UserTable
          users={[
            { name: "Dave Timothy Johnson", email: "davejohnson@sit.singaporetech.edu.sg" },
            { name: "Andrew Jones Johnson", email: "JoneJohnson@sit.singaporetech.edu.sg" },
            { name: "Charlie David James", email: "Charliedavid@sit.singaporetech.edu.sg" }
          ]}
          onRemove={(user) => console.log("Remove", user)}
          onReset={(user) => console.log("Reset", user)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
        </div>
    </div>
  );
}