import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";
import { FaBars } from "react-icons/fa";

export default function Header({ activePage = "" }) {
    const [collapsed, setCollapsed] = useState(
      () => window.matchMedia("(max-width: 1535px)").matches
    );
    // auto-collapse under lg breakpoint (1024px)
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 1535px)");
      const onChange = (e) => setCollapsed(e.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    return (
        <>
            <header className="flex items-center justify-between mt-5 py-4">
                <img src="/SIT-logo.png" alt="SIT Logo" className="h-15 sm:h-20" />
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label="Toggle sidebar"
                    className="p-2 bg-white rounded shadow-md"
                >
                    <FaBars className="text-xl sm:text-2xl" />
                </button>
            </header>
            <NavBar
                activePage={activePage}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
            />
        </>
    );
}