import React from 'react';
import LogoDropdownMenu from './LogoDropdownMenu';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * AdminLayout - Clean wrapper for admin pages
 * Per DESIGN_SYSTEM.md: ALL menus must be hamburger menus (LogoDropdownMenu)
 * NO sidebars, NO header bars, NO footer bars for navigation
 */
export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#121212]">
      <LogoDropdownMenu />
      <main className="w-full">
        {title && (
          <header className="px-6 py-4 pt-20">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </header>
        )}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
