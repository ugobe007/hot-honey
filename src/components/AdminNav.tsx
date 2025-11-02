import { Link } from 'react-router-dom';

interface AdminNavProps {
  currentPage?: string;
}

export default function AdminNav({ currentPage }: AdminNavProps) {
  // TODO: Add actual admin authentication check
  const isAdmin = true; // For now, always show admin links

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl shadow-2xl border-2 border-red-400/50 p-4">
        <div className="text-xs font-bold text-red-200 mb-2 text-center">🔐 ADMIN</div>
        <div className="flex flex-col gap-2">
          <Link
            to="/admin/setup"
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'setup'
                ? 'bg-white text-red-600 shadow-lg'
                : 'bg-red-500/50 text-white hover:bg-red-500'
            }`}
          >
            🔧 DB Setup
          </Link>
          <Link
            to="/invite-investor"
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'invite'
                ? 'bg-white text-red-600 shadow-lg'
                : 'bg-red-500/50 text-white hover:bg-red-500'
            }`}
          >
            ➕ Add Investor
          </Link>
          <Link
            to="/admin/review"
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'review'
                ? 'bg-white text-red-600 shadow-lg'
                : 'bg-red-500/50 text-white hover:bg-red-500'
            }`}
          >
            📋 Review Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
