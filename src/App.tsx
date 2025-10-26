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
import FrontPageNew from './components/FrontPageNew';
import VoteDemo from './pages/VoteDemo';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <main>
        <Routes>
          <Route path="/" element={<FrontPageNew />} />
          <Route path="/home" element={<FrontPageNew />} />
          <Route path="/signup" element={<Submit />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/vote-demo" element={<VoteDemo />} />
          <Route path="/investors" element={<Portfolio />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/startup/:id" element={<StartupDetail />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/startups" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      <footer className="bg-gray-200 text-center text-sm text-gray-600 py-2">
        <Link to="/startups" className="text-blue-500 hover:text-blue-700 font-semibold">
          Startups Click Here
        </Link>
        <br />
        &copy; {new Date().getFullYear()} Hot Money Honey. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
