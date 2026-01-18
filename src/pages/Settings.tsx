import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoDropdownMenu from '../components/LogoDropdownMenu';
import { useAuth } from '../contexts/AuthContext';
import { useBilling } from '../hooks/useBilling';
import { supabase } from '../lib/supabase';
import { analytics } from '../analytics';
import UpgradeModal from '../components/UpgradeModal';
import { UpgradeMoment } from '../lib/upgradeMoments';
import ReferralCard from '../components/ReferralCard';

interface EmailSettings {
  email_alerts_enabled: boolean;
  digest_enabled: boolean;
  digest_time_local: string;
  timezone: string;
  plan: string;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: '🇺🇸 Eastern (New York)' },
  { value: 'America/Chicago', label: '🇺🇸 Central (Chicago)' },
  { value: 'America/Denver', label: '🇺🇸 Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Pacific (Los Angeles)' },
  { value: 'Europe/London', label: '🇬🇧 London' },
  { value: 'Europe/Paris', label: '🇪🇺 Paris' },
  { value: 'Asia/Singapore', label: '🇸🇬 Singapore' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo' },
];

const DIGEST_TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3002' : '');

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { plan: billingPlan, isLoading: billingLoading } = useBilling();
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email_alerts_enabled: true,
    digest_enabled: false,
    digest_time_local: '08:00',
    timezone: 'America/Los_Angeles',
    plan: 'free'
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch email settings from API
  const fetchSettings = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoadingSettings(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/profile/settings`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmailSettings({
          email_alerts_enabled: data.email_alerts_enabled ?? true,
          digest_enabled: data.digest_enabled ?? false,
          digest_time_local: data.digest_time_local ?? '08:00',
          timezone: data.timezone ?? 'America/Los_Angeles',
          plan: data.plan ?? 'free'
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save email settings to API
  const handleSaveEmailSettings = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSaveStatus('error');
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/profile/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email_alerts_enabled: emailSettings.email_alerts_enabled,
          digest_enabled: emailSettings.digest_enabled,
          digest_time_local: emailSettings.digest_time_local,
          timezone: emailSettings.timezone
        })
      });
      
      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        // Track email alerts toggle
        analytics.emailAlertsToggled(emailSettings.email_alerts_enabled);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const isElite = billingPlan === 'elite' || emailSettings.plan === 'elite';
  
  // Upgrade modal state
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; moment: UpgradeMoment }>({
    open: false,
    moment: 'enable_email_alerts'
  });
  
  // Handle non-elite trying to enable email features
  const handleEmailAlertToggle = (enabled: boolean) => {
    if (enabled && !isElite) {
      setUpgradeModal({ open: true, moment: 'enable_email_alerts' });
      return;
    }
    setEmailSettings({ ...emailSettings, email_alerts_enabled: enabled });
  };
  
  const handleDigestToggle = (enabled: boolean) => {
    if (enabled && !isElite) {
      setUpgradeModal({ open: true, moment: 'daily_digest' });
      return;
    }
    setEmailSettings({ ...emailSettings, digest_enabled: enabled });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#160020] via-[#240032] to-[#330044] p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Current Page Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="pt-28 px-4 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-400 bg-clip-text text-transparent">⚙️ Settings</span>
          </h1>
          <p className="text-xl text-purple-200">Manage your account and preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          
          {/* Email Alert Settings Section - API-backed */}
          <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text">📧 Email Alerts</h2>
              {isElite && (
                <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                  ELITE
                </span>
              )}
            </div>
            
            {isLoadingSettings || billingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
              </div>
            ) : !isElite ? (
              <div className="bg-purple-900/40 rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🔒</span>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">Email Alerts are an Elite Feature</h3>
                    <p className="text-purple-300 text-sm mb-4">
                      Get instant email notifications when startups you're watching become HOT. 
                      Upgrade to Elite to enable real-time alerts.
                    </p>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Upgrade to Elite →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Instant Alerts Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-900/40 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🔥</span>
                    <div>
                      <div className="text-white font-semibold">Instant Hot Alerts</div>
                      <div className="text-purple-300 text-sm">Get emailed when a watched startup becomes HOT</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSettings.email_alerts_enabled}
                      onChange={(e) => handleEmailAlertToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {/* Daily Digest Toggle */}
                <div className="p-4 bg-purple-900/40 rounded-xl border border-purple-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">📊</span>
                      <div>
                        <div className="text-white font-semibold">Daily Digest</div>
                        <div className="text-purple-300 text-sm">One summary email per day with all activity</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailSettings.digest_enabled}
                        onChange={(e) => handleDigestToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                  
                  {/* Time selector - only show when digest is enabled */}
                  {emailSettings.digest_enabled && (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <label className="block text-purple-200 text-sm font-medium mb-2">⏰ Send digest at</label>
                      <select
                        value={emailSettings.digest_time_local}
                        onChange={(e) => setEmailSettings({...emailSettings, digest_time_local: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-purple-800/60 border border-purple-500/30 text-white focus:outline-none focus:border-blue-400"
                      >
                        {DIGEST_TIME_OPTIONS.map((time) => (
                          <option key={time.value} value={time.value} className="bg-purple-900">
                            {time.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-purple-400 text-xs mt-2">
                        Instant HOT alerts are sent separately and immediately.
                      </p>
                    </div>
                  )}
                </div>

                {/* Timezone Selector */}
                <div className="p-4 bg-purple-900/40 rounded-xl border border-purple-500/20">
                  <label className="block text-purple-200 font-semibold mb-2">🌍 Timezone</label>
                  <select
                    value={emailSettings.timezone}
                    onChange={(e) => setEmailSettings({...emailSettings, timezone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-purple-800/60 border border-purple-500/30 text-white focus:outline-none focus:border-orange-400"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-purple-900">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save Button for Email Settings */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSaveEmailSettings}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>💾 Save Email Settings</>
                    )}
                  </button>
                  
                  {saveStatus === 'success' && (
                    <span className="text-green-400 font-medium">✅ Saved!</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-400 font-medium">❌ Failed to save</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Section */}
          <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-purple-500/30">
            <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-6">👤 Account</h2>
            <div className="space-y-4">
              {user && (
                <div className="p-4 bg-purple-900/40 rounded-xl border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Logged in as</div>
                  <div className="text-white font-semibold">{user.email}</div>
                </div>
              )}
              
              <div className="p-4 bg-purple-900/40 rounded-xl border border-purple-500/20">
                <div className="text-purple-300 text-sm mb-1">Current Plan</div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold capitalize">{billingPlan || 'Free'}</span>
                  {billingPlan !== 'elite' && (
                    <button
                      onClick={() => navigate('/pricing')}
                      className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                    >
                      Upgrade →
                    </button>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => navigate('/pricing')}
                className="w-full px-6 py-4 bg-purple-700/50 hover:bg-purple-600/50 text-white font-bold rounded-xl transition-all text-left border border-purple-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg">💳 Manage Subscription</div>
                    <div className="text-sm text-purple-200">View plans and billing</div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full px-6 py-4 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg">🚪 Log Out</div>
                    <div className="text-sm text-red-200">Sign out of your account</div>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
            </div>
          </div>

          {/* Referral Section - Prompt 24 */}
          <div className="bg-white">
            <ReferralCard />
          </div>

          {/* Back Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-4 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 font-bold text-xl rounded-2xl shadow-xl transition-all"
              style={{
                boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
                textShadow: '0 1px 1px rgba(255,255,255,0.8)'
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        moment={upgradeModal.moment}
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ ...upgradeModal, open: false })}
      />
    </div>
  );
}
