import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VotePage from './components/VotePage';
import PortfolioPage from './pages/PortfolioPage'; // ✅ FIXED - was pointing to non-existent Portfolio
import Submit from './pages/Submit';
import StartupDetail from './pages/StartupDetail';
import Deals from './pages/Deals';
import OldDashboard from './pages/Dashboard'; // ✅ Renamed to avoid conflict
import NewDashboard from './components/Dashboard'; // ✅ This is the new one
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
import WelcomeModal from './components/WelcomeModal';
import InvestorsPage from './pages/InvestorsPage';
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
import SyncStartups from './pages/SyncStartups';
import DataIntelligence from './pages/DataIntelligence';
import Feed from './pages/Feed';
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const location = useLocation();
  
  // Only show WelcomeModal on home page
  const isHomePage = (location.pathname === '/' || location.pathname === '/home');

  return (
    <AuthProvider>
      <div className="min-h-screen">
        {isHomePage && <WelcomeModal />}
        {showHowItWorks && (
        <WelcomeModal 
          forceOpen={true} 
          onClose={() => setShowHowItWorks(false)} 
        />
      )}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/matching-engine" element={<MatchingEngine />} />
          <Route path="/vote-cards" element={<FrontPageNew />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/vote-demo" element={<VoteDemo />} />
          <Route path="/feed" element={<Feed />} /> {/* ✅ Activity Feed */}
          <Route path="/investors" element={<InvestorsPage />} /> {/* ✅ Investor Directory */}
          <Route path="/investor/:id/edit" element={<EditInvestorPage />} /> {/* ✅ Edit Investor */}
          <Route path="/invite-investor" element={<InviteInvestorPage />} /> {/* ✅ Invite Investor */}
          <Route path="/portfolio" element={<PortfolioPage />} /> {/* ✅ FIXED */}
          <Route path="/submit" element={<Submit />} />
          <Route path="/upload" element={<UploadPage />} /> {/* ✅ Startup Uploader */}
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/startups" element={<OldDashboard />} /> {/* Old page */}
          <Route path="/dashboard" element={<DashboardRouter />} /> {/* ✅ UNIFIED DASHBOARD - redirects admins */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/shared-portfolio/:shareId" element={<SharedPortfolio />} />
          <Route path="/admin/bulk-upload" element={<BulkUpload />} />
          <Route path="/admin/bulk-import" element={<BulkImport />} />
          <Route path="/admin/document-upload" element={<DocumentUpload />} />
          <Route path="/admin/review" element={<AdminReview />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/setup" element={<SetupPage />} />
          <Route path="/admin/edit-startups" element={<EditStartups />} />
          <Route path="/admin/sync" element={<SyncStartups />} />
          <Route path="/admin/migrate" element={<MigrateLocalStorage />} />
          <Route path="/admin/migrate-data" element={<MigrateStartupData />} />
          <Route path="/admin/diagnostic" element={<DiagnosticPage />} />
          <Route path="/admin/database-check" element={<DatabaseDiagnostic />} />
          <Route path="/data-intelligence" element={<DataIntelligence />} />
          <Route path="/setup" element={<SetupPage />} /> {/* ✅ Setup shortcut */}
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>

      <footer className="text-center text-sm py-8">
        <div className="flex justify-center items-center gap-6 mb-3 flex-wrap">
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="text-orange-600 hover:text-orange-700 font-semibold hover:underline cursor-pointer bg-transparent border-none transition-colors"
          >
            🔥 How It Works
          </button>
          <span className="text-slate-400">•</span>
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
          <Link to="/startups" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
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