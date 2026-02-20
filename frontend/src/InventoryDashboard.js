import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './App.css';

const InventoryDashboard = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [permissions, setPermissions] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', category: '', unitPrice: '', reorderPoint: 10 });
  const [stockUpdate, setStockUpdate] = useState({ sku: '', quantity: '', transactionType: 'RESTOCK', notes: '' });
  const [saleData, setSaleData] = useState({ sku: '', quantity: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [predictions, setPredictions] = useState([]); // <-- NEW STATE FOR AI
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchProfileAndProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchProfileAndProducts = async () => {
    try {
      const profileRes = await axios.get('http://localhost:8080/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userPerms = profileRes.data.permissions || [];
      setPermissions(userPerms);

      if (userPerms.includes('VIEW_INVENTORY') || userPerms.includes('MANAGE_INVENTORY') || userPerms.includes('PROCESS_SALE')) {
        fetchProducts();
        fetchTransactions();
        fetchPredictions(); // <-- FETCH AI DATA ON LOAD
      }
    } catch (err) {
      navigate('/');
    }
  };

  const fetchPredictions = async () => {
    try {
      // Fetch directly from the Python microservice on port 8000
      const res = await axios.get('http://localhost:8000/api/predict/stockout');
      setPredictions(res.data);
    } catch (err) {
      console.error('Failed to fetch AI predictions from Python service');
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedTx = res.data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      setTransactions(sortedTx);
    } catch (err) {
      console.error('Failed to fetch transactions');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      setError('Failed to fetch products');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8080/api/inventory/products', newProduct, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(`Product ${res.data.name} added successfully!`);
      setError('');
      setNewProduct({ sku: '', name: '', category: '', unitPrice: '', reorderPoint: 10 });
      fetchProducts();
      fetchTransactions();
      fetchPredictions(); // <-- REFRESH AI AFTER ACTION
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to add product');
      setSuccess('');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8080/api/inventory/stock/update', {
        ...stockUpdate,
        quantity: parseInt(stockUpdate.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Stock updated successfully!');
      setError('');
      setStockUpdate({ sku: '', quantity: '', transactionType: 'RESTOCK', notes: '' });
      fetchProducts();
      fetchTransactions();
      fetchPredictions(); // <-- REFRESH AI AFTER ACTION
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to update stock');
      setSuccess('');
    }
  };

  const handleProcessSale = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8080/api/inventory/sale', {
        sku: saleData.sku,
        quantity: parseInt(saleData.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Sale processed successfully!');
      setError('');
      setSaleData({ sku: '', quantity: '' });
      fetchProducts();
      fetchTransactions();
      fetchPredictions(); // <-- REFRESH AI AFTER ACTION
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to process sale');
      setSuccess('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="brand-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#0ea5e9" strokeWidth="3" d="M12 7H7.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
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

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ marginLeft: '250px', padding: '24px', flex: 1 }}>
        <div className="container">
          <h2>Inventory Management</h2>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '24px' }}>

            {/* STORE MANAGER: Add New Product */}
            {permissions.includes('MANAGE_INVENTORY') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3>Add New Product</h3>
                <form onSubmit={handleAddProduct} className="form-group">
                  <input type="text" placeholder="SKU (e.g., ITEM-001)" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} required />
                  <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required />
                  <input type="text" placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
                  <input type="number" placeholder="Unit Price" value={newProduct.unitPrice} onChange={(e) => setNewProduct({...newProduct, unitPrice: e.target.value})} required step="0.01" />
                  <input type="number" placeholder="Reorder Point" value={newProduct.reorderPoint} onChange={(e) => setNewProduct({...newProduct, reorderPoint: e.target.value})} required />
                  <button type="submit">Add Product</button>
                </form>
              </div>
            )}

            {/* INVENTORY CLERK: Update Stock */}
            {permissions.includes('MANAGE_INVENTORY') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3>Update Stock (Restock/Adjust)</h3>
                <form onSubmit={handleUpdateStock} className="form-group">
                  <input type="text" placeholder="Product SKU" value={stockUpdate.sku} onChange={(e) => setStockUpdate({...stockUpdate, sku: e.target.value})} required />
                  <input type="number" placeholder="Quantity" value={stockUpdate.quantity} onChange={(e) => setStockUpdate({...stockUpdate, quantity: e.target.value})} required />
                  <select value={stockUpdate.transactionType} onChange={(e) => setStockUpdate({...stockUpdate, transactionType: e.target.value})}>
                    <option value="RESTOCK">Restock (Add)</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                  <input type="text" placeholder="Notes (e.g., Supplier Name)" value={stockUpdate.notes} onChange={(e) => setStockUpdate({...stockUpdate, notes: e.target.value})} />
                  <button type="submit">Update Stock</button>
                </form>
              </div>
            )}

            {/* CASHIER: Process Sale */}
            {permissions.includes('PROCESS_SALE') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3>Process Sale (POS)</h3>
                <form onSubmit={handleProcessSale} className="form-group">
                  <input type="text" placeholder="Product SKU" value={saleData.sku} onChange={(e) => setSaleData({...saleData, sku: e.target.value})} required />
                  <input type="number" placeholder="Quantity to Sell" value={saleData.quantity} onChange={(e) => setSaleData({...saleData, quantity: e.target.value})} required min="1" />
                  <button type="submit" style={{ backgroundColor: '#10b981' }}>Complete Sale</button>
                </form>
              </div>
            )}
          </div>

          {/* EVERYONE: View Catalog */}
          {(permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) && (
            <div className="card" style={{ marginTop: '24px' }}>
              <h3>Current Inventory</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.sku}</strong></td>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>Ksh {p.unitPrice}</td>
                      <td style={{ fontWeight: 'bold', color: p.currentStock <= p.reorderPoint ? '#ef4444' : '#10b981' }}>
                        {p.currentStock}
                      </td>
                      <td>
                        {p.currentStock <= p.reorderPoint ? <span style={{color: '#ef4444', fontWeight: 'bold'}}>Low Stock</span> : <span style={{color: '#10b981'}}>Healthy</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI PREDICTIONS PANEL: Managers & Clerks */}
          {(permissions.includes('MANAGE_INVENTORY') || permissions.includes('VIEW_INVENTORY')) && predictions.length > 0 && (
            <div className="card" style={{ marginTop: '24px', borderTop: '4px solid #8b5cf6' }}>
              <h3>🧠 AI Insights & Stock-out Forecast</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Sales Velocity</th>
                      <th>Days Remaining</th>
                      <th>AI Alert Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((pred, idx) => (
                      <tr key={idx}>
                        <td><strong>{pred.sku}</strong></td>
                        <td>{pred.name}</td>
                        <td>{pred.velocity} units/day</td>
                        <td style={{ fontWeight: 'bold' }}>{pred.daysRemaining === 999 ? '999+' : pred.daysRemaining} days</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: pred.status === 'Healthy' ? '#ecfdf5' : (pred.status === 'Warning (Reorder Soon)' ? '#fef3c7' : '#fef2f2'),
                            color: pred.status === 'Healthy' ? '#059669' : (pred.status === 'Warning (Reorder Soon)' ? '#d97706' : '#ef4444')
                          }}>
                            {pred.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL: Store Managers Only */}
          {permissions.includes('MANAGE_INVENTORY') && (
            <div className="card" style={{ marginTop: '24px' }}>
              <h3>Audit Trail / Transaction History</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.transactionDate).toLocaleString()}</td>
                        <td><strong>{tx.handledBy}</strong></td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: tx.transactionType === 'SALE' ? '#fef2f2' : '#ecfdf5',
                            color: tx.transactionType === 'SALE' ? '#ef4444' : '#059669'
                          }}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td>{tx.sku}</td>
                        <td>{tx.productName}</td>
                        <td style={{ fontWeight: 'bold', color: tx.quantity > 0 ? '#059669' : '#ef4444' }}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </td>
                        <td>{tx.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;