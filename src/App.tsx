import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VotePage from './components/VotePage';
import PortfolioPage from './pages/PortfolioPage'; // ✅ FIXED - was pointing to non-existent Portfolio
import Submit from './pages/Submit';
import StartupDetail from './pages/StartupDetail';
import Deals from './pages/Deals';
import NewDashboard from './components/Dashboard'; // ✅ Main Dashboard component
import LandingPage from './pages/LandingPage'; // ✅ NEW - Matching platform landing page
import FrontPageNew from './components/FrontPageNew'; // ✅ OLD - Voting interface
import MatchingEngine from './components/MatchingEngine'; // ✅ Matching engine component
import VoteDemo from './pages/VoteDemo';
import SignUpPage from './components/signup-page';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Settings from './pages/Settings';
import SharedPortfolio from './pages/SharedPortfolio';
import BulkUpload from './pages/BulkUpload';
import BulkImport from './pages/BulkImport';
import DocumentUpload from './pages/DocumentUpload';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import AdminReview from './pages/AdminReview';
import InvestorsPage from './pages/InvestorsPage';
import InvestorProfile from './pages/InvestorProfile';
import UploadPage from './pages/UploadPage';
import SetupPage from './pages/SetupPage';
import InviteInvestorPage from './pages/InviteInvestorPage';
import EditInvestorPage from './pages/EditInvestorPage';
import EditStartups from './pages/EditStartups';
import MigrateLocalStorage from './pages/MigrateLocalStorage';
import MigrateStartupData from './pages/MigrateStartupData';
import DiagnosticPage from './pages/DiagnosticPage';
import DatabaseDiagnostic from './pages/DatabaseDiagnostic';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminOperations from './pages/AdminOperations';
import AIIntelligenceDashboard from './pages/AIIntelligenceDashboard';
import CommandCenter from './components/CommandCenter';
import AdminWorkflowDashboard from './components/AdminWorkflowDashboard';
import QuickAddInvestor from './pages/QuickAddInvestor';
import SyncStartups from './pages/SyncStartups';
import DataIntelligence from './pages/DataIntelligence';
import Feed from './pages/Feed';
import SavedMatches from './pages/SavedMatches';
import RSSManager from './pages/RSSManager';
import DiscoveredStartups from './pages/DiscoveredStartups';
import AILogsPage from './pages/AILogsPage';
import GODScoresPage from './pages/GODScoresPage';
import AdminInstructions from './pages/AdminInstructions';
import MLDashboard from './pages/MLDashboard';
import ControlCenter from './pages/ControlCenter';
import MetricsDashboard from './pages/MetricsDashboard';
import LiveDemo from './pages/LiveDemo';
import MasterControlCenter from './pages/MasterControlCenter';
import InvestorEnrichmentPage from './pages/InvestorEnrichmentPage';
import DiscoveredInvestors from './pages/DiscoveredInvestors';
import GetMatchedPage from './pages/GetMatchedPage';
import TrendingPage from './pages/TrendingPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';
import StrategiesPage from './pages/StrategiesPage';
import MarketTrends from './pages/MarketTrends';
import AdminAnalytics from './pages/AdminAnalytics';
import AgentDashboard from './components/admin/AgentDashboard';
import './App.css';

