import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './App.css';

const AVAILABLE_PERMISSIONS = [
  { id: 'VIEW_INVENTORY', label: 'View Inventory Catalog' },
  { id: 'MANAGE_INVENTORY', label: 'Manage Inventory (Add, Restock, Generate POs)' },
  { id: 'PROCESS_SALE', label: 'Point of Sale (Cashier)' },
  { id: 'VIEW_USER_LIST', label: 'View Personnel List' },
  { id: 'CREATE_USER_REQUEST', label: 'Request User Creation/Deletion' },
  { id: 'APPROVE_USER_CREATION', label: 'Approve Personnel Requests' },
  { id: 'ASSIGN_PERMISSION', label: 'Assign Roles & Permissions' },
  { id: 'VIEW_REQUESTS', label: 'View Pending Personnel Requests' }
];

const UserManagement = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);

  const [assignData, setAssignData] = useState({ username: '' });
  const [selectedPerms, setSelectedPerms] = useState([]);

  const [users, setUsers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const location = useLocation(); // Used to detect which page we are on

  // View Controllers
  const isProfilePage = location.pathname === '/user';
  const isPersonnelPage = location.pathname === '/admin';

  useEffect(() => {
      if (token) { fetchProfile(); }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/user/profile', { headers: { Authorization: `Bearer ${token}` } });
        setUser(res.data);
        const userPerms = res.data.permissions || [];
        setPermissions(userPerms);
        setError('');

        if (userPerms.includes('VIEW_USER_LIST')) fetchUsers();
        if (userPerms.includes('APPROVE_USER_CREATION')) fetchPendingRegistrations();
      } catch (err) {
        setToken('');
        localStorage.removeItem('token');
        navigate('/');
      }
    };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) { console.error('Failed to fetch active users'); }
  };

  const fetchPendingRegistrations = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/admin/pending-registrations', { headers: { Authorization: `Bearer ${token}` } });
      setPendingRegistrations(res.data);
    } catch (err) { console.error('Failed to fetch pending registrations'); }
  };

  const handleProcessRegistration = async (username, action) => {
    try {
      const res = await axios.post(`http://localhost:8080/api/admin/process-registration/${username}`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(res.data);
      setError('');
      fetchPendingRegistrations();
      fetchUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data || 'Failed to process request');
      setSuccess('');
    }
  };

  const handleEditRoles = (selectedUser) => {
    setAssignData({ username: selectedUser.username });
    setSelectedPerms(selectedUser.permissions || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTogglePermission = (permId) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleAssignPermissions = async (e) => {
      e.preventDefault();
      try {
        const res = await axios.post('http://localhost:8080/api/admin/assign-permissions', {
          username: assignData.username,
          permissions: selectedPerms,
        }, { headers: { Authorization: `Bearer ${token}` } });

        setSuccess(res.data);
        setError('');

        if (assignData.username === user?.username) fetchProfile();
        setAssignData({ username: '' });
        setSelectedPerms([]);

        if (permissions.includes('VIEW_USER_LIST')) fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data || 'Failed to assign permissions');
        setSuccess('');
      }
    };

  const handleLogout = () => {
    setToken(''); setUser(null); setPermissions([]); localStorage.removeItem('token'); navigate('/');
  };

  return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div className="sidebar">
          <div className="brand-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path stroke="#0ea5e9" strokeWidth="3" d="M12 7H7.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
                <path stroke="#bae6fd" strokeWidth="3" d="M18 7h-4.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H12" />
            </svg>
            <span className="brand-text">SmartStock</span>
          </div>
          <nav className="sidebar-nav">
            {/* The active class handles the new glowing sidebar effect */}
            <Link to="/user" className={isProfilePage ? 'active' : ''}>My Profile</Link>
            {permissions.includes('VIEW_USER_LIST') && <Link to="/admin" className={isPersonnelPage ? 'active' : ''}>Personnel Management</Link>}
            {(permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) && <Link to="/inventory">Inventory Operations</Link>}
            <button onClick={handleLogout} className="logout-btn">Log Out</button>
          </nav>
        </div>

        <div className="main-content" style={{ marginLeft: '260px', padding: '40px', width: 'calc(100% - 260px)', boxSizing: 'border-box' }}>
          <div className="container">

            {/* Dynamic Banner based on the Route */}
            <div className="dashboard-banner">
              <div className="banner-bg-shape-1"></div>
              <div className="banner-bg-shape-2"></div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  {isPersonnelPage ? 'Personnel Management' : 'Identity & Profile'}
                </h1>
                <p style={{ color: '#e0f2fe', fontSize: '16px', maxWidth: '600px' }}>
                  {isPersonnelPage ? 'Manage employee roles, track onboarding requests, and maintain internal system security.' : 'View your personal system privileges and account details.'}
                </p>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            {/* QUARANTINE SCREEN: Zero Permissions (Shows regardless of page) */}
            {user && permissions.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', borderTop: '4px solid #f59e0b' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <h2 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '16px' }}>Account Pending Authorization</h2>
                <p style={{ color: '#64748b', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                  Welcome to SmartStock, <strong>{user.username}</strong>! Your account has been approved, but you do not currently have any active roles assigned.
                  <br/><br/>
                  Please contact your Store Manager. They can assign your permissions from the Personnel tab.
                </p>
              </div>
            )}

            {/* ONLY RENDER ON THE /USER PROFILE PAGE */}
            {isProfilePage && user && permissions.length > 0 && (
              <div className="card" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>My Identity Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Username</p>
                    <p style={{ fontWeight: '700', fontSize: '20px', color: '#0f172a' }}>{user.username}</p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Email Address</p>
                    <p style={{ fontWeight: '700', fontSize: '20px', color: '#0f172a' }}>{user.email}</p>
                  </div>
                </div>
                <div style={{ marginTop: '24px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '12px' }}>Active Security Roles</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {permissions.map(p => (
                      <span key={p} style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                        {p.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ONLY RENDER ON THE /ADMIN PERSONNEL PAGE */}
            {isPersonnelPage && (permissions.includes('VIEW_USER_LIST') || permissions.includes('APPROVE_USER_CREATION') || permissions.includes('ASSIGN_PERMISSION')) && (
              <div className="card">
                <h2 style={{ fontSize: '22px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>Enterprise Personnel Directory</h2>

                {permissions.includes('APPROVE_USER_CREATION') && pendingRegistrations.length > 0 && (
                  <div style={{ marginBottom: '40px', padding: '24px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}>
                    <h3 style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      Pending Account Approvals ({pendingRegistrations.length})
                    </h3>
                    <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '16px' }}>These users have requested access but cannot log in until approved.</p>
                    <table className="table" style={{ background: 'white', borderRadius: '8px' }}>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email Address</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRegistrations.map(u => (
                          <tr key={u.id}>
                            <td><strong>{u.username}</strong></td>
                            <td>{u.email}</td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleProcessRegistration(u.username, 'APPROVE')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981' }}>Approve Access</button>
                              <button onClick={() => handleProcessRegistration(u.username, 'DECLINE')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444' }}>Decline & Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>

                  {/* EDIT/ASSIGN SYSTEM ROLES */}
                  {permissions.includes('ASSIGN_PERMISSION') && (
                    <div style={{ flex: '1 1 350px' }}>
                      <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '16px' }}>Edit System Privileges</h3>
                      <form onSubmit={handleAssignPermissions} className="form-group">
                        <input type="text" placeholder="Select a user from the roster below" value={assignData.username} onChange={(e) => setAssignData({ ...assignData, username: e.target.value })} required className="modern-input" readOnly={!assignData.username} />

                        <div style={{ marginTop: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Select Active Roles:</p>
                          {AVAILABLE_PERMISSIONS.map(perm => (
                            <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', color: '#334155' }}>
                              <input
                                type="checkbox"
                                checked={selectedPerms.includes(perm.id)}
                                onChange={() => handleTogglePermission(perm.id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>

                        <button type="submit" style={{ backgroundColor: '#8b5cf6' }}>Update Roles for Employee</button>
                      </form>
                    </div>
                  )}
                </div>

                {permissions.includes('VIEW_USER_LIST') && (
                  <div style={{ marginTop: '48px' }}>
                    <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '20px' }}>Active Personnel Roster</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>EMP ID</th>
                            <th>Username</th>
                            <th>Contact Email</th>
                            <th>Assigned Privileges</th>
                            {permissions.includes('ASSIGN_PERMISSION') && <th>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td style={{ color: '#94a3b8' }}>#{u.id}</td>
                              <td><strong style={{ color: '#0f172a' }}>{u.username}</strong></td>
                              <td>{u.email}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {u.permissions?.length > 0 ? u.permissions.map(p => (
                                    <span key={p} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                                      {p.replace(/_/g, ' ')}
                                    </span>
                                  )) : <span style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Pending Roles</span>}
                                </div>
                              </td>
                              {permissions.includes('ASSIGN_PERMISSION') && (
                                <td>
                                  <button onClick={() => handleEditRoles(u)} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                                    Edit Roles
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default UserManagement;