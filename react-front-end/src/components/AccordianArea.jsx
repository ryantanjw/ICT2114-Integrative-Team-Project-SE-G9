import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function AccordionArea({ title, children, className = "" }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <button
        type="button"
        className="w-full bg-gray-100 rounded-t-lg px-4 py-3 flex items-center justify-between hover:bg-gray-200 focus:outline-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-semibold text-lg">{title}</span>
        {expanded ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {expanded && (
        <div className="bg-white p-4 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  );
}