import React from "react";

export default function InputGroup({
  label,
  id,
  type = "text",
  placeholder = "",
  value,
  onChange,
  action,                // new prop for secondary action
  className = "",
  ...rest
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {action ? (
        <div className="flex justify-between items-center mb-2">
          <label
            htmlFor={id}
            className="text-sm text-gray-600"
          >
            {label}
          </label>
          <span className="text-sm text-blue-500 hover:underline cursor-pointer">
            {action}
          </span>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="block mb-2 text-sm text-gray-600"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="block w-full px-4 py-2 text-gray-700 placeholder-gray-400 bg-[#F7F7F7] border border-gray-200 rounded-md  focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
        {...rest}
      />
    </div>
  );
}