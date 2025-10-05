import React from 'react';
// import './Nav.css';
import logo from '../assets/logo.png';


import { useNavigate } from "react-router-dom";

const Nav = ({ onLogout, isAuth }) => {
  const navigate = useNavigate();
  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };
  return (
    <nav className="bg-gradient-to-r from-purple-100 to-purple-200 sticky top-0 z-20 w-full px-4 sm:px-6 lg:px-8 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Name */}
        <div className="flex items-center space-x-4">
          <img src={logo} alt="Logo" className="h-12 sm:h-16 transition-transform hover:scale-110" />
          <h1 className="text-purple-700 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider">Divine Energy Hub</h1>
        </div>
        {isAuth && (
          <button
            onClick={handleLogout}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}

export default Nav;