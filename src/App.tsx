import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import VotePage from './components/VotePage';
import PortfolioPage from './pages/PortfolioPage'; // ✅ FIXED - was pointing to non-existent Portfolio
import Submit from './pages/Submit';
import StartupDetail from './pages/StartupDetail';
import Deals from './pages/Deals';
import OldDashboard from './pages/Dashboard'; // ✅ Renamed to avoid conflict
import NewDashboard from './components/Dashboard'; // ✅ This is the new one
import FrontPageNew from './components/FrontPageNew';
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
import './App.css';

const App: React.FC = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const location = useLocation();
  
  // Only show WelcomeModal on home page
  const isHomePage = (location.pathname === '/' || location.pathname === '/home');

  return (
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
          <Route path="/" element={<FrontPageNew />} />
          <Route path="/home" element={<FrontPageNew />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/vote-demo" element={<VoteDemo />} />
          <Route path="/investors" element={<InvestorsPage />} /> {/* ✅ Investor Directory */}
          <Route path="/investor/:id/edit" element={<EditInvestorPage />} /> {/* ✅ Edit Investor */}
          <Route path="/invite-investor" element={<InviteInvestorPage />} /> {/* ✅ Invite Investor */}
          <Route path="/portfolio" element={<PortfolioPage />} /> {/* ✅ FIXED */}
          <Route path="/submit" element={<Submit />} />
          <Route path="/upload" element={<UploadPage />} /> {/* ✅ Startup Uploader */}
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/startups" element={<OldDashboard />} /> {/* Old page */}
          <Route path="/dashboard" element={<NewDashboard />} /> {/* ✅ NEW DASHBOARD */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/shared-portfolio/:shareId" element={<SharedPortfolio />} />
          <Route path="/admin/bulk-upload" element={<BulkUpload />} />
          <Route path="/admin/bulk-import" element={<BulkImport />} />
          <Route path="/admin/document-upload" element={<DocumentUpload />} />
          <Route path="/admin/review" element={<AdminReview />} />
          <Route path="/admin/setup" element={<SetupPage />} />
          <Route path="/setup" element={<SetupPage />} /> {/* ✅ Setup shortcut */}
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>

      <footer className="bg-gradient-to-r from-purple-900 via-purple-700 to-green-400 text-center text-sm py-4">
        <div className="flex justify-center items-center gap-6 mb-2">
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="text-yellow-300 hover:text-yellow-400 font-semibold hover:underline cursor-pointer bg-transparent border-none"
          >
            🔥 How It Works
          </button>
          <span className="text-purple-300">•</span>
          <Link to="/about" className="text-yellow-300 hover:text-yellow-400 font-semibold hover:underline">
            About Us
          </Link>
          <span className="text-purple-300">•</span>
          <Link to="/contact" className="text-yellow-300 hover:text-yellow-400 font-semibold hover:underline">
            Contact Us
          </Link>
          <span className="text-purple-300">•</span>
          <Link to="/privacy" className="text-yellow-300 hover:text-yellow-400 font-semibold hover:underline">
            Privacy Policy
          </Link>
          <span className="text-purple-300">•</span>
          <Link to="/startups" className="text-yellow-300 hover:text-yellow-400 font-semibold hover:underline">
            For Startups
          </Link>
        </div>
        <p className="text-purple-200">&copy; {new Date().getFullYear()} Hot Honey. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;