import HeaderAdmin from "../../components/HeaderAdmin.jsx";
import { useLocation } from "react-router-dom";
import { IoMdRefresh } from "react-icons/io";
import CTAButton from "../../components/CTAButton.jsx";
import SearchBar from "../../components/SearchBar.jsx";
import FormCardA from "../../components/FormCardA.jsx";
import FormCardB from "../../components/FormCardB.jsx";
import FormCardA2 from "../../components/FormCardA2.jsx";


export default function AdminForm() {
  const location = useLocation();
  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <HeaderAdmin activePage={location.pathname} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Form Management</h3>
          <CTAButton
            icon={<IoMdRefresh />}
            text="Refresh Forms"
            onClick={() => console.log("Refresh Forms clicked")}
            className="w-full sm:w-auto"
          />
        </div>
        <SearchBar></SearchBar>

         {/* Style B */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6 w-full">
              <FormCardB
                owner="Jane Doe"
                title="Advanced Techniques in Radiation Therapy for Oncology Patients"
                tags={["Ongoing","22/05/2025"]}
                onOpen={() => console.log("Open")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardB
                owner="Emily Johnson"
                title="Innovative Approaches to Radiation Dose Optimization in Pediatric Imaging"
                tags={["Pending","23/05/2025"]}
                onOpen={() => console.log("Open")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardB
                owner="Michael Brown"
                date="24/05/2025"
                title="Radiation Safety Protocols for Interventional Radiology Procedures"
                tags={["Completed", "24/06/2023","Exp 24/06/2025"]}
                onOpen={() => console.log("Open")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
        </div>

        {/* Style A */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mt-6 w-full">
              <FormCardA
                date="19/05/2025"
                title="Comprehensive Utilization of Z-Ray Machines in Advanced Medical Imaging and Enhanced Safety Protocols for Diagnostic Accuracy and Patient Protection"
                owner="Dave Timothy Johnson"
                tags={["Ongoing"]}
                onShare={() => console.log("Share")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardA
                date="20/05/2025"
                title="Comprehensive Radiation Safety Training for Medical Staff"
                owner="Alice Smith"
                tags={["Completed", "Expires 20/06/2025"]}
                onShare={() => console.log("Share")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardA
                date="21/05/2025"
                title="Routine and Emergency Maintenance Procedures for Radiation Equipment"
                owner="John Doe"
                tags={["Pending"]}
                onShare={() => console.log("Share")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
        </div>

        {/* Style A2 */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 my-6 w-full">
              <FormCardA2
                status="Ongoing"
                date="19/05/2025"
                title="Advanced Techniques in Radiation Therapy for Oncology Patients"
                owner="Jane Doe"
                expiryDate="-"
                onView={() => console.log("View")}
                onShare={() => console.log("Share")}
                onDuplicate={() => console.log("Duplicate")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardA2
                status="Pending"
                date="20/05/2025"
                title="Innovative Approaches to Radiation Dose Optimization in Pediatric Imaging"
                owner="Emily Johnson"         
                expiryDate="-"
                onView={() => console.log("View")}
                onShare={() => console.log("Share")}
                onDuplicate={() => console.log("Duplicate")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
              <FormCardA2
                status="Completed"
                date="21/05/2025"   
                title="Radiation Safety Protocols for Interventional Radiology Procedures"
                owner="Michael Brown"
                expiryDate="24/06/2025"
                onView={() => console.log("View")}
                onShare={() => console.log("Share")}
                onDuplicate={() => console.log("Duplicate")}
                onDownload={() => console.log("Download")}
                onDelete={() => console.log("Delete")}
              />
        </div>
        
    </div>
  );
}