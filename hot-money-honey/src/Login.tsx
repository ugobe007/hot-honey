import React, { useState } from 'react';
import { useAuth } from './authContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [name, setName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      login(name);
      navigate('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ marginBottom: '1rem', padding: '0.5rem' }}
      />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;