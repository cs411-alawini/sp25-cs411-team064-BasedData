import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">Curriculum Crafter</div>
      <ul className="nav-links">
        <li>
          <Link to="/" className="link">Home</Link>
        </li>
        <li>
          <Link to="/add-course" className="link">Add Course</Link>
        </li>
        <li>
          <Link to="/login" className="link">Login</Link>
        </li>
        {/* <li>
          <Link to="/student-plans" className="link">Student Plans</Link>
        </li>
        <li>
          <Link to="/plan-details" className="link">Plan Details</Link>
        </li> */}
        <li>
          <Link to="/combinedpage" className="link">My Academic Plans</Link>
        </li>
        <li>
          <Link to="/courses" className="link">Courses</Link>
        </li>
        <li>
          <Link to="/prerequisites" className="link">Prerequisites</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
