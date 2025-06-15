import React from "react";
import { FaRegFileAlt } from "react-icons/fa";


export default function ActionCard({
  header,
  subtext,
  icon = <FaRegFileAlt />,
  onStart,
  startText = "Start",
}) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-5 flex flex-col justify-between">
      {/* Header and icon */}
      <div className="flex justify-between items-start">
        <div>
          <h5 className="text-base sm:text-lg xl:text-xl font-semibold">{header}</h5>
          <p className="mt-2 text-base text-gray-600">{subtext}</p>
        </div>
        <div className="text-3xl">
          {icon}
        </div>
      </div>

      {/* Start button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onStart}
          className="px-6 py-2 bg-gray-200 font-medium text-black rounded-full hover:bg-gray-300 focus:outline-none text-sm sm:text-base"
        >
          {startText}
        </button>
      </div>
    </div>
  );
}
