import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import InvestorProfile from './components/InvestorProfile';
import DealRoom from './components/DealRoom';
import Login from './Login';
import { AuthProvider } from './authContext';
import ProtectedRoute from './ProtectedRoute';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/profile">Investor Profile</Link>
          <Link to="/deal-room">Deal Room</Link>
          <Link to="/login">Login</Link>
        </nav>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><InvestorProfile /></ProtectedRoute>} />
          <Route path="/deal-room" element={<ProtectedRoute><DealRoom /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;