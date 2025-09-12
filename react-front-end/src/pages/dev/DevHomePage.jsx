import React, { useState, useEffect } from "react"; // Import useState and useEffect
import { Link } from "react-router-dom";

export default function DevHome() {
  const [message, setMessage] = useState("Loading message from Flask..."); // State to hold the fetched message
  const [error, setError] = useState(null); // State to hold any error

  useEffect(() => {
    // Function to fetch data from Flask API
    const fetchFlaskMessage = async () => {
      try {
        // Make sure your Flask backend is running on a specific port, e.g., 5000
        // Adjust the URL if your Flask app is on a different host/port
        const response = await fetch('/api/hello'); // Assuming React dev server proxies to Flask, or Flask is on the same origin

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMessage(data.message); // Set the message from the Flask response
      } catch (e) {
        console.error("Error fetching data from Flask:", e);
        setError("Failed to load message. Please check Flask server.");
      }
    };

    fetchFlaskMessage(); // Call the fetch function when the component mounts
  }, []); // Empty dependency array means this effect runs once after the initial render

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Dev Development Page</h1>
      <p className="text-lg text-gray-700 mb-6">
        This is a temporary “Dev” page.
        If you are seeing this, then you are lost.
        Click below to go to the About page:
      </p>
      <Link to="/about">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Go to About
        </button>
      </Link>

      {/* Section to display message from Flask backend */}
      <div className="mt-8 space-y-4 border border-gray-300 p-4 rounded bg-white shadow">
        <h2 className="text-2xl font-semibold mb-4">Data from Flask Backend</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <p className="text-lg text-gray-800">
            **Message from Flask:** <span className="font-semibold">{message}</span>
          </p>
        )}

      </div>

      {/* Links to other dev pages */}
      <ul className="space-y-4 mt-4 border border-gray-300 p-4 rounded bg-white shadow">
        <li>
          <Link to="/dev/db" className="text-blue-500 hover:underline">Database Page (/dev/db) </Link>
        </li>
      </ul>

    </div>
  );
}