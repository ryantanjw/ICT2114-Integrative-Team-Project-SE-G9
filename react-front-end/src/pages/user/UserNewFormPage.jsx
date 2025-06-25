import Header from "../../components/Header.jsx";
import { useLocation } from "react-router-dom";
import FormTabs from "./components/FormTabs.jsx";
import { useState } from "react";
import Form1 from "./components/Form1.jsx";
import Form2 from "./components/Form2.jsx";
import Form3 from "./components/Form3.jsx";
import ConfirmForm from "./components/ConfirmForm.jsx"; // will be used for Confirmation Details



export default function UserNewForm() {
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState(0);
  // Shared sampleEntry for both forms
  // in UserNewFormPage.jsx, inside your component:
const sampleEntry = {
  title: "Usage of X-ray Machines",
  division: "POD",
  processes: [
    {
      id: 1,
      processNumber: 1,
      header: "Practical Lesson and Projects",
      headerColor: "#EEF1F4",
      location: "Dover URC SR1C",
      activities: [
        {
          id: 1,
          description: "Conducting Practical Sessions",
          remarks: "Practice only, no live subjects.",
          hazards: [
            {
              id: 1,
              description: "Slip or Fall",
              type: ["Physical"],
              injuries: ["Sprains", "Bruises"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Wear safety shoes\n2) Keep area clear",
              additionalControls: "",
              severity: 2,
              likelihood: 3,
              rpn: 6
            }
          ]
        },
        {
          id: 2,
          description: "Group Project Workshops",
          remarks: "Student-led collaborative tasks.",
          hazards: [
            {
              id: 1,
              description: "Tool Misuse",
              type: ["Physical"],
              injuries: ["Cuts"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Provide tool training",
              additionalControls: "",
              severity: 3,
              likelihood: 2,
              rpn: 6
            }
          ]
        },
        {
          id: 3,
          description: "Data Analysis Review",
          remarks: "Analyze results from prior sessions.",
          hazards: [
            {
              id: 1,
              description: "Eye Strain",
              type: ["Physical"],
              injuries: ["Headache"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Take regular breaks",
              additionalControls: "",
              severity: 2,
              likelihood: 2,
              rpn: 4
            }
          ]
        }
      ]
    },
    {
      id: 2,
      processNumber: 2,
      header: "Laboratory Demonstrations",
      headerColor: "#EEF1F4",
      location: "Central Lab",
      activities: [
        {
          id: 1,
          description: "Microscope Handling",
          remarks: "Clean lenses after use.",
          hazards: [
            {
              id: 1,
              description: "Glass breakage",
              type: ["Physical"],
              injuries: ["Cuts"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Handle with care\n2) Store properly",
              additionalControls: "",
              severity: 2,
              likelihood: 2,
              rpn: 4
            }
          ]
        },
        {
          id: 2,
          description: "Chemical Preparation",
          remarks: "Mix solutions under fume hood.",
          hazards: [
            {
              id: 1,
              description: "Chemical Exposure",
              type: ["Chemicals"],
              injuries: ["Burns", "Irritation"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Use gloves\n2) Work in fume hood",
              additionalControls: "",
              severity: 3,
              likelihood: 2,
              rpn: 6
            }
          ]
        },
        {
          id: 3,
          description: "Spectrometer Calibration",
          remarks: "Ensure device is properly zeroed.",
          hazards: [
            {
              id: 1,
              description: "Electrical Shock",
              type: ["Electrical"],
              injuries: ["Shock"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Ensure power is off before calibrating",
              additionalControls: "",
              severity: 4,
              likelihood: 1,
              rpn: 4
            }
          ]
        },
        {
          id: 4,
          description: "Sample Incubation",
          remarks: "Monitor temperature and time.",
          hazards: [
            {
              id: 1,
              description: "Burns from hot surfaces",
              type: ["Physical"],
              injuries: ["Burns"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Use heat-resistant gloves",
              additionalControls: "",
              severity: 2,
              likelihood: 2,
              rpn: 4
            }
          ]
        }
      ]
    },
    {
      id: 3,
      processNumber: 3,
      header: "Safety Training",
      headerColor: "#EEF1F4",
      location: "Training Room",
      activities: [
        {
          id: 1,
          description: "Fire Drill Procedures",
          remarks: "Mandatory attendance.",
          hazards: [
            {
              id: 1,
              description: "Tripping during evacuation",
              type: ["Physical"],
              injuries: ["Sprains"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Clear evacuation routes",
              additionalControls: "",
              severity: 2,
              likelihood: 2,
              rpn: 4
            }
          ]
        },
        {
          id: 2,
          description: "First Aid Basics",
          remarks: "Certified instructor session.",
          hazards: [
            {
              id: 1,
              description: "Incorrect application of aid",
              type: ["Physical"],
              injuries: ["Worsened injury"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Instructor supervision",
              additionalControls: "",
              severity: 2,
              likelihood: 1,
              rpn: 2
            }
          ]
        },
        {
          id: 3,
          description: "Equipment Shutdown",
          remarks: "Learn safe power-off steps.",
          hazards: [
            {
              id: 1,
              description: "Electrical hazard",
              type: ["Electrical"],
              injuries: ["Shock"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Follow shutdown procedures",
              additionalControls: "",
              severity: 3,
              likelihood: 1,
              rpn: 3
            }
          ]
        }
      ]
    },
    {
      id: 4,
      processNumber: 4,
      header: "Equipment Maintenance",
      headerColor: "#EEF1F4",
      location: "Maintenance Bay",
      activities: [
        {
          id: 1,
          description: "Routine Inspection",
          remarks: "Check for wear and tear.",
          hazards: [
            {
              id: 1,
              description: "Contact with moving parts",
              type: ["Physical"],
              injuries: ["Pinch injuries"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Power off before inspection",
              additionalControls: "",
              severity: 2,
              likelihood: 2,
              rpn: 4
            }
          ]
        },
        {
          id: 2,
          description: "Filter Replacement",
          remarks: "Change X-ray tube filters.",
          hazards: [
            {
              id: 1,
              description: "Radiation exposure",
              type: ["Physical"],
              injuries: ["Radiation burns"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Shielding and PPE",
              additionalControls: "",
              severity: 4,
              likelihood: 1,
              rpn: 4
            }
          ]
        },
        {
          id: 3,
          description: "Software Update",
          remarks: "Install latest patches.",
          hazards: [
            {
              id: 1,
              description: "System crash",
              type: ["Physical"],
              injuries: ["Data loss"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Backup before update",
              additionalControls: "",
              severity: 2,
              likelihood: 1,
              rpn: 2
            }
          ]
        },
        {
          id: 4,
          description: "Performance Testing",
          remarks: "Validate output and safety metrics.",
          hazards: [
            {
              id: 1,
              description: "Exposure to high voltage",
              type: ["Electrical"],
              injuries: ["Shock"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Insulated tools required",
              additionalControls: "",
              severity: 3,
              likelihood: 1,
              rpn: 3
            }
          ]
        },
        {
          id: 5,
          description: "Report Generation",
          remarks: "Document all maintenance steps.",
          hazards: [
            {
              id: 1,
              description: "Eye fatigue",
              type: ["Physical"],
              injuries: ["Eye strain"],
              newInjury: "",
              newType: "",
              showTypeInput: false,
              showInjuryInput: false,
              existingControls: "1) Take breaks during report writing",
              additionalControls: "",
              severity: 1,
              likelihood: 2,
              rpn: 2
            }
          ]
        }
      ]
    }
  ],
};

  return (
    <div className="bg-[#F7FAFC] min-h-screen max-w-screen overflow-x-hidden 2xl:px-40 px-5">
      <Header activePage={location.pathname} />
      <div className="flex flex-col justify-start mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          RA Form Submission
        </h3>
        <div className="mt-5"><FormTabs onTabChange={setCurrentTab} />
        </div>
        <div className="mt-6">
          {currentTab === 0 && <Form1 sample={sampleEntry} />}
          {currentTab === 1 && <Form2 sample={sampleEntry} />}
          {currentTab === 2 && <Form3 sample={sampleEntry} />}      
          {currentTab === 3 && <ConfirmForm />}                     
        </div>
      </div>
    </div>
  );
}