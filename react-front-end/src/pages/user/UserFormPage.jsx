import Header from "../../components/Header.jsx";
import { useLocation } from "react-router-dom";
import SearchBar from "../../components/SearchBar.jsx";



export default function UserForm() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <Header activePage={location.pathname} />
        <div className="flex flex-col justify-start mb-5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                All Forms
            </h3>
            <SearchBar></SearchBar>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6">
            </div>
        </div>
    </div>
  );
}