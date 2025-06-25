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
  error = "",
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
        className="block w-full px-4 py-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-md  focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40"
        {...rest}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500 text-right">
          {error}
        </p>
      )}
    </div>
  );
}