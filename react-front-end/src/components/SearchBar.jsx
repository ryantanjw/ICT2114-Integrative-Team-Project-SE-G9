import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";

export default function SearchBar({ onSearch, placeholder = "Search...", initialValue = "" }) {
  const [searchText, setSearchText] = useState("");
  
  // Add debounce for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Search term changed to:", searchText);
      onSearch(searchText);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchText]);

  // Update local state when initialValue changes
  useEffect(() => {
    setSearchText(initialValue);
  }, [initialValue]);

  
  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FaSearch className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder={placeholder}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      {searchText && (
        <button 
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          onClick={() => {
            setSearchText("");
            onSearch("");
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}