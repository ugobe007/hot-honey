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
      <div className="bg-gradient-to-r from-purple-900 to-purple-700 rounded-2xl shadow-2xl border-2 border-purple-500/50 p-4">
        <div className="text-xs font-bold text-purple-200 mb-2 text-center">🔐 ADMIN</div>
        <div className="flex flex-col gap-2">
          <Link
            to="/admin/setup"
            className={`flex items-center justify-center font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'setup'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-purple-500/50 text-white hover:bg-purple-500'
            }`}
            style={{ width: '140px', height: '40px', borderRadius: '20px' }}
          >
            🔧 DB Setup
          </Link>
          <Link
            to="/invite-investor"
            className={`flex items-center justify-center font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'invite'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-purple-500/50 text-white hover:bg-purple-500'
            }`}
            style={{ width: '140px', height: '40px', borderRadius: '20px' }}
          >
            ➕ Add Investor
          </Link>
          <Link
            to="/admin/review"
            className={`flex items-center justify-center font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'review'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-purple-500/50 text-white hover:bg-purple-500'
            }`}
            style={{ width: '140px', height: '40px', borderRadius: '20px' }}
          >
            📋 Review Queue
          </Link>
          <Link
            to="/admin/edit-startups"
            className={`flex items-center justify-center font-bold text-sm whitespace-nowrap transition-all ${
              currentPage === 'edit'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-purple-500/50 text-white hover:bg-purple-500'
            }`}
            style={{ width: '140px', height: '40px', borderRadius: '20px' }}
          >
            ✏️ Edit Startups
          </Link>
        </div>
      </div>
    </div>
  );
}