// Wrapper component that redirects admins to admin dashboard
function DashboardRouter() {
  const { user } = useAuth();
  
  // If user is admin, redirect to admin dashboard
  if (user?.isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Otherwise show regular dashboard
  return <NewDashboard />;
}

const App: React.FC = () => {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="min-h-screen">
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/get-matched" element={<GetMatchedPage />} /> {/* ✅ Pricing & Signup */}
          <Route path="/checkout" element={<CheckoutPage />} /> {/* 💳 Stripe Checkout */}
          <Route path="/get-matched/success" element={<SubscriptionSuccessPage />} /> {/* ✅ Success */}
          <Route path="/services" element={<ServicesPage />} /> {/* 🛠️ AI Services */}
          <Route path="/services/:slug" element={<ServiceDetailPage />} /> {/* 🛠️ Service Detail */}
          <Route path="/strategies" element={<StrategiesPage />} /> {/* 📚 Fundraising Playbook */}
          <Route path="/trending" element={<TrendingPage />} /> {/* 🔥 Trending & Discovery */}
          <Route path="/discover" element={<TrendingPage />} /> {/* 🔥 Alias for Trending */}
          <Route path="/matching-engine" element={<MatchingEngine />} />
          <Route path="/matching" element={<MatchingEngine />} />
          <Route path="/match" element={<MatchingEngine />} />
          <Route path="/saved-matches" element={<SavedMatches />} />
          <Route path="/vote-cards" element={<FrontPageNew />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/vote-demo" element={<VoteDemo />} />
          <Route path="/feed" element={<Feed />} /> {/* ✅ Activity Feed */}
          <Route path="/metrics" element={<MetricsDashboard />} /> {/* ✅ Public Metrics Dashboard */}
          <Route path="/demo" element={<LiveDemo />} /> {/* ✅ Live Demo for Investors */}
          <Route path="/investors" element={<InvestorsPage />} /> {/* ✅ Investor Directory */}
          <Route path="/investor/:id" element={<InvestorProfile />} /> {/* ✅ Individual Investor Profile */}
          <Route path="/investor/:id/edit" element={<EditInvestorPage />} /> {/* ✅ Edit Investor */}
          <Route path="/invite-investor" element={<InviteInvestorPage />} /> {/* ✅ Invite Investor */}
          <Route path="/portfolio" element={<PortfolioPage />} /> {/* ✅ FIXED */}
          <Route path="/submit" element={<Submit />} />
          <Route path="/upload" element={<UploadPage />} /> {/* ✅ Startup Uploader */}
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/startups" element={<DashboardRouter />} /> {/* ✅ Redirects to unified dashboard */}
          <Route path="/dashboard" element={<DashboardRouter />} /> {/* ✅ UNIFIED DASHBOARD - redirects admins */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Navigate to="/admin/control" replace />} />
          <Route path="/admin/control" element={<MasterControlCenter />} />
          <Route path="/admin/operations" element={<ControlCenter />} />
          <Route path="/admin/investor-enrichment" element={<InvestorEnrichmentPage />} />
          <Route path="/admin/bulk-upload" element={<BulkUpload />} />
          <Route path="/admin/bulk-import" element={<BulkImport />} />
          <Route path="/admin/document-upload" element={<DocumentUpload />} />
          <Route path="/admin/review" element={<AdminReview />} /> {/* Legacy */}
          <Route path="/admin/dashboard" element={<AdminWorkflowDashboard />} />
          <Route path="/admin/command-center" element={<CommandCenter />} />
          <Route path="/admin/rss-manager" element={<RSSManager />} />
          <Route path="/admin/discovered-startups" element={<DiscoveredStartups />} />
          <Route path="/admin/discovered-investors" element={<DiscoveredInvestors />} />
          <Route path="/admin/startups" element={<DiscoveredStartups />} /> {/* Alias for discovered-startups */}
          <Route path="/admin/investors" element={<DiscoveredInvestors />} /> {/* Alias for discovered-investors */}
          <Route path="/bulkupload" element={<BulkUpload />} /> {/* ✅ Public bulk upload shortcut */}
          <Route path="/admin/ai-logs" element={<AILogsPage />} />
          <Route path="/admin/god-scores" element={<GODScoresPage />} />
          <Route path="/admin/ml-dashboard" element={<MLDashboard />} />
          <Route path="/admin/legacy-dashboard" element={<AdminDashboard />} /> {/* Legacy */}
          <Route path="/admin/instructions" element={<AdminInstructions />} />
          <Route path="/admin/ai-intelligence" element={<AIIntelligenceDashboard />} />
          <Route path="/admin/investors/add" element={<QuickAddInvestor />} />
          <Route path="/admin/setup" element={<SetupPage />} />
          <Route path="/admin/edit-startups" element={<EditStartups />} />
          <Route path="/admin/sync" element={<SyncStartups />} />
          <Route path="/admin/migrate" element={<MigrateLocalStorage />} />
          <Route path="/admin/migrate-data" element={<MigrateStartupData />} />
          <Route path="/admin/diagnostic" element={<DiagnosticPage />} />
          <Route path="/admin/database-check" element={<DatabaseDiagnostic />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} /> {/* 📊 Admin Analytics Dashboard */}
          <Route path="/admin/agent" element={<AgentDashboard />} /> {/* 🤖 AI Agent Dashboard */}
          <Route path="/data-intelligence" element={<DataIntelligence />} />
          <Route path="/setup" element={<SetupPage />} /> {/* ✅ Setup shortcut */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/market-trends" element={<MarketTrends />} /> {/* 📈 Public Market Trends */}
          <Route path="/trends" element={<MarketTrends />} /> {/* 📈 Alias for Market Trends */}
        </Routes>
      </main>

      <footer className="bg-[#0f0a1a] text-center text-sm py-8">
        <div className="flex justify-center items-center gap-6 mb-3 flex-wrap">
          <Link to="/about" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
            About Us
          </Link>
          <span className="text-slate-400">•</span>
          <Link to="/contact" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
            Contact Us
          </Link>
          <span className="text-slate-400">•</span>
          <Link to="/privacy" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-400">•</span>
          <Link to="/get-matched" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
            For Startups
          </Link>
        </div>
        <p className="text-slate-600">&copy; {new Date().getFullYear()} Hot Money. All rights reserved.</p>
      </footer>
      </div>
    </AuthProvider>
  );
};

export default App;