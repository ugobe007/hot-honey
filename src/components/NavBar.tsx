// src/components/NavBar.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavBar.css';

const NavBar: React.FC = () => {
  return (
    <nav className="nav-bar">
      <NavLink to="/" className="nav-link" end>
        Home
      </NavLink>
      <NavLink to="/portfolio" className="nav-link">
        Portfolio
      </NavLink>
      <NavLink to="/submit" className="nav-link">
        Deals
      </NavLink>
    </nav>
  );
};

export default NavBar;

