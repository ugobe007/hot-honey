/**
 * V5.1 App Router (Performance Optimized)
 * 
 * State-based navigation, not page browsing.
 * Uses React.lazy for code splitting on less-critical routes.
 * 
 * ROUTE HIERARCHY:
 * - L0 (public): /, /login, /pricing, /checkout, /about, /privacy
 * - L1 (signals): /feed, /demo → requires login OR post-submit session
 * - L2 (matches): /instant-matches, /saved-matches, /startup/:id, /investor/:id → requires scan
 * - L4 (connect): /invite-investor, /contact → requires phase >= 4
 * - L5 (admin): /admin/* → requires role === admin (lazy loaded)
 */

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { L1Guard, L2Guard, L4Guard, L5Guard, AuthGuard } from './lib/routeGuards';
import { trackEvent } from './lib/analytics';
import './App.css';

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================================
// CRITICAL PATH - Eagerly loaded (landing page + core flow)
// ============================================================
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignupFounder from './pages/SignupFounder';
import InstantMatches from './pages/InstantMatches';

// ============================================================
// SECONDARY PATH - Lazy loaded (visited after conversion)
// ============================================================
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const SubscriptionSuccessPage = React.lazy(() => import('./pages/SubscriptionSuccessPage'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const SignalConfirmation = React.lazy(() => import('./pages/SignalConfirmation'));
const WhyPythhExists = React.lazy(() => import('./pages/WhyPythhExists'));
const HowItWorksPage = React.lazy(() => import('./pages/HowItWorksPage'));
const ValuePage = React.lazy(() => import('./pages/ValuePage'));
const SharedSignalView = React.lazy(() => import('./pages/SharedSignalView'));
const SharedMatches = React.lazy(() => import('./pages/SharedMatches'));
const InviteLanding = React.lazy(() => import('./pages/InviteLanding'));

// L1: Signal Surfaces (gated) - lazy
const Feed = React.lazy(() => import('./pages/Feed'));
const LiveDemo = React.lazy(() => import('./pages/LiveDemo'));
const MetricsDashboard = React.lazy(() => import('./pages/MetricsDashboard'));

// L2: Match Surfaces (gated) - lazy (except InstantMatches which is critical)
const SavedMatches = React.lazy(() => import('./pages/SavedMatches'));
const StartupDetail = React.lazy(() => import('./pages/StartupDetail'));
const InvestorProfile = React.lazy(() => import('./pages/InvestorProfile'));
const StartupMatches = React.lazy(() => import('./pages/StartupMatches'));
const InvestorMatches = React.lazy(() => import('./pages/InvestorMatches'));
const TemplateSequentialFlow = React.lazy(() => import('./pages/TemplateSequentialFlow'));

// L4: Connection (gated) - lazy
const Contact = React.lazy(() => import('./pages/Contact'));
const InviteInvestorPage = React.lazy(() => import('./pages/InviteInvestorPage'));
const InvestorSignup = React.lazy(() => import('./pages/InvestorSignup'));

// Authenticated routes - lazy
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const Settings = React.lazy(() => import('./pages/Settings'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));

// ============================================================
// ADMIN ROUTES - All lazy loaded (separate chunk)
// ============================================================
const AdminRouteWrapper = React.lazy(() => import('./components/AdminRouteWrapper'));
const UnifiedAdminDashboard = React.lazy(() => import('./pages/UnifiedAdminDashboard'));
const ControlCenter = React.lazy(() => import('./pages/ControlCenter'));
const AdminReview = React.lazy(() => import('./pages/AdminReview'));
const RSSManager = React.lazy(() => import('./pages/RSSManager'));
const DiscoveredStartups = React.lazy(() => import('./pages/DiscoveredStartups'));
const DiscoveredInvestors = React.lazy(() => import('./pages/DiscoveredInvestors'));
const BulkUpload = React.lazy(() => import('./pages/BulkUpload'));
const GODScoresPage = React.lazy(() => import('./pages/GODScoresPage'));
const GODSettingsPage = React.lazy(() => import('./pages/GODSettingsPage'));
const IndustryRankingsPage = React.lazy(() => import('./pages/IndustryRankingsPage'));
const TierMatchingAdmin = React.lazy(() => import('./pages/TierMatchingAdmin'));
const InvestorEnrichmentPage = React.lazy(() => import('./pages/InvestorEnrichmentPage'));
const AILogsPage = React.lazy(() => import('./pages/AILogsPage'));
const DiagnosticPage = React.lazy(() => import('./pages/DiagnosticPage'));
const DatabaseDiagnostic = React.lazy(() => import('./pages/DatabaseDiagnostic'));
const AIIntelligenceDashboard = React.lazy(() => import('./pages/AIIntelligenceDashboard'));
const MLDashboard = React.lazy(() => import('./pages/MLDashboard'));
const AdminAnalytics = React.lazy(() => import('./pages/AdminAnalytics'));
const MatchingEngineAdmin = React.lazy(() => import('./pages/MatchingEngineAdmin'));
const MatchReviewPage = React.lazy(() => import('./pages/MatchReviewPage'));
const AgentDashboard = React.lazy(() => import('./components/admin/AgentDashboard'));
const EditStartups = React.lazy(() => import('./pages/EditStartups'));
const QuickAddInvestor = React.lazy(() => import('./pages/QuickAddInvestor'));
const AdminInstructions = React.lazy(() => import('./pages/AdminInstructions'));
const SystemHealthDashboard = React.lazy(() => import('./pages/SystemHealthDashboard'));
const PipelineMonitor = React.lazy(() => import('./pages/PipelineMonitor'));
const FundingForecasts = React.lazy(() => import('./pages/FundingForecasts'));
const ScriptsControlPage = React.lazy(() => import('./pages/ScriptsControlPage'));
const ScraperManagementPage = React.lazy(() => import('./pages/ScraperManagementPage'));
const CommandCenter = React.lazy(() => import('./components/CommandCenter'));
const DocumentUpload = React.lazy(() => import('./pages/DocumentUpload'));
const SetupPage = React.lazy(() => import('./pages/SetupPage'));
const SyncStartups = React.lazy(() => import('./pages/SyncStartups'));
const MigrateLocalStorage = React.lazy(() => import('./pages/MigrateLocalStorage'));
const MigrateStartupData = React.lazy(() => import('./pages/MigrateStartupData'));
const StartupBenchmarksDashboard = React.lazy(() => import('./pages/StartupBenchmarksDashboard'));
const EditInvestorPage = React.lazy(() => import('./pages/EditInvestorPage'));
const Submit = React.lazy(() => import('./pages/Submit'));
const UploadPage = React.lazy(() => import('./pages/UploadPage'));
const MarketTrends = React.lazy(() => import('./pages/MarketTrends'));
const DataIntelligence = React.lazy(() => import('./pages/DataIntelligence'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const SocialSignalsDashboard = React.lazy(() => import('./components/SocialSignalsDashboard'));
const AdminMetricsPage = React.lazy(() => import('./pages/AdminMetricsPage'));

// Onboarding components (Prompt 22) - lazy since not on critical path
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const TooltipTour = React.lazy(() => import('./components/TooltipTour'));

// Legacy redirect component
function LegacyRedirect(): React.ReactElement {
  return <Navigate to="/" replace />;
}

const App: React.FC = () => {
  const location = useLocation();

  // Track page views (includes search for scan tracking)
  useEffect(() => {
    trackEvent('page_viewed', { path: location.pathname, search: location.search });
    
    // Track oracle_viewed only on actual Oracle surface
    if (location.pathname === '/') {
      trackEvent('oracle_viewed', { path: location.pathname });
    }
  }, [location.pathname, location.search]);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Onboarding modal - temporarily disabled for debugging */}
        {/* <Suspense fallback={null}>
          <OnboardingModal />
        </Suspense> */}
        
        {/* Tooltip tour - temporarily disabled for debugging */}
        {/* <Suspense fallback={null}>
          <TooltipTour />
        </Suspense> */}
        
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* L0: PUBLIC ORACLE SURFACE - Critical path (eager) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/get-matched" element={<Navigate to="/" replace />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/match" element={<Navigate to="/" replace />} />
              <Route path="/matching" element={<Navigate to="/" replace />} />
              <Route path="/matching-engine" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignupFounder />} />
              
              {/* L0: Secondary public pages (lazy) */}
              <Route path="/signal-confirmation" element={<SignalConfirmation />} />
              <Route path="/why" element={<WhyPythhExists />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/value" element={<ValuePage />} />
              <Route path="/shared/:shareToken" element={<SharedSignalView />} />
              <Route path="/share/matches/:token" element={<SharedMatches />} />
              <Route path="/i/:token" element={<InviteLanding />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/get-matched/success" element={<SubscriptionSuccessPage />} />
              <Route path="/about" element={<Navigate to="/why" replace />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* L1: SIGNAL SURFACES (requires login OR post-submit) */}
              <Route path="/feed" element={<L1Guard><Feed /></L1Guard>} />
              <Route path="/demo" element={<L1Guard><LiveDemo /></L1Guard>} />
              <Route path="/metrics" element={<MetricsDashboard />} />

              {/* L2: MATCH SURFACES (requires scan OR login) */}
              <Route path="/instant-matches" element={<L2Guard><InstantMatches /></L2Guard>} />
              <Route path="/match/results" element={<Navigate to="/instant-matches" replace />} />
              <Route path="/saved-matches" element={<L2Guard><SavedMatches /></L2Guard>} />
              <Route path="/startup/:id" element={<L2Guard><StartupDetail /></L2Guard>} />
              <Route path="/startup/:id/matches" element={<L2Guard><StartupMatches /></L2Guard>} />
              <Route path="/investor/:id" element={<L2Guard><InvestorProfile /></L2Guard>} />
              <Route path="/investor/:id/matches" element={<L2Guard><InvestorMatches /></L2Guard>} />
              <Route path="/startup/:startupId/templates" element={<L2Guard><TemplateSequentialFlow /></L2Guard>} />

              {/* L4: CONNECTION (requires phase >= 4) */}
              <Route path="/contact" element={<L4Guard><Contact /></L4Guard>} />
              <Route path="/invite-investor" element={<L4Guard><InviteInvestorPage /></L4Guard>} />
              <Route path="/investor/signup" element={<InvestorSignup />} />

              {/* AUTHENTICATED ROUTES */}
              <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
              <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
              <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />

              {/* L5: ADMIN ROUTES (all lazy loaded) */}
              <Route path="/admin" element={<L5Guard><AdminRouteWrapper /></L5Guard>}>
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
                <Route path="metrics" element={<AdminMetricsPage />} />
                <Route path="matching-engine" element={<MatchingEngineAdmin />} />
                <Route path="match-review" element={<MatchReviewPage />} />
                <Route path="agent" element={<AgentDashboard />} />
                <Route path="edit-startups" element={<EditStartups />} />
                <Route path="investors/add" element={<QuickAddInvestor />} />
                <Route path="investor/:id/edit" element={<EditInvestorPage />} />
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
                <Route path="submit" element={<Submit />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="market-trends" element={<MarketTrends />} />
                <Route path="data-intelligence" element={<DataIntelligence />} />
                <Route path="social-signals" element={<SocialSignalsDashboard />} />
              </Route>

              {/* Admin shortcuts */}
              <Route path="/bulkupload" element={<L5Guard><BulkUpload /></L5Guard>} />
              <Route path="/setup" element={<L5Guard><SetupPage /></L5Guard>} />
              <Route path="/analytics" element={<L5Guard><Analytics /></L5Guard>} />

              {/* LEGACY REDIRECTS */}
              <Route path="/vote" element={<LegacyRedirect />} />
              <Route path="/vote-demo" element={<LegacyRedirect />} />
              <Route path="/vote-cards" element={<LegacyRedirect />} />
              <Route path="/trending" element={<LegacyRedirect />} />
              <Route path="/discover" element={<LegacyRedirect />} />
              <Route path="/deals" element={<LegacyRedirect />} />
              <Route path="/portfolio" element={<LegacyRedirect />} />
              <Route path="/startups" element={<LegacyRedirect />} />
              <Route path="/dashboard" element={<LegacyRedirect />} />
              <Route path="/investors" element={<LegacyRedirect />} />
              <Route path="/services" element={<LegacyRedirect />} />
              <Route path="/strategies" element={<LegacyRedirect />} />
              <Route path="/navigation" element={<LegacyRedirect />} />
              <Route path="/sitemap" element={<LegacyRedirect />} />
              <Route path="/market-trends" element={<LegacyRedirect />} />
              <Route path="/trends" element={<LegacyRedirect />} />
              <Route path="/benchmarks" element={<LegacyRedirect />} />
              <Route path="/data-intelligence" element={<LegacyRedirect />} />
              <Route path="/social-signals" element={<LegacyRedirect />} />
              <Route path="/submit" element={<LegacyRedirect />} />
              <Route path="/upload" element={<LegacyRedirect />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
