import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import UserManagement from './UserManagement';
import InventoryDashboard from './InventoryDashboard';

function LoginPage({ setIsAuthenticated, setPermissions, setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? 'http://localhost:8080/api/login' : 'http://localhost:8080/api/register';

    try {
      const res = await axios.post(endpoint, formData);
      if (isLogin) {
        const data = res.data;
        setIsAuthenticated(true);
        setPermissions(data.permissions || []);
        setToken(data.token);
        localStorage.setItem('token', data.token);

        if (data.permissions && (data.permissions.includes('VIEW_INVENTORY') || data.permissions.includes('MANAGE_INVENTORY') || data.permissions.includes('PROCESS_SALE'))) {
            navigate('/inventory');
        } else {
            navigate((data.permissions && (data.permissions.includes('VIEW_USER_LIST') || data.permissions.includes('APPROVE_USER_CREATION'))) ? '/admin' : '/user');
        }
      } else {
        setIsLogin(true);
        setError('Request submitted successfully! Pending Manager approval.');
        setFormData({ username: '', password: '', email: '' });
      }
    } catch (err) {
      // PRECISE ERROR CATCHING FOR QUARANTINED ACCOUNTS
      setError(err.response?.data?.error || err.response?.data || err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif" }}>

      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
        <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path stroke="#ffffff" strokeWidth="3" d="M12 7H7.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
              <path stroke="#bae6fd" strokeWidth="3" d="M18 7h-4.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H12" />
            </svg>
            <h1 style={{ fontSize: '36px', margin: 0, fontWeight: '800', letterSpacing: '-1px' }}>SmartStock</h1>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '300', lineHeight: '1.4', marginBottom: '16px', color: '#f0f9ff' }}>
            Integrated Inventory & Multi-Role Personnel Management
          </h2>
          <p style={{ fontSize: '16px', color: '#bae6fd', maxWidth: '400px', lineHeight: '1.6' }}>
            Empowering retail enterprises in Juja with predictive AI analytics, strict access controls, and seamless operational workflows.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>
            {isLogin ? 'Welcome Back' : 'Request Access'}
          </h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
            {isLogin ? 'Enter your credentials to access the system' : 'Register to request system access'}
          </p>

          {error && (
            <div style={{ backgroundColor: error.includes('successful') ? '#ecfdf5' : '#fef2f2', color: error.includes('successful') ? '#059669' : '#ef4444', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', border: `1px solid ${error.includes('successful') ? '#a7f3d0' : '#fecaca'}` }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>USERNAME</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>PASSWORD</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0284c7'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#0ea5e9'}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Submit Access Request')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ color: '#0ea5e9', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isLogin ? 'Request Access' : 'Sign in'}
            </span>
          </p>
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
          element={isAuthenticated && (permissions.includes('VIEW_USER_LIST') || permissions.includes('APPROVE_USER_CREATION') || permissions.includes('ASSIGN_PERMISSION')) ? <UserManagement /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;