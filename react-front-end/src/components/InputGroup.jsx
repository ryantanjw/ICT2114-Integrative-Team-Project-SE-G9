import React, { useState } from "react";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";

export default function InputGroup({
  label,
  id,
  type = "text",
  placeholder = "",
  value,
  onChange,
  action,                // new prop for secondary action
  className = "",
  options = [],
  error = "",
  keepWhiteWhenDisabled = false,  // new prop to keep background white when disabled
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`mb-4 ${className}`}>
      {action ? (
        <div className="flex justify-between items-center mb-2">
          <label
            htmlFor={id}
            className="text-base text-gray-600"
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
          className="block mb-2 text-base text-gray-600"
        >
          {label}
        </label>
      )}

      {type === "select" ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          className={`block w-full px-4 py-2 border border-gray-200 rounded-md focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40 ${
            rest.disabled && !keepWhiteWhenDisabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700'
          }`}
          {...rest}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "password" ? (
        <div className="relative">
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`block w-full pr-10 px-4 py-2 placeholder-gray-400 border border-gray-200 rounded-md focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40 ${
              rest.disabled 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-gray-700'
            }`}
            {...rest}
          />
          <span
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-500"
            onMouseDown={() => setShowPassword(true)}
            onMouseUp={() => setShowPassword(false)}
            onMouseLeave={() => setShowPassword(false)}
          >
            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </span>
        </div>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`block w-full px-4 py-2 placeholder-gray-400 border border-gray-200 rounded-md focus:border-blue-400 focus:ring-blue-400 focus:outline-none focus:ring focus:ring-opacity-40 ${
            rest.disabled 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700'
          }`}
          {...rest}
        />
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500 text-right">
          {error}
        </p>
      )}
    </div>
  );
}