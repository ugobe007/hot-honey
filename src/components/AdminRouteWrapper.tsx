import React from 'react';
import { Outlet } from 'react-router-dom';
import LogoDropdownMenu from './LogoDropdownMenu';

/**
 * AdminRouteWrapper - Clean wrapper for admin routes
 * Per DESIGN_SYSTEM.md: ALL menus must be hamburger menus (LogoDropdownMenu)
 * NO sidebars, NO header bars, NO footer bars for navigation
 */
export function AdminRouteWrapper() {
  return (
    <div className="min-h-screen bg-[#121212]">
      <LogoDropdownMenu />
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminRouteWrapper;
