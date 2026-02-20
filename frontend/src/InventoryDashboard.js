import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
  const [predictions, setPredictions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const isInventoryPage = location.pathname === '/inventory';

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
        fetchPredictions();
        if (userPerms.includes('MANAGE_INVENTORY')) {
          fetchPurchaseOrders();
        }
      }
    } catch (err) {
      navigate('/');
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory/purchase-orders', { headers: { Authorization: `Bearer ${token}` } });
      setPurchaseOrders(res.data);
    } catch (err) { console.error('Failed to fetch purchase orders'); }
  };

  const fetchPredictions = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/predict/stockout');
      setPredictions(res.data);
    } catch (err) { console.error('Failed to fetch AI predictions from Python service'); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory/transactions', { headers: { Authorization: `Bearer ${token}` } });
      const sortedTx = res.data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      setTransactions(sortedTx);
    } catch (err) { console.error('Failed to fetch transactions'); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/inventory/products', { headers: { Authorization: `Bearer ${token}` } });
      setProducts(res.data);
    } catch (err) { setError('Failed to fetch products'); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8080/api/inventory/products', newProduct, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Product ${res.data.name} added successfully!`);
      setError('');
      setNewProduct({ sku: '', name: '', category: '', unitPrice: '', reorderPoint: 10 });
      refreshData();
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
        ...stockUpdate, quantity: parseInt(stockUpdate.quantity)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Stock updated successfully!');
      setError('');
      setStockUpdate({ sku: '', quantity: '', transactionType: 'RESTOCK', notes: '' });
      refreshData();
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
        sku: saleData.sku, quantity: parseInt(saleData.quantity)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Sale processed successfully!');
      setError('');
      setSaleData({ sku: '', quantity: '' });
      refreshData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to process sale');
      setSuccess('');
    }
  };

  const handleGeneratePO = async (sku, name) => {
    const qtyStr = window.prompt(`How many units of ${name} would you like to order from the supplier?`, "50");
    if (!qtyStr) return;

    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid number greater than 0."); return;
    }

    try {
      await axios.post('http://localhost:8080/api/inventory/purchase-order', { sku: sku, quantity: qty }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`Purchase Order generated for ${qty} units of ${name}!`);
      setError('');
      fetchPurchaseOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Failed to generate Purchase Order');
      setSuccess('');
    }
  };

  const refreshData = () => { fetchProducts(); fetchTransactions(); fetchPredictions(); };

  const handleLogout = () => { localStorage.removeItem('token'); setToken(''); navigate('/'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* NEW GLOWING SIDEBAR */}
      <div className="sidebar">
        <div className="brand-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#0ea5e9" strokeWidth="3" d="M12 7H7.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6" />
            <path stroke="#bae6fd" strokeWidth="3" d="M18 7h-4.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H12" />
          </svg>
          <span className="brand-text">SmartStock</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/user">My Profile</Link>
          {permissions.includes('VIEW_USER_LIST') && <Link to="/admin">Personnel Management</Link>}
          {(permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) && <Link to="/inventory" className={isInventoryPage ? 'active' : ''}>Inventory Operations</Link>}
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </nav>
      </div>

      <div className="main-content" style={{ marginLeft: '260px', padding: '40px', width: 'calc(100% - 260px)', boxSizing: 'border-box' }}>
        <div className="container">

          <div className="dashboard-banner">
            <div className="banner-bg-shape-1"></div>
            <div className="banner-bg-shape-2"></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                Inventory Operations Center
              </h1>
              <p style={{ color: '#e0f2fe', fontSize: '16px', maxWidth: '600px' }}>
                Monitor stock levels, process sales transactions, and leverage predictive AI insights.
              </p>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '16px' }}>

            {permissions.includes('MANAGE_INVENTORY') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3 style={{ fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>Add New Product</h3>
                <form onSubmit={handleAddProduct} className="form-group">
                  <input type="text" placeholder="SKU (e.g., ITEM-001)" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} required className="modern-input" />
                  <input type="text" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} required className="modern-input" />
                  <input type="text" placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="modern-input" />
                  <input type="number" placeholder="Unit Price" value={newProduct.unitPrice} onChange={(e) => setNewProduct({...newProduct, unitPrice: e.target.value})} required step="0.01" className="modern-input" />
                  <input type="number" placeholder="Reorder Point Threshold" value={newProduct.reorderPoint} onChange={(e) => setNewProduct({...newProduct, reorderPoint: e.target.value})} required className="modern-input" />
                  <button type="submit" style={{ marginTop: '8px' }}>Register Product</button>
                </form>
              </div>
            )}

            {permissions.includes('MANAGE_INVENTORY') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3 style={{ fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>Update Physical Stock</h3>
                <form onSubmit={handleUpdateStock} className="form-group">
                  <input type="text" placeholder="Product SKU" value={stockUpdate.sku} onChange={(e) => setStockUpdate({...stockUpdate, sku: e.target.value})} required className="modern-input" />
                  <input type="number" placeholder="Quantity" value={stockUpdate.quantity} onChange={(e) => setStockUpdate({...stockUpdate, quantity: e.target.value})} required className="modern-input" />
                  <select value={stockUpdate.transactionType} onChange={(e) => setStockUpdate({...stockUpdate, transactionType: e.target.value})} className="modern-select">
                    <option value="RESTOCK">Restock Delivery (Add)</option>
                    <option value="ADJUSTMENT">Damage/Loss Adjustment</option>
                  </select>
                  <input type="text" placeholder="Notes (e.g., Supplier Name)" value={stockUpdate.notes} onChange={(e) => setStockUpdate({...stockUpdate, notes: e.target.value})} className="modern-input" />
                  <button type="submit" style={{ marginTop: '8px', backgroundColor: '#8b5cf6' }}>Process Stock Update</button>
                </form>
              </div>
            )}

            {permissions.includes('PROCESS_SALE') && (
              <div className="card" style={{ flex: '1 1 300px' }}>
                <h3 style={{ fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>Point of Sale (POS)</h3>
                <form onSubmit={handleProcessSale} className="form-group">
                  <input type="text" placeholder="Scan or Enter Product SKU" value={saleData.sku} onChange={(e) => setSaleData({...saleData, sku: e.target.value})} required className="modern-input" />
                  <input type="number" placeholder="Quantity to Sell" value={saleData.quantity} onChange={(e) => setSaleData({...saleData, quantity: e.target.value})} required min="1" className="modern-input" />
                  <button type="submit" style={{ marginTop: '8px', backgroundColor: '#10b981', padding: '16px', fontSize: '16px' }}>Complete Sale</button>
                </form>
              </div>
            )}
          </div>

          {permissions.includes('MANAGE_INVENTORY') && products.length > 0 && (
            <div className="card" style={{ marginTop: '8px', borderTop: '4px solid #0ea5e9' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>📊 Inventory Volume Analytics</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Visual comparison of current stock versus minimum reorder thresholds.</p>
              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
                <BarChart width={Math.max(800, products.length * 120)} height={350} data={products} margin={{ top: 20, right: 30, left: 0, bottom: 60 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" style={{ fontSize: '12px', fontWeight: '500' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="currentStock" name="Current Stock" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="reorderPoint" name="Reorder Point" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              </div>
            </div>
          )}

          {(permissions.includes('MANAGE_INVENTORY') || permissions.includes('VIEW_INVENTORY')) && predictions.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                🧠 Predictive AI Insights
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {predictions.map((pred, idx) => {
                  const isCritical = pred.status === 'Critical (Stockout Imminent)';
                  const isWarning = pred.status === 'Warning (Reorder Soon)';
                  const borderColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                  const bgColor = isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5';

                  return (
                    <div key={idx} className="card" style={{ padding: '24px', borderTop: `4px solid ${borderColor}`, marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>{pred.name}</h4>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>{pred.sku}</span>
                        </div>
                        <span style={{ backgroundColor: bgColor, color: borderColor, padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
                          {pred.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div>
                          <p style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Sales Velocity</p>
                          <p style={{ margin: 0, fontWeight: '700', color: '#334155', fontSize: '16px' }}>{pred.velocity} <span style={{fontSize:'12px', fontWeight:'normal'}}>/ day</span></p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Depletion In</p>
                          <p style={{ margin: 0, fontWeight: '800', color: isCritical ? '#ef4444' : '#334155', fontSize: '16px' }}>
                            {pred.daysRemaining === 999 ? '999+ days' : `${pred.daysRemaining} days`}
                          </p>
                        </div>
                      </div>
                      {permissions.includes('MANAGE_INVENTORY') ? (
                        (isCritical || isWarning) ? (
                          <button onClick={() => handleGeneratePO(pred.sku, pred.name)} style={{ marginTop: 'auto', width: '100%', padding: '12px', backgroundColor: borderColor, color: '#fff' }}>
                            Generate Purchase Order
                          </button>
                        ) : (
                          <div style={{ marginTop: 'auto', width: '100%', padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontWeight: '500' }}>
                            Stock Levels Healthy
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {permissions.includes('MANAGE_INVENTORY') && purchaseOrders.length > 0 && (
            <div className="card" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>📦 Pending Supplier Requests (POs)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date Requested</th>
                      <th>Product Info</th>
                      <th>Quantity Ordered</th>
                      <th>Requested By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po) => (
                      <tr key={po.id}>
                        <td style={{ color: '#64748b' }}>{new Date(po.orderDate).toLocaleString()}</td>
                        <td><strong style={{ color: '#0f172a' }}>{po.product.name}</strong> <br/><span style={{ fontSize: '12px', color: '#94a3b8'}}>{po.product.sku}</span></td>
                        <td style={{ fontWeight: '700', fontSize: '16px' }}>{po.quantityOrdered} units</td>
                        <td>{po.generatedBy.username}</td>
                        <td>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fffbeb', color: '#d97706' }}>
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(permissions.includes('VIEW_INVENTORY') || permissions.includes('MANAGE_INVENTORY') || permissions.includes('PROCESS_SALE')) && (
            <div className="card" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Master Inventory Catalog</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Current Stock</th>
                      <th>Health Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: '#64748b', fontWeight: '500' }}>{p.sku}</td>
                        <td><strong style={{ color: '#0f172a' }}>{p.name}</strong></td>
                        <td>{p.category}</td>
                        <td>Ksh {p.unitPrice}</td>
                        <td style={{ fontWeight: '800', fontSize: '16px', color: p.currentStock <= p.reorderPoint ? '#ef4444' : '#10b981' }}>
                          {p.currentStock}
                        </td>
                        <td>
                          {p.currentStock <= p.reorderPoint ? <span style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Low Stock</span> : <span style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Healthy</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {permissions.includes('MANAGE_INVENTORY') && (
            <div className="card" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>System Audit Trail</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Authorized User</th>
                      <th>Action Type</th>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Variance</th>
                      <th>Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ color: '#64748b', fontSize: '13px' }}>{new Date(tx.transactionDate).toLocaleString()}</td>
                        <td><strong style={{ color: '#0f172a' }}>{tx.handledBy}</strong></td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: tx.transactionType === 'SALE' ? '#fef2f2' : '#ecfdf5', color: tx.transactionType === 'SALE' ? '#ef4444' : '#059669' }}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{tx.sku}</td>
                        <td>{tx.productName}</td>
                        <td style={{ fontWeight: '800', fontSize: '15px', color: tx.quantity > 0 ? '#059669' : '#ef4444' }}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </td>
                        <td style={{ color: '#64748b', fontStyle: 'italic' }}>{tx.notes || '-'}</td>
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