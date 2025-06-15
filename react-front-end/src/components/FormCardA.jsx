import React from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoMdShareAlt } from "react-icons/io";
import { FiDownload } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";

export default function FormCardA({
  status = "Ongoing",
  date = "19/05/2025",
  title = "Form Title",
  owner = "Form Owner",
  tags = [],
  onShare,
  onDownload,
  onDelete,
}) {
  const tagColorMap = {
    Ongoing: "bg-blue-500 text-white",
    Pending: "bg-yellow-400 text-black",
    Completed: "bg-green-700 text-white",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full flex flex-col justify-between min-h-[260px]">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${
            tags[0]?.startsWith("Expires")
              ? "bg-purple-600"
              : (tagColorMap[tags[0]]?.split(" ")[0] || "bg-gray-300")
          }`}></div>
          <div>
            <div className="text-sm font-medium text-black">{owner}</div>
            <div className="text-sm text-green-600">{date}</div>
          </div>
        </div>
        <BsThreeDotsVertical className="text-black text-lg cursor-pointer" />
      </div>

      <div className="flex mt-0">
        <div className="flex flex-col justify-between mb-0">
          <div className="text-md font-regular text-black leading-snug line-clamp-2 h-[3rem] overflow-hidden">
            {title}
          </div>
        </div>
      </div>

      <hr className="my-1 border-gray-300" />

      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`text-sm px-3 py-1 rounded-full ${
              tag?.startsWith("Expires")
                ? "bg-purple-600 text-white"
                : tagColorMap[tag] || "bg-gray-300 text-black"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onShare}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <IoMdShareAlt className="text-lg" />
        </button>
        <button
          onClick={onDownload}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <FiDownload className="text-lg" />
        </button>
        <button
          onClick={onDelete}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <RiDeleteBin6Line className="text-lg" />
        </button>
      </div>
    </div>
  );
}