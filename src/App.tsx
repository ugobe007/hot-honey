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
import StartupMatches from './pages/StartupMatches'; // ✅ Startup matches page
import InvestorMatches from './pages/InvestorMatches'; // ✅ Investor matches page
import MatchReviewPage from './pages/MatchReviewPage'; // ✅ Match review page
import VoteDemo from './pages/VoteDemo';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Settings from './pages/Settings';
import SharedPortfolio from './pages/SharedPortfolio';
import BulkUpload from './pages/BulkUpload';
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
import AIIntelligenceDashboard from './pages/AIIntelligenceDashboard';
import CommandCenter from './components/CommandCenter';
import QuickAddInvestor from './pages/QuickAddInvestor';
import SyncStartups from './pages/SyncStartups';
import DataIntelligence from './pages/DataIntelligence';
import Feed from './pages/Feed';
import SavedMatches from './pages/SavedMatches';
import RSSManager from './pages/RSSManager';
import DiscoveredStartups from './pages/DiscoveredStartups';
import AILogsPage from './pages/AILogsPage';
import TierMatchingAdmin from './pages/TierMatchingAdmin';
import GODScoresPage from './pages/GODScoresPage';
import IndustryRankingsPage from './pages/IndustryRankingsPage';
import AdminInstructions from './pages/AdminInstructions';
import MLDashboard from './pages/MLDashboard';
import ControlCenter from './pages/ControlCenter';
import MetricsDashboard from './pages/MetricsDashboard';
import LiveDemo from './pages/LiveDemo';
import UnifiedAdminDashboard from './pages/UnifiedAdminDashboard';
import InvestorEnrichmentPage from './pages/InvestorEnrichmentPage';
import DiscoveredInvestors from './pages/DiscoveredInvestors';
import SystemHealthDashboard from './pages/SystemHealthDashboard';
import ScriptsControlPage from './pages/ScriptsControlPage';
import MasterNavigation from './pages/MasterNavigation';
import GetMatchedPage from './pages/GetMatchedPage';
import PricingPage from './pages/PricingPage';
import InvestorSignup from './pages/InvestorSignup';
import TrendingPage from './pages/TrendingPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import TemplateSequentialFlow from './pages/TemplateSequentialFlow';
import CheckoutPage from './pages/CheckoutPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';
import StrategiesPage from './pages/StrategiesPage';
import MarketTrends from './pages/MarketTrends';
import AdminAnalytics from './pages/AdminAnalytics';
import InstantMatches from './pages/InstantMatches';
import AgentDashboard from './components/admin/AgentDashboard';
import AdminRouteWrapper from './components/AdminRouteWrapper';
import PipelineMonitor from './pages/PipelineMonitor';
import FundingForecasts from './pages/FundingForecasts';
import StartupBenchmarksDashboard from './pages/StartupBenchmarksDashboard';
import SocialSignalsDashboard from './components/SocialSignalsDashboard';
import GODSettingsPage from './pages/GODSettingsPage';
import ScraperManagementPage from './pages/ScraperManagementPage';
import MatchingEngineAdmin from './pages/MatchingEngineAdmin';
import './App.css';
import LogoDropdownMenu from './components/LogoDropdownMenu';

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
      {/* [pyth] ai Navigation Bar - Hidden on landing/matching page */}
      {location.pathname !== '/' && location.pathname !== '/matching' && location.pathname !== '/matching-engine' && location.pathname !== '/match' && (
        <LogoDropdownMenu />
      )}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} /> {/* 💰 Pricing Page */}
          <Route path="/get-matched" element={<GetMatchedPage />} /> {/* ✅ Pricing & Signup */}
          <Route path="/checkout" element={<CheckoutPage />} /> {/* 💳 Stripe Checkout */}
          <Route path="/get-matched/success" element={<SubscriptionSuccessPage />} /> {/* ✅ Success */}
          <Route path="/services" element={<ServicesPage />} /> {/* 🛠️ AI Services */}
          <Route path="/services/:slug" element={<ServiceDetailPage />} /> {/* 🛠️ Service Detail */}
          <Route path="/startup/:startupId/templates" element={<TemplateSequentialFlow />} /> {/* 📚 Sequential Template Flow */}
          <Route path="/strategies" element={<StrategiesPage />} /> {/* 📚 Fundraising Playbook */}
          <Route path="/trending" element={<TrendingPage />} /> {/* 🔥 Trending & Discovery */}
          <Route path="/discover" element={<TrendingPage />} /> {/* 🔥 Alias for Trending */}
          <Route path="/social-signals" element={<SocialSignalsDashboard />} /> {/* 🕵️ Social Signals Intelligence */}
          <Route path="/match" element={<MatchingEngine />} /> {/* 🎯 Primary Matching Page */}
          <Route path="/matching-engine" element={<Navigate to="/match" replace />} /> {/* Redirect alias */}
          <Route path="/matching" element={<Navigate to="/match" replace />} /> {/* Redirect alias */}
          <Route path="/instant-matches" element={<InstantMatches />} /> {/* 🚀 Instant URL analysis results */}
          <Route path="/saved-matches" element={<SavedMatches />} /> {/* 💾 Saved Matches */}
          <Route path="/vote-cards" element={<FrontPageNew />} />
          {/* Old /signup route removed - use /get-matched for startups or /investor/signup for investors */}
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
          <Route path="/investor/signup" element={<InvestorSignup />} /> {/* ✅ Investor Signup */}
          <Route path="/invite-investor" element={<InviteInvestorPage />} /> {/* ✅ Invite Investor */}
          <Route path="/portfolio" element={<PortfolioPage />} /> {/* ✅ FIXED */}
          <Route path="/submit" element={<Submit />} />
          <Route path="/upload" element={<UploadPage />} /> {/* ✅ Startup Uploader */}
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/startup/:id/matches" element={<StartupMatches />} /> {/* ✅ Startup matches page */}
          <Route path="/investor/:id/matches" element={<InvestorMatches />} /> {/* ✅ Investor matches page */}
          {/* /match-review moved to admin routes */}
          <Route path="/deals" element={<Deals />} />
          <Route path="/startups" element={<DashboardRouter />} /> {/* ✅ Redirects to unified dashboard */}
          <Route path="/dashboard" element={<DashboardRouter />} /> {/* ✅ UNIFIED DASHBOARD - redirects admins */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/navigation" element={<MasterNavigation />} /> {/* 🗺️ Master Navigation Directory */}
          <Route path="/sitemap" element={<MasterNavigation />} /> {/* 🗺️ Alias */}
          
          {/* Admin Routes with Sidebar */}
          <Route path="/admin" element={<AdminRouteWrapper />}>
            <Route index element={<UnifiedAdminDashboard />} />
            <Route path="dashboard" element={<UnifiedAdminDashboard />} />
            <Route path="control" element={<ControlCenter />} />
            <Route path="review" element={<AdminReview />} />
            <Route path="rss-manager" element={<RSSManager />} />
            <Route path="discovered-startups" element={<DiscoveredStartups />} />
            <Route path="discovered-investors" element={<DiscoveredInvestors />} />
            <Route path="bulk-upload" element={<BulkUpload />} />
            <Route path="god-scores" element={<GODScoresPage />} />
            <Route path="god-settings" element={<GODSettingsPage />} />
            <Route path="industry-rankings" element={<IndustryRankingsPage />} />
            <Route path="tier-matching" element={<TierMatchingAdmin />} />
            <Route path="investor-enrichment" element={<InvestorEnrichmentPage />} />
            <Route path="ai-logs" element={<AILogsPage />} />
            <Route path="diagnostic" element={<DiagnosticPage />} />
            <Route path="database-check" element={<DatabaseDiagnostic />} />
            <Route path="ai-intelligence" element={<AIIntelligenceDashboard />} />
            <Route path="ml-dashboard" element={<MLDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="matching-engine" element={<MatchingEngineAdmin />} />
            <Route path="match-review" element={<MatchReviewPage />} /> {/* Test/dev match review */}
            <Route path="agent" element={<AgentDashboard />} />
            <Route path="edit-startups" element={<EditStartups />} />
            <Route path="investors/add" element={<QuickAddInvestor />} />
            <Route path="instructions" element={<AdminInstructions />} />
            <Route path="health" element={<SystemHealthDashboard />} />
            <Route path="pipeline" element={<PipelineMonitor />} />
            <Route path="forecasts" element={<FundingForecasts />} />
            <Route path="scripts" element={<ScriptsControlPage />} />
            <Route path="scrapers" element={<ScraperManagementPage />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="document-upload" element={<DocumentUpload />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="sync" element={<SyncStartups />} />
            <Route path="migrate" element={<MigrateLocalStorage />} />
            <Route path="migrate-data" element={<MigrateStartupData />} />
            <Route path="benchmarks" element={<StartupBenchmarksDashboard />} />
          </Route>
          
          <Route path="/bulkupload" element={<BulkUpload />} /> {/* ✅ Public bulk upload shortcut */}
          <Route path="/data-intelligence" element={<DataIntelligence />} />
          <Route path="/setup" element={<SetupPage />} /> {/* ✅ Setup shortcut */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/market-trends" element={<MarketTrends />} /> {/* 📈 Public Market Trends */}
          <Route path="/trends" element={<MarketTrends />} /> {/* 📈 Alias for Market Trends */}
          {/* 🚀 Startup Benchmarks Dashboard */}
          <Route path="/benchmarks" element={<StartupBenchmarksDashboard />} />
        </Routes>
      </main>
      </div>
    </AuthProvider>
  );
};

export default App;