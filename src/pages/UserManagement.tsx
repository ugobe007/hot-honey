import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'reviewer' | 'investor';
  approved: boolean;
  invitedAt: string;
  inviteLink?: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'reviewer' | 'investor'>('reviewer');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if current user is admin
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      const admin = profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin;
      setIsAdmin(admin);
      
      if (!admin) {
        alert('❌ Admin access required');
        navigate('/dashboard');
      }
    }

    loadUsers();
  }, [navigate]);

  const loadUsers = () => {
    const stored = localStorage.getItem('approvedUsers');
    if (stored) {
      setUsers(JSON.parse(stored));
    }
  };

  const generateInviteLink = (userId: string, role: string) => {
    const token = btoa(`${userId}-${Date.now()}-${role}`);
    return `${window.location.origin}/invite/${token}`;
  };

  const addUser = () => {
    if (!newUserEmail || !newUserName) {
      alert('❌ Please enter name and email');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      approved: true,
      invitedAt: new Date().toISOString(),
      inviteLink: generateInviteLink(`user-${Date.now()}`, newUserRole)
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));

    // Reset form
    setNewUserEmail('');
    setNewUserName('');
    setNewUserRole('reviewer');
  };

  const removeUser = (userId: string) => {
    if (confirm('Remove this user?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
    }
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('✅ Invite link copied to clipboard!');
  };

  const sendInviteEmail = (user: User) => {
    const subject = encodeURIComponent('You\'re invited to Hot Money Honey!');
    const body = encodeURIComponent(`Hi ${user.name}!

You've been invited to join Hot Money Honey as a ${user.role.toUpperCase()}.

🔗 Your invite link:
${user.inviteLink}

As a ${user.role}, you can:
${user.role === 'reviewer' ? `
✓ Upload startup URLs
✓ Review and validate startups
✓ Send validation emails
✓ Access the Startup Processor
✓ Track all uploads and validations
` : `
✓ Vote on startups
✓ Build your portfolio
✓ Access deal rooms
✓ Connect with founders
`}

Welcome to the team!

Best,
Hot Money Honey Team
${window.location.origin}`);

    window.location.href = `mailto:${user.email}?subject=${subject}&body=${body}`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-red-600 to-pink-600';
      case 'reviewer': return 'from-blue-600 to-purple-600';
      case 'investor': return 'from-green-600 to-emerald-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'reviewer': return '🔍';
      case 'investor': return '💰';
      default: return '👤';
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <img src="/images/logo.png" alt="Hot Honey" className="h-20 w-20" />
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-xl text-gray-700 mt-2 font-semibold">
                  Invite reviewers and manage access
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-bold text-lg"
            >
              ← Back
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
              <h3 className="text-2xl font-black mb-2">🔍 Reviewers</h3>
              <p className="text-5xl font-black">{users.filter(u => u.role === 'reviewer').length}</p>
            </div>
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl text-white">
              <h3 className="text-2xl font-black mb-2">💰 Investors</h3>
              <p className="text-5xl font-black">{users.filter(u => u.role === 'investor').length}</p>
            </div>
            <div className="p-6 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl text-white">
              <h3 className="text-2xl font-black mb-2">👥 Total Users</h3>
              <p className="text-5xl font-black">{users.length}</p>
            </div>
          </div>

          {/* Add New User */}
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl border-4 border-purple-300">
            <h2 className="text-3xl font-black text-gray-900 mb-4">➕ Invite New User</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-bold focus:border-purple-500 focus:outline-none"
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-bold focus:border-purple-500 focus:outline-none"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'reviewer' | 'investor')}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-bold focus:border-purple-500 focus:outline-none"
              >
                <option value="reviewer">🔍 Reviewer</option>
                <option value="investor">💰 Investor</option>
              </select>
              <button
                onClick={addUser}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl font-black hover:from-orange-700 hover:to-yellow-700 transition-all"
              >
                ➕ Add User
              </button>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="mb-8 p-6 bg-gray-100 rounded-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-4">📋 Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border-2 border-blue-300">
                <h4 className="text-xl font-black text-blue-700 mb-2">🔍 Reviewer</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>✓ Upload startup URLs</li>
                  <li>✓ Process startups</li>
                  <li>✓ Send validation emails</li>
                  <li>✓ Track uploads</li>
                  <li>✓ Activity tracker access</li>
                </ul>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-green-300">
                <h4 className="text-xl font-black text-green-700 mb-2">💰 Investor</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>✓ Vote on startups</li>
                  <li>✓ Build portfolio</li>
                  <li>✓ Access deal rooms</li>
                  <li>✓ View analytics</li>
                  <li>✓ Share portfolio</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-gray-900 mb-4">👥 Approved Users</h2>
            {users.length === 0 ? (
              <div className="text-center py-16 bg-gray-100 rounded-2xl">
                <p className="text-2xl font-bold text-gray-600">No users yet</p>
                <p className="text-lg text-gray-500 mt-2">Add your first reviewer or investor above</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="p-6 border-4 border-gray-300 rounded-2xl hover:border-purple-400 transition-all bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">{getRoleIcon(user.role)}</div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900">{user.name}</h3>
                        <p className="text-lg text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          Invited: {new Date(user.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-full font-black text-sm`}>
                        {user.role.toUpperCase()}
                      </span>
                      <button
                        onClick={() => removeUser(user.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {user.inviteLink && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                      <p className="text-sm font-bold text-gray-700 mb-2">🔗 Invite Link:</p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={user.inviteLink}
                          readOnly
                          className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => copyInviteLink(user.inviteLink!)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold whitespace-nowrap"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => sendInviteEmail(user)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold whitespace-nowrap"
                        >
                          📧 Email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
