import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    try {
      // Decode token
      const decoded = atob(token);
      const [userId, timestamp, role] = decoded.split('-');
      
      // Check if invite is still valid (30 days)
      const inviteAge = Date.now() - parseInt(timestamp);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (inviteAge > thirtyDays) {
        setError('This invite link has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      // Get user from approved users list
      const approvedUsers = localStorage.getItem('approvedUsers');
      if (approvedUsers) {
        const users = JSON.parse(approvedUsers);
        const user = users.find((u: any) => u.id === userId);
        
        if (user) {
          setInviteData({ ...user, role });
        } else {
          setError('User not found. Please contact an administrator.');
        }
      }
      
      setLoading(false);
    } catch (e) {
      setError('Invalid invite link');
      setLoading(false);
    }
  }, [token]);

  const acceptInvite = () => {
    if (!inviteData) return;

    // Create user profile
    const userProfile = {
      id: inviteData.id,
      name: inviteData.name,
      email: inviteData.email,
      role: inviteData.role,
      userType: inviteData.role,
      approved: true,
      isAdmin: inviteData.role === 'admin',
      isReviewer: inviteData.role === 'reviewer',
      joinedAt: new Date().toISOString()
    };

    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    alert(`✅ Welcome to Hot Money Honey!\n\nYou've joined as a ${inviteData.role.toUpperCase()}`);
    
    // Redirect based on role
    if (inviteData.role === 'reviewer' || inviteData.role === 'admin') {
      navigate('/admin/startup-processor');
    } else {
      navigate('/vote');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <p className="text-2xl font-bold text-gray-800">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Invalid Invite</h1>
          <p className="text-lg text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl font-bold text-lg hover:from-orange-700 hover:to-yellow-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-12 max-w-3xl shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <img src="/images/logo.png" alt="Hot Honey" className="h-24 w-24" />
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              Welcome to Hot Money Honey!
            </h1>
          </div>
        </div>

        <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl border-4 border-purple-300">
          <h2 className="text-3xl font-black text-gray-900 mb-4">You've been invited as:</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">
              {inviteData?.role === 'reviewer' ? '🔍' : '💰'}
            </div>
            <div>
              <p className="text-4xl font-black text-purple-700">
                {inviteData?.role?.toUpperCase()}
              </p>
              <p className="text-xl text-gray-700 font-semibold">{inviteData?.name}</p>
              <p className="text-lg text-gray-600">{inviteData?.email}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 p-6 bg-gray-100 rounded-2xl">
          <h3 className="text-2xl font-black text-gray-900 mb-4">
            {inviteData?.role === 'reviewer' ? '🔍 As a Reviewer, you can:' : '💰 As an Investor, you can:'}
          </h3>
          <ul className="space-y-3 text-lg text-gray-700">
            {inviteData?.role === 'reviewer' ? (
              <>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Upload startup URLs</strong> and process them into StartupCards</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Review startups</strong> and extract 5 key points</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Send validation emails</strong> to connect with founders</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Track all uploads</strong> and validation status</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Access admin tools</strong> like Activity Tracker</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Vote on startups</strong> with YES/NO swipes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Build your portfolio</strong> of hot picks</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Access deal rooms</strong> as startups advance</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>View analytics</strong> on your voting patterns</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">✓</span>
                  <span><strong>Share your portfolio</strong> with other investors</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <button
          onClick={acceptInvite}
          className="w-full px-8 py-6 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-2xl font-black text-2xl hover:from-orange-700 hover:to-yellow-700 transition-all shadow-xl hover:scale-105"
        >
          🚀 Accept Invite & Get Started
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          By accepting, you agree to Hot Money Honey's terms of service
        </p>
      </div>
    </div>
  );
}
