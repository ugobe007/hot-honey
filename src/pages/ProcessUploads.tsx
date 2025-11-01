import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCard';

interface PendingStartup {
  id: string;
  name: string;
  tagline: string;
  pitch: string;
  fivePoints: string[];
  website?: string;
  funding?: string;
  stage?: number;
  industry?: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  source?: string;
}

export default function ProcessUploads() {
  const navigate = useNavigate();
  const [pendingStartups, setPendingStartups] = useState<PendingStartup[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  // Check admin access
  const isAdmin = () => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      return profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin;
    }
    return false;
  };

  // Load pending uploads from localStorage (will be replaced with MongoDB)
  useEffect(() => {
    if (!isAdmin()) {
      alert('⛔ Admin access required');
      navigate('/');
      return;
    }

    // For now, load from localStorage
    const uploads = localStorage.getItem('pendingUploads');
    if (uploads) {
      setPendingStartups(JSON.parse(uploads));
    }
    setLoading(false);
  }, [navigate]);

  const handleApprove = (startupId: string) => {
    const startup = pendingStartups.find(s => s.id === startupId);
    if (!startup) return;

    // Update status
    const updated = pendingStartups.map(s => 
      s.id === startupId ? { ...s, status: 'approved' as const } : s
    );
    setPendingStartups(updated);
    localStorage.setItem('pendingUploads', JSON.stringify(updated));

    // Add to main startupData
    const existingData = localStorage.getItem('startupData');
    const startupData = existingData ? JSON.parse(existingData) : [];
    
    // Create startup card data
    const newStartup = {
      id: Date.now(),
      name: startup.name,
      tagline: startup.tagline,
      pitch: startup.pitch,
      fivePoints: startup.fivePoints,
      website: startup.website || '',
      funding: startup.funding || 'Undisclosed',
      stage: startup.stage || 1,
      industry: startup.industry || 'Technology',
      logo: '🚀',
      votes: 0,
      trending: false
    };

    startupData.push(newStartup);
    localStorage.setItem('startupData', JSON.stringify(startupData));

    alert('✅ Startup approved and added to database!');
  };

  const handleReject = (startupId: string) => {
    if (!confirm('Are you sure you want to reject this startup?')) return;

    const updated = pendingStartups.map(s => 
      s.id === startupId ? { ...s, status: 'rejected' as const } : s
    );
    setPendingStartups(updated);
    localStorage.setItem('pendingUploads', JSON.stringify(updated));

    alert('❌ Startup rejected');
  };

  const handleDelete = (startupId: string) => {
    if (!confirm('Permanently delete this entry?')) return;

    const updated = pendingStartups.filter(s => s.id !== startupId);
    setPendingStartups(updated);
    localStorage.setItem('pendingUploads', JSON.stringify(updated));

    alert('🗑️ Deleted');
  };

  const filteredStartups = filter === 'all' 
    ? pendingStartups 
    : pendingStartups.filter(s => s.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              🍯 Process Uploads
            </h1>
            <p className="text-purple-200">
              Review and approve startup submissions
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === tab
                  ? 'bg-white text-purple-700'
                  : 'bg-purple-700/50 text-white hover:bg-purple-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && (
                <span className="ml-2 px-2 py-1 bg-purple-900/50 rounded-full text-xs">
                  {pendingStartups.filter(s => s.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Startups Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredStartups.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-4">🍯</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              No {filter !== 'all' ? filter : ''} uploads
            </h2>
            <p className="text-purple-200">
              {filter === 'pending' 
                ? 'All caught up! No startups waiting for review.'
                : 'No startups found with this status.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStartups.map((startup) => (
              <div key={startup.id} className="relative">
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    startup.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                    startup.status === 'approved' ? 'bg-green-400 text-green-900' :
                    'bg-red-400 text-red-900'
                  }`}>
                    {startup.status.toUpperCase()}
                  </span>
                </div>

                {/* Startup Card */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {startup.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {startup.tagline}
                    </p>
                    <p className="text-sm text-gray-700 mb-4">
                      {startup.pitch}
                    </p>
                    
                    {/* Five Points */}
                    <div className="space-y-2 mb-4">
                      {startup.fivePoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold">{idx + 1}.</span>
                          <span className="text-sm text-gray-700">{point}</span>
                        </div>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1">
                      {startup.website && (
                        <div>🔗 <a href={startup.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{startup.website}</a></div>
                      )}
                      {startup.industry && <div>🏢 {startup.industry}</div>}
                      {startup.funding && <div>💰 {startup.funding}</div>}
                      <div>📅 Uploaded: {new Date(startup.uploadedAt).toLocaleDateString()}</div>
                      {startup.source && <div>📥 Source: {startup.source}</div>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {startup.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(startup.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(startup.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {startup.status !== 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(startup.id)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Tools */}
      <div className="max-w-7xl mx-auto mt-12 p-6 bg-purple-800/50 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">📊 Admin Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/document-upload')}
            className="p-4 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition"
          >
            📄 Document Upload
          </button>
          <button
            onClick={() => navigate('/admin/bulk-import')}
            className="p-4 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition"
          >
            🔗 Bulk Import
          </button>
          <button
            onClick={() => {
              const count = pendingStartups.filter(s => s.status === 'pending').length;
              alert(`📊 Stats:\n\nPending: ${pendingStartups.filter(s => s.status === 'pending').length}\nApproved: ${pendingStartups.filter(s => s.status === 'approved').length}\nRejected: ${pendingStartups.filter(s => s.status === 'rejected').length}\nTotal: ${pendingStartups.length}`);
            }}
            className="p-4 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition"
          >
            📈 View Stats
          </button>
        </div>
      </div>
    </div>
  );
}
