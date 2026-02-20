import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './App.css';

const UserManagement = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [requestData, setRequestData] = useState({ requestType: 'CREATE', targetUsername: '', targetEmail: '', reason: '' });
  const [assignData, setAssignData] = useState({ username: '', permissions: '' });
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
      if (token) {
        fetchProfile();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);

        const userPerms = res.data.permissions || [];
        setPermissions(userPerms);
        setError('');

        // Fetch admin data ONLY if the user actually has the permissions
        if (userPerms.includes('VIEW_USER_LIST')) fetchUsers();
        if (userPerms.includes('VIEW_REQUESTS')) fetchRequests();

      } catch (err) {
        setError('Failed to fetch profile');
        setToken('');
        localStorage.removeItem('token');
        navigate('/');
      }
    };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/admin/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch requests');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8080/api/admin/submit-request', requestData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(res.data);
      setError('');
      setRequestData({ requestType: 'CREATE', targetUsername: '', targetEmail: '', reason: '' });
      if (permissions.includes('VIEW_REQUESTS')) fetchRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to submit request');
      setSuccess('');
    }
  };

  const handleApproveRequest = async (requestId, status) => {
    try {
      const res = await axios.post(`http://localhost:8080/api/admin/approve-request/${requestId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(res.data);
      setError('');
      fetchRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to process request');
      setSuccess('');
    }
  };

  const handleAssignPermissions = async (e) => {
      e.preventDefault();
      try {
        const permissionsArray = assignData.permissions.split(',').map(p => p.trim());
        const res = await axios.post('http://localhost:8080/api/admin/assign-permissions', {
          username: assignData.username,
          permissions: permissionsArray,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSuccess(res.data);
        setError('');

        // FIX: If you updated your own permissions, refresh your profile immediately!
        if (assignData.username === user.username) {
          fetchProfile();
        }

        setAssignData({ username: '', permissions: '' });
        if (permissions.includes('VIEW_USER_LIST')) fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data || 'Failed to assign permissions');
        setSuccess('');
      }
    };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        <div className="sidebar">
          <div className="brand-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        {/* Left 'S' - Bold Sky Blue */}
                        <path stroke="#0ea5e9" strokeWidth="3" d="M12 7H7.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
                        {/* Right 'S' - Light Sky Blue offset */}
                        <path stroke="#bae6fd" strokeWidth="3" d="M18 7h-4.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H12" />
            </svg>
            <span className="brand-text">SmartStock</span>
          </div>
          <nav className="sidebar-nav">
            <Link to="/user">Profile</Link>
            {permissions.includes('VIEW_USER_LIST') && <Link to="/admin">Admin Dashboard</Link>}
            {(permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) && <Link to="/inventory">Inventory</Link>}
            <button onClick={handleLogout} style={{ marginTop: 'auto', backgroundColor: '#1e293b', color: '#f87171' }}>Logout</button>
          </nav>
        </div>

        <div className="main-content" style={{ marginLeft: '250px', padding: '24px', flex: 1 }}>
          <div className="container">
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            {user && (
              <div className="card">
                <h2>Profile</h2>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Permissions:</strong> {permissions.length ? permissions.join(', ') : 'None'}</p>
              </div>
            )}

            {(permissions.includes('VIEW_USER_LIST') || permissions.includes('APPROVE_USER_CREATION') || permissions.includes('CREATE_USER_REQUEST')) && (
              <div className="card">
                <h2>Admin Dashboard</h2>

                {permissions.includes('CREATE_USER_REQUEST') && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3>Submit User Request</h3>
                    <form onSubmit={handleSubmitRequest} className="form-group">
                      <select value={requestData.requestType} onChange={(e) => setRequestData({ ...requestData, requestType: e.target.value })}>
                        <option value="CREATE">Create User</option>
                        <option value="DELETE">Delete User</option>
                      </select>
                      <input type="text" placeholder="Target Username" value={requestData.targetUsername} onChange={(e) => setRequestData({ ...requestData, targetUsername: e.target.value })} />
                      <input type="email" placeholder="Target Email" value={requestData.targetEmail} onChange={(e) => setRequestData({ ...requestData, targetEmail: e.target.value })} />
                      <input type="text" placeholder="Reason" value={requestData.reason} onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })} />
                      <button type="submit">Submit Request</button>
                    </form>
                  </div>
                )}

                {permissions.includes('ASSIGN_PERMISSION') && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3>Assign Permissions</h3>
                    <form onSubmit={handleAssignPermissions} className="form-group">
                      <input type="text" placeholder="Username" value={assignData.username} onChange={(e) => setAssignData({ ...assignData, username: e.target.value })} />
                      <input type="text" placeholder="Permissions (comma-separated)" value={assignData.permissions} onChange={(e) => setAssignData({ ...assignData, permissions: e.target.value })} />
                      <button type="submit">Assign Permissions</button>
                    </form>
                  </div>
                )}

                {permissions.includes('VIEW_USER_LIST') && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3>Users</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Permissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.permissions?.join(', ') || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {permissions.includes('VIEW_REQUESTS') && (
                  <div>
                    <h3>User Requests</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Target</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.requestType}</td>
                            <td>{r.targetUsername}</td>
                            <td>{r.reason}</td>
                            <td>{r.status}</td>
                            <td>
                              {r.status === 'PENDING' && permissions.includes('APPROVE_USER_CREATION') && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleApproveRequest(r.id, 'APPROVED')} style={{ backgroundColor: '#10b981' }}>Approve</button>
                                  <button onClick={() => handleApproveRequest(r.id, 'REJECTED')} style={{ backgroundColor: '#ef4444' }}>Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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