import Header from "../../components/Header.jsx";
import { useLocation } from "react-router-dom";
import FormTabs from "./components/FormTabs.jsx";
import { useState } from "react";



export default function UserNewForm() {
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState(0);
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <Header activePage={location.pathname} />
      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-3xl font-semibold">
          RA Form Submission
        </h3>
        <div className="mt-5"><FormTabs onTabChange={setCurrentTab} />
        </div>
        <div className="mt-6">
          {currentTab === 0 && <div>📋 Form 1 - WA Inventory</div>}
          {currentTab === 1 && <div>📝 Form 2 - RA</div>}
          {currentTab === 2 && <div>✅ Confirmation</div>}
        </div>
      </div>
    </div>
  );
}