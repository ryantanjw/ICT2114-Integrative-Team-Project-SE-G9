import React, { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";

export default function SearchBar({ value = "", onChange }) {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const clearInput = () => {
    setInputValue("");
    onChange?.("");
  };

  return (
    <div className="flex items-center w-full border border-[#D5D5D5] rounded-lg bg-white px-4 mt-5 py-2">
      <FiSearch className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder="Search"
        value={inputValue}
        onChange={handleInputChange}
        className="flex-grow outline-none text-gray-700"
      />
      {inputValue && (
        <>
          <button
            onClick={clearInput}
            className="text-sm text-gray-500 mr-1 hover:underline"
          >
            Clear
          </button>
          <IoMdClose
            onClick={clearInput}
            className="cursor-pointer text-gray-500"
          />
        </>
      )}
    </div>
  );
}
