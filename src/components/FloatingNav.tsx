// src/components/FloatingNav.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const FloatingNav: React.FC = () => {
  return (
    <nav className="bg-gray-100 p-2 flex justify-center space-x-4 border-b fixed top-0 left-0 w-full z-10">
      <Link to="/home" className="text-gray-800 hover:text-orange-500 font-medium">Home</Link>
      <Link to="/vote" className="text-gray-800 hover:text-orange-500 font-medium">Vote</Link>
      <Link to="/deals" className="text-gray-800 hover:text-orange-500 font-medium">Hot Deals</Link>
      <Link to="/dashboard" className="text-gray-800 hover:text-orange-500 font-medium">Dashboard</Link>
    </nav>
  );
};

export default FloatingNav;
