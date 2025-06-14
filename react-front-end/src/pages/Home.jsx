import React, { useState, useEffect } from "react"; // Import useState and useEffect
import { Link } from "react-router-dom";

export default function Home() {
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
      <h1 className="text-4xl font-bold mb-4">🏠 Home Page</h1>
      <p className="text-lg text-gray-700 mb-6">
        This is a temporary “Home” page.
        If you are seeing this, then you are lost.
        Click below to go to the About page:
      </p>
      <Link to="/about">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Go to About
        </button>
      </Link>

      <div className="p-6 mt-8 space-y-4 border rounded shadow-md bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">Data from Flask Backend</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <p className="text-lg text-gray-800">
            **Message from Flask:** <span className="font-semibold">{message}</span>
          </p>
        )}
        <hr className="my-6 border-gray-300" />
        <h2 className="text-2xl font-semibold mb-4">Core Flowbite JS Interactivity Test</h2>

        {/* --- Flowbite Modal Integration (using data-attributes for JS interactivity) --- */}

        {/* Modal Trigger Button - This will open the modal */}
        <button
          type="button"
          data-modal-target="flowbite-default-modal"
          data-modal-toggle="flowbite-default-modal"
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Open Core Flowbite Modal
        </button>

        {/* The Modal Structure (copied from Flowbite HTML docs) */}
        <div
          id="flowbite-default-modal"
          tabIndex="-1"
          aria-hidden="true"
          className="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
        >
          <div className="relative p-4 w-full max-w-2xl max-h-full">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  My Core Flowbite Modal
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-gray"
                  data-modal-hide="flowbite-default-modal"
                >
                  <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                  </svg>
                  <span className="sr-only">Close modal</span>
                </button>
              </div>
              <div className="p-4 md:p-5 space-y-4">
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  This modal should open and close using Flowbite's core JavaScript.
                  Its styling is handled by Tailwind classes applied directly here.
                </p>
              </div>
              <div className="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                <button
                  type="button"
                  data-modal-hide="flowbite-default-modal"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                  Close Modal
                </button>
                <button
                  type="button"
                  className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-gray-200 rounded-lg border border-gray-200 hover:bg-gray-300 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}