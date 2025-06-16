import React from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoMdShareAlt } from "react-icons/io";
import { FiDownload } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { MdOutlineFileOpen } from "react-icons/md";


const tagColorMap = {
  Ongoing: "bg-blue-500 text-white",
  Pending: "bg-yellow-400 text-black",
  Completed: "bg-green-700 text-white",
};

export default function FormCardB({
  owner,
  date,
  title,
  tags = [],
  onOpen,
  onDownload,
  onDelete,
}) {
  const tagClass = (tag) =>
    tag?.startsWith("Exp")
      ? "bg-purple-600 text-white"
      : tagColorMap[tag] || "bg-gray-300 text-black";

  const avatarColor =
    tags[0]?.startsWith("Exp")
      ? "bg-purple-600"
      : tagColorMap[tags[0]]?.split(" ")[0] || "bg-gray-300";

  return (
    <div className="flex flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2 min-h-[80px] w-full max-w-full">
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${avatarColor} mr-3`} />
      {/* Main Content */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        {/* Owner and menu header */}
        <div className="flex items-center justify-start">
          <span className="font-medium text-sm text-black truncate mt-2">{owner}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 my-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded-full ${tagClass(tag)} truncate`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <div className="text-sm font text-black leading-tight line-clamp-1 mb-2">
          {title}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-2">
          <button onClick={onOpen} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-black hover:text-gray-700">
            <MdOutlineFileOpen className="text-sm" />
          </button>
          <button onClick={onDownload} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-black hover:text-gray-700">
            <FiDownload className="text-sm" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-black hover:text-gray-700">
            <RiDeleteBin6Line className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}