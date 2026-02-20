import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, Link } from 'react-router-dom';
import './App.css';
import UserManagement from './UserManagement';
import InventoryDashboard from './InventoryDashboard';

function LoginPage({ setIsAuthenticated, setPermissions, setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });
      const data = await response.text();
      setMessage(data);
      if (response.ok) {
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setMessage(data.message);
      setIsAuthenticated(true);
      setPermissions(data.permissions || []);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      navigate(data.permissions.includes('VIEW_USER_LIST') || data.permissions.includes('APPROVE_USER_CREATION') ? '/admin' : '/user');
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Login or Register</h2>
        <div className="form-group">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
          />
          <input
            type="email"
            placeholder="Email (for registration)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
          {message && (
            <p className={message.includes('successfully') ? 'success' : 'error'}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setPermissions([]);
        return;
      }
      try {
        const response = await fetch('http://localhost:8080/api/user/profile', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setPermissions(data.permissions || []);
        } else {
          setIsAuthenticated(false);
          setPermissions([]);
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setPermissions([]);
        localStorage.removeItem('token');
        setToken(null);
      }
    };
    checkAuth();
  }, [token]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage setIsAuthenticated={setIsAuthenticated} setPermissions={setPermissions} setToken={setToken} />} />
        <Route
          path="/user"
          element={isAuthenticated ? <UserManagement /> : <Navigate to="/" />}
        />
        <Route
                  path="/inventory"
                  element={isAuthenticated && (permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) ? <InventoryDashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/admin"
          element={isAuthenticated && (permissions.includes('VIEW_USER_LIST') || permissions.includes('APPROVE_USER_CREATION')) ? <UserManagement /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;