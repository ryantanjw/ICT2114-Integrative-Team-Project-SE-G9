import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>ℹ️ About Page</h1>
      <p>
        This is a temporary “About” page.  
        Click below to return to Home:
      </p>
      <Link to="/">
        <button>Back to Home</button>
      </Link>
    </div>
  );
}