import React from "react";

export default function UserTable({ users = [], onRemove, onReset }) {
  return (
    <div className="overflow-x-auto mt-6 border border-[#E2E2E2] rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Full Name ↓
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Email
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {users.map((user, idx) => (
            <tr key={idx}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {user.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                <button
                  onClick={() => onRemove?.(user)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
                <button
                  onClick={() => onReset?.(user)}
                  className="text-gray-700 hover:underline"
                >
                  Reset
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}