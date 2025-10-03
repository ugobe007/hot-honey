// App.tsx
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Vote from './pages/Vote';
import Portfolio from './pages/Portfolio';
import Submit from './pages/Submit';
import StartupDetail from './pages/StartupDetail';
import Deals from './pages/Deals';
import Dashboard from './pages/Dashboard';
import HoneyPot from './pages/Dashboard';
import './App.css';
import FloatingNav from './components/FloatingNav'; // Import the FloatingNav component

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
  {/* Header removed as requested */}

      <main className="flex-grow p-4 mt-16"> {/* Add top margin to push content below nav */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/dashboard" element={<HoneyPot />} />
        </Routes>
      </main>

      <footer className="bg-gray-200 text-center text-sm text-gray-600 py-2">
        <Link to="/startup-submit" className="text-blue-500 hover:text-blue-700 font-semibold">
          Startups Click Here
        </Link>
        <br />
        &copy; {new Date().getFullYear()} Hot Money. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
