import React from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoMdShareAlt } from "react-icons/io";
import { FiDownload, FiCopy, FiEye } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";

export default function FormCardA2({
  status = "Incomplete",
  date = "19/05/2025",
  title = "Form Title",
  owner = "Form Owner",
  expiryDate = "-",
  onView,
  onDownload,
  onDelete,
}) {

  const tagColorMap = {
    Incomplete: "bg-blue-500 text-white",
    Completed: "bg-green-700 text-white",
    "review due": "bg-red-500 text-white",

  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-md w-full flex flex-col justify-between min-h-[260px]">
      <div className="flex justify-between items-stretch mb-2">
        <div className="flex items-center space-x-2">
          {/* Colored status circle */}
          <div
            className={`w-10 h-10 rounded-full flex-none ${
              tagColorMap[status].split(" ")[0]
            }`}
          ></div>
          <div className="flex flex-col">
            {/* Status pill */}
            <div className="mt-1"> {/* This div is the flex item, contains the pill */}
                    <div className={`inline-block px-3 py-1 rounded-full text-sm ${ // Pill itself, now correctly inline-block within its parent
                        status === "Incomplete"
                        ? "bg-blue-500 text-white"
                        : status === "Completed"
                        ? "bg-green-700 text-white"
                        : "bg-yellow-400 text-black"
                    }`}
                    >
                    {status}
                </div>
            </div>
            {/* Date */}
            <div className="text-sm ml-2 mt-1">{date}</div>
          </div>
        </div>
        <BsThreeDotsVertical className="text-gray-500 cursor-pointer" />
      </div>
      <div className="h-6"> {/* h-14 for line clap 2 here */}
        <h3
          className="text-lg font-medium leading-snug break-words"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>
      </div>
      <hr className="my-1 border-gray-300" />
      <div className="text text-gray-700 my-2">{owner}</div>
      <div className="text text-gray-700 mb-4">Expiry Date: {expiryDate}</div>
      <div className="flex justify-between">
        <button onClick={onView} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <FiEye className="text-lg" />
        </button>
        <button onClick={onDownload} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <FiDownload className="text-lg" />
        </button>
        <button onClick={onDelete} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <RiDeleteBin6Line className="text-lg" />
        </button>
      </div>
    </div>
  );
}