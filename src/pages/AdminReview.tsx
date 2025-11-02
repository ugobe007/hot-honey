import { useState, useEffect } from 'react';
import { OpenAIDataService } from '../lib/openaiDataService';

interface PendingStartup {
  id: string;
  name: string;
  website: string;
  logo?: string;
  tagline?: string;
  pitch?: string;
  five_points?: string[];
  stage?: string;
  funding?: string;
  industry?: string;
  scraped_by?: string;
  scraped_at?: string;
}

export default function AdminReview() {
  const [pending, setPending] = useState<PendingStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    const { success, startups } = await OpenAIDataService.getPendingStartups();
    if (success && startups) {
      setPending(startups);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await OpenAIDataService.approveAndPublish(id, 'admin');
      if (result.success) {
        alert(`✅ Approved and published: ${result.startup.name}`);
        loadPending(); // Refresh list
      } else {
        alert(`❌ Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving startup:', error);
      alert('Failed to approve startup');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this startup?')) return;
    
    setProcessingId(id);
    try {
      const result = await OpenAIDataService.rejectStartup(id, 'admin');
      if (result.success) {
        alert(`❌ Rejected: ${result.startup.name}`);
        loadPending(); // Refresh list
      } else {
        alert(`❌ Failed to reject: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting startup:', error);
      alert('Failed to reject startup');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading pending startups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Review Queue</h1>
          <p className="text-purple-200">
            {pending.length} startup{pending.length !== 1 ? 's' : ''} pending approval
          </p>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 text-center">
            <p className="text-white text-xl">✅ No pending startups. Great job!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.map((startup) => (
              <div
                key={startup.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">{startup.name}</h2>
                    {startup.website && (
                      <a
                        href={startup.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:text-blue-200 text-sm"
                      >
                        {startup.website} ↗
                      </a>
                    )}
                    {startup.tagline && (
                      <p className="text-purple-200 mt-2 text-lg">{startup.tagline}</p>
                    )}
                  </div>
                  {startup.logo && (
                    <img
                      src={startup.logo}
                      alt={startup.name}
                      className="w-16 h-16 rounded-lg object-cover ml-4"
                    />
                  )}
                </div>

                {startup.pitch && (
                  <p className="text-white mb-4">{startup.pitch}</p>
                )}

                {startup.five_points && startup.five_points.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-white font-semibold mb-2">5 Key Points:</h3>
                    <ol className="list-decimal ml-6 space-y-1">
                      {startup.five_points.map((point, i) => (
                        <li key={i} className="text-purple-100">{point}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-purple-200 mb-4">
                  {startup.stage && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      {startup.stage}
                    </span>
                  )}
                  {startup.funding && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      {startup.funding}
                    </span>
                  )}
                  {startup.industry && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      {startup.industry}
                    </span>
                  )}
                </div>

                {startup.scraped_by && (
                  <p className="text-xs text-purple-300 mb-4">
                    Source: {startup.scraped_by}
                  </p>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => handleApprove(startup.id)}
                    disabled={processingId === startup.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                  >
                    {processingId === startup.id ? '⏳ Processing...' : '✅ Approve & Publish'}
                  </button>
                  <button
                    onClick={() => handleReject(startup.id)}
                    disabled={processingId === startup.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                  >
                    {processingId === startup.id ? '⏳ Processing...' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
