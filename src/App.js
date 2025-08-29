import React, { useState, useEffect } from 'react';
import ProductsView from './ProductView';
import WarehousesView from './Warehouses';
import SuppliersView from './SuppliersView';
import WarehouseReports from './WarehouseReports';
import axios from 'axios';
import './App.css';

// API configuration
const API_BASE_URL = 'https://www-inventory-com.onrender.com/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Utility function to safely access nested properties
const safeGet = (obj, path, defaultValue = []) => {
  if (!obj) return defaultValue;
  const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
  return value !== undefined ? value : defaultValue;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    product_id: '',
    warehouse_id: '',
    adjustment_quantity: '',
    adjustment_type: 'STOCK_IN'
  });

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const { token, user: userData } = response.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };
 
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Fetch data functions with error handling
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('RAW Products API response:', response);
      console.log('Products data structure:', response.data);
      
      // Handle different response formats
      let productsData = [];
      if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data && Array.isArray(response.data.content)) {
        productsData = response.data.content;
      } else if (response.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (response.data && Array.isArray(response.data.products)) {
        productsData = response.data.products;
      }
      
      console.log('Processed products data:', productsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      console.log('Fetching warehouses...');
      const response = await api.get('/warehouses');
      console.log('Warehouses response:', response.data);
      
      let warehousesData = [];
      if (Array.isArray(response.data)) {
        warehousesData = response.data;
      } else if (response.data && Array.isArray(response.data.content)) {
        warehousesData = response.data.content;
      }
      
      setWarehouses(warehousesData);
      return warehousesData;
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      
      // Try alternative endpoint
      try {
        const response = await api.get('/api/warehouses');
        console.log('Alternative endpoint response:', response.data);
        
        if (Array.isArray(response.data)) {
          setWarehouses(response.data);
          return response.data;
        }
      } catch (secondError) {
        console.error('Both endpoints failed:', secondError);
        setWarehouses([]);
      }
      
      return [];
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      console.log('RAW Inventory API response:', response.data);
      
      // Handle different response formats
      const inventoryData = Array.isArray(response.data) ? response.data : 
                           Array.isArray(response.data.content) ? response.data.content : 
                           Array.isArray(response.data.data) ? response.data.data : [];
      
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  };

  const fetchStockHistory = async () => {
    try {
      const response = await api.get('/inventory/history');
      console.log('RAW Stock History API response:', response.data);
      
      // Handle different response formats
      const historyData = Array.isArray(response.data) ? response.data : 
                         Array.isArray(response.data.content) ? response.data.content : [];
      
      setStockHistory(historyData);
    } catch (error) {
      console.error('Error fetching stock history:', error);
      setStockHistory([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      // Handle different response formats
      const suppliersData = Array.isArray(response.data) ? response.data : 
                           Array.isArray(response.data.content) ? response.data.content : [];
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      // Handle different response formats
      const usersData = Array.isArray(response.data) ? response.data : 
                       Array.isArray(response.data.content) ? response.data.content : [];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Make sure IDs are numbers, not strings
      const payload = {
        ...adjustmentData,
        product_id: parseInt(adjustmentData.product_id),
        warehouse_id: parseInt(adjustmentData.warehouse_id),
        adjustment_quantity: parseInt(adjustmentData.adjustment_quantity)
      };
      
      await api.post('/inventory/adjust', payload);
      alert('Stock adjustment recorded successfully!');
      setShowAdjustmentForm(false);
      setAdjustmentData({
        product_id: '',
        warehouse_id: '',
        adjustment_quantity: '',
        adjustment_type: 'STOCK_IN'
      });
      fetchInventory();
      fetchStockHistory();
    } catch (error) {
      console.error('Stock adjustment error:', error);
      alert('Failed to adjust stock: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Load data when user logs in or changes tabs
  useEffect(() => {
    if (user) {
      if (activeTab === 'products') {
        fetchProducts();
      } else if (activeTab === 'warehouses') {
        fetchWarehouses();
      } else if (activeTab === 'inventory') {
        fetchInventory();
        fetchStockHistory();
        fetchWarehouses(); // Fetch warehouses for the adjustment form
      } else if (activeTab === 'suppliers') {
        fetchSuppliers();
      } else if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'reports') {
        fetchWarehouses();
      }
    }
  }, [user, activeTab]);

  if (!user) {
    return <LoginForm onLogin={handleLogin} loading={loading} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Inventory Management System</h1>
        <div className="user-info">
          <span>Welcome, {user.name} ({user.role})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-tachometer-alt"></i> Dashboard
        </button>
        <button 
          className={activeTab === 'inventory' ? 'active' : ''} 
          onClick={() => setActiveTab('inventory')}
        >
          <i className="fas fa-boxes"></i> Inventory
        </button>
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button 
            className={activeTab === 'products' ? 'active' : ''} 
            onClick={() => setActiveTab('products')}
          >
            <i className="fas fa-cube"></i> Products
          </button>
        )}
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button 
            className={activeTab === 'suppliers' ? 'active' : ''} 
            onClick={() => setActiveTab('suppliers')}
          >
            <i className="fas fa-truck"></i> Suppliers
          </button>
        )}
        
        {user.role === 'ADMIN' && (
          <button 
            className={activeTab === 'warehouses' ? 'active' : ''} 
            onClick={() => setActiveTab('warehouses')}
          >
            <i className="fas fa-warehouse"></i> Warehouses
          </button>
        )}
        
        {user.role === 'ADMIN' && (
          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-users"></i> Users
          </button>
        )}
        
        {/* Add Reports button for ADMIN and MANAGER roles */}
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => setActiveTab('reports')}
          >
            <i className="fas fa-chart-bar"></i> Reports
          </button>
        )}
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard user={user} inventory={inventory} />}
        {activeTab === 'inventory' && (
          <InventoryView 
            user={user} 
            inventory={inventory} 
            stockHistory={stockHistory}
            warehouses={warehouses}
            showAdjustmentForm={showAdjustmentForm}
            setShowAdjustmentForm={setShowAdjustmentForm}
            adjustmentData={adjustmentData}
            setAdjustmentData={setAdjustmentData}
            handleAdjustStock={handleAdjustStock}
            loading={loading}
          />
        )}
        {activeTab === 'products' && <ProductsView user={user} products={products} fetchProducts={fetchProducts} />}
        {activeTab === 'suppliers' && <SuppliersView user={user} suppliers={suppliers} fetchSuppliers={fetchSuppliers} />}
        {activeTab === 'warehouses' && <WarehousesView user={user} warehouses={warehouses} fetchWarehouses={fetchWarehouses} />}
        {activeTab === 'users' && <UsersView user={user} users={users} fetchUsers={fetchUsers} />}
        
        {/* Add WarehouseReports component */}
        {activeTab === 'reports' && <WarehouseReports user={user} />}
      </main>
    </div>
  );
}

// Login Form Component with enhanced styling and animations
function LoginForm({ onLogin, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleFocus = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-header">
          <h2>Inventory Management System</h2>
          <p>Sign in to access your account</p>
        </div>
        
        <div className={`form-group ${isFocused.email || email ? 'focused' : ''}`}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => handleFocus('email')}
            onBlur={() => handleBlur('email')}
            required
            placeholder=" "
          />
          <div className="input-highlight"></div>
        </div>
        
        <div className={`form-group ${isFocused.password || password ? 'focused' : ''}`}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => handleFocus('password')}
            onBlur={() => handleBlur('password')}
            required
            placeholder=" "
          />
          <div className="input-highlight"></div>
        </div>
        
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Logging in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        <div>
          <h1>Demo login for admin</h1>
          <h1>admin@example.com</h1>
          <h3>admin123</h3>
        </div>
    
      </form>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user, inventory }) {
  const lowStockItems = inventory.filter(item => item && (item.stockLevel || item.stock_level || item.quantity || 0) < 10);
  const criticalStockItems = inventory.filter(item => item && (item.stockLevel || item.stock_level || item.quantity || 0) < 5);
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Welcome back, {user.name}!</h2>
        <p>Here's an overview of your inventory status</p>
      </div>
      
      <div className="dashboard-cards">
        <div className="card card-primary">
          <div className="card-icon">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="card-content">
            <h3>Total Inventory Items</h3>
            <p className="number">{inventory.length}</p>
          </div>
        </div>
        
        <div className="card card-success">
          <div className="card-icon">
            <i className="fas fa-box-open"></i>
          </div>
          <div className="card-content">
            <h3>Total Stock Quantity</h3>
            <p className="number">{inventory.reduce((sum, item) => sum + (item?.stockLevel || item?.stock_level || item?.quantity || 0), 0)}</p>
          </div>
        </div>
        
        <div className="card card-warning">
          <div className="card-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="card-content">
            <h3>Low Stock Alerts</h3>
            <p className="number">{lowStockItems.length}</p>
          </div>
        </div>
        
        <div className="card card-danger">
          <div className="card-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="card-content">
            <h3>Critical Stock</h3>
            <p className="number">{criticalStockItems.length}</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Stock Status Overview</h3>
          <div className="stock-status-chart">
            <div className="chart-bar ok" style={{width: `${(inventory.length - lowStockItems.length) / Math.max(inventory.length, 1) * 100}%`}}>
              <span>OK: {inventory.length - lowStockItems.length}</span>
            </div>
            <div className="chart-bar low" style={{width: `${(lowStockItems.length - criticalStockItems.length) / Math.max(inventory.length, 1) * 100}%`}}>
              <span>Low: {lowStockItems.length - criticalStockItems.length}</span>
            </div>
            <div className="chart-bar critical" style={{width: `${criticalStockItems.length / Math.max(inventory.length, 1) * 100}%`}}>
              <span>Critical: {criticalStockItems.length}</span>
            </div>
          </div>
        </div>
        
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">
                <i className="fas fa-plus-circle success"></i>
              </div>
              <div className="activity-content">
                <p>Stock added to Warehouse A</p>
                <span>2 hours ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <i className="fas fa-minus-circle danger"></i>
              </div>
              <div className="activity-content">
                <p>Stock reduced from Warehouse B</p>
                <span>5 hours ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <i className="fas fa-exclamation-triangle warning"></i>
              </div>
              <div className="activity-content">
                <p>Low stock alert in Warehouse C</p>
                <span>Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inventory View Component with Pagination, Sorting, and Search
function InventoryView({ 
  user, 
  inventory, 
  stockHistory, 
  warehouses,
  showAdjustmentForm,
  setShowAdjustmentForm,
  adjustmentData,
  setAdjustmentData,
  handleAdjustStock,
  loading 
}) {
  // State for pagination, sorting and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('warehouse');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'critical', 'ok'

  // Helper function to get sort value - MOVED TO THE TOP
  const getSortValue = (item, field) => {
    switch (field) {
      case 'warehouse':
        return item.warehouse?.name || 
               item.warehouseName || 
               item.Warehouse?.Name ||
               (item.warehouseId ? `Warehouse ${item.warehouseId}` : 'Unknown Warehouse');
      case 'stock':
        return item.stockLevel || item.stock_level || item.quantity || 0;
      case 'status':
        const stockLevel = item.stockLevel || item.stock_level || item.quantity || 0;
        if (stockLevel < 5) return 0; // Critical
        if (stockLevel < 10) return 1; // Low
        return 2; // OK
      default:
        return '';
    }
  };

  // Safe access to properties
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeStockHistory = Array.isArray(stockHistory) ? stockHistory : [];
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];

  // Filter inventory based on search term and stock filter
  const filteredInventory = safeInventory.filter(item => {
    const warehouseName = item.warehouse?.name || 
                         item.warehouseName || 
                         item.Warehouse?.Name ||
                         (item.warehouseId ? `Warehouse ${item.warehouseId}` : 'Unknown Warehouse');
    
    // Search filter
    const matchesSearch = warehouseName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Stock status filter
    const stockLevel = item.stockLevel || item.stock_level || item.quantity || 0;
    let matchesStockFilter = true;
    
    if (stockFilter === 'low') {
      matchesStockFilter = stockLevel < 10 && stockLevel >= 5;
    } else if (stockFilter === 'critical') {
      matchesStockFilter = stockLevel < 5;
    } else if (stockFilter === 'ok') {
      matchesStockFilter = stockLevel >= 10;
    }
    
    return matchesSearch && matchesStockFilter;
  });

  // Sort inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const aValue = getSortValue(a, sortField);
    const bValue = getSortValue(b, sortField);
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = sortedInventory.slice(startIndex, startIndex + itemsPerPage);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="inventory-view">
      <div className="section-header">
        <h2>Inventory Management</h2>
        {user.role !== 'EMPLOYEE' && (
          <button 
            className="btn-primary"
            onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}
          >
            {showAdjustmentForm ? 'Cancel Adjustment' : 'Record Stock Adjustment'}
          </button>
        )}
      </div>

      {showAdjustmentForm && (
        <div className="adjustment-form slide-in">
          <h3>Record Stock Adjustment</h3>
          <form onSubmit={handleAdjustStock}>
            <div className="form-group">
              <label htmlFor="warehouse">Warehouse:</label>
              <select
                id="warehouse"
                value={adjustmentData.warehouse_id}
                onChange={(e) => setAdjustmentData({...adjustmentData, warehouse_id: e.target.value})}
                required
                disabled={loading || safeWarehouses.length === 0}
              >
                <option value="">Select Warehouse</option>
                {loading ? (
                  <option value="" disabled>Loading warehouses...</option>
                ) : safeWarehouses.length === 0 ? (
                  <option value="" disabled>No warehouses available</option>
                ) : (
                  safeWarehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name || warehouse.warehouseName || `Warehouse ${warehouse.id}`}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="quantity">Quantity:</label>
              <input
                type="number"
                id="quantity"
                value={adjustmentData.adjustment_quantity}
                onChange={(e) => setAdjustmentData({...adjustmentData, adjustment_quantity: e.target.value})}
                required
                min="1"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Adjustment Type:</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="STOCK_IN"
                    checked={adjustmentData.adjustment_type === 'STOCK_IN'}
                    onChange={(e) => setAdjustmentData({...adjustmentData, adjustment_type: e.target.value})}
                    disabled={loading}
                  />
                  Stock In
                </label>
                <label>
                  <input
                    type="radio"
                    value="STOCK_OUT"
                    checked={adjustmentData.adjustment_type === 'STOCK_OUT'}
                    onChange={(e) => setAdjustmentData({...adjustmentData, adjustment_type: e.target.value})}
                    disabled={loading}
                  />
                  Stock Out
                </label>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Processing...' : 'Record Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="inventory-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by warehouse name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <i className="fas fa-search"></i>
        </div>
        
        <div className="filter-controls">
          <label>Stock Status:</label>
          <select 
            value={stockFilter} 
            onChange={(e) => {
              setStockFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="ok">OK Stock</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical Stock</option>
          </select>
        </div>
        
        <div className="items-per-page">
          <label>Items per page:</label>
          <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <div className="inventory-table fade-in">
        <h3>Current Inventory Levels</h3>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('warehouse')} className="sortable">
                Warehouse {renderSortIndicator('warehouse')}
              </th>
              <th onClick={() => handleSort('stock')} className="sortable">
                Stock Level {renderSortIndicator('stock')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {renderSortIndicator('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedInventory.map(item => (
              <tr key={item.id}>
                <td>
                  {item.warehouse?.name || 
                   item.warehouseName || 
                   item.Warehouse?.Name ||
                   (item.warehouseId ? `Warehouse ${item.warehouseId}` : 'Unknown Warehouse')}
                </td>
                <td>{item.stockLevel || item.stock_level || item.quantity || 0}</td>
                <td>
                  <span className={`status ${(item.stockLevel || item.stock_level || item.quantity || 0) < 5 ? 'critical' : (item.stockLevel || item.stock_level || item.quantity || 0) < 10 ? 'low' : 'ok'}`}>
                    {(item.stockLevel || item.stock_level || item.quantity || 0) < 5 ? 'Critical' : (item.stockLevel || item.stock_level || item.quantity || 0) < 10 ? 'Low Stock' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'active' : ''}
              >
                {page}
              </button>
            ))}
            
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            
            <span className="pagination-info">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedInventory.length)} of {sortedInventory.length} items
            </span>
          </div>
        )}
      </div>

      <div className="history-table fade-in">
        <h3>Stock History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {safeStockHistory.map(history => (
              <tr key={history.id}>
                <td>{history.timestamp ? new Date(history.timestamp).toLocaleDateString() : 'Unknown Date'}</td>
                <td>
                  {history.warehouse?.name || 
                   history.warehouseName || 
                   history.Warehouse?.Name ||
                   (history.warehouseId ? `Warehouse ${history.warehouseId}` : 'Unknown Warehouse')}
                </td>
                <td>
                  <span className={`adjustment-type ${history.adjustmentType ? history.adjustmentType.toLowerCase() : 'unknown'}`}>
                    {history.adjustmentType || 'UNKNOWN'}
                  </span>
                </td>
                <td>{history.adjustmentQuantity || history.quantity || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// Users View Component
function UsersView({ user, users, fetchUsers }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE'
  });
  const [loading, setLoading] = useState(false);

  const safeUsers = Array.isArray(users) ? users : [];

  const handleCreate = async () => {
    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        passwordHash: formData.password,
        role: formData.role
      };
      
      await api.post('/users', userData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE'
      });
      fetchUsers();
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };
      
      if (formData.password) {
        updateData.passwordHash = formData.password;
      }
      
      await api.put(`/users/${editingUser.id}`, updateData);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE'
      });
      fetchUsers();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const canModifyUser = (targetUser) => {
    if (user.role === 'ADMIN' && targetUser.id !== user.id) return true;
    if (user.role === 'MANAGER' && targetUser.role === 'EMPLOYEE') return true;
    return false;
  };

  const canCreateRole = (role) => {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'MANAGER' && role === 'EMPLOYEE') return true;
    return false;
  };

  return (
    <div className="users-view">
      <div className="section-header">
        <h2>User Management</h2>
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(true)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Add New User'}
          </button>
        )}
      </div>
      
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content slide-in">
            <h3>Create New User</h3>
            <div className="form-group">
              <label>Name: *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email: *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Password: *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={loading}
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>Role: *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                disabled={user.role !== 'ADMIN' || loading}
              >
                <option value="EMPLOYEE">Employee</option>
                {user.role === 'ADMIN' && (
                  <>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-actions">
              <button 
                onClick={handleCreate} 
                disabled={loading || !formData.name || !formData.email || !formData.password || !canCreateRole(formData.role)}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button 
                onClick={() => setShowCreateForm(false)} 
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
     
     {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content slide-in">
            <h3>Edit User</h3>
            <div className="form-group">
              <label>Name: *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email: *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Password (leave empty to keep current):</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                disabled={loading}
                placeholder="Enter new password or leave blank"
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>Role: *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                disabled={user.role !== 'ADMIN' || editingUser.id === user.id || loading}
              >
                <option value="EMPLOYEE">Employee</option>
                {user.role === 'ADMIN' && (
                  <>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </>
                )}
              </select>
              {editingUser.id === user.id && (
                <p className="form-help">You cannot change your own role</p>
              )}
            </div>
            <div className="form-actions">
              <button 
                onClick={handleUpdate} 
                disabled={loading || !formData.name || !formData.email || !canCreateRole(formData.role)}
                className="btn-primary"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button 
                onClick={() => setEditingUser(null)} 
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
      
      <div className="table-container fade-in">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeUsers.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No users found
                </td>
              </tr>
            ) : (
              safeUsers.map(userItem => (
                <tr key={userItem.id}>
                  <td>{userItem.name}</td>
                  <td>{userItem.email}</td>
                  <td>{userItem.role}</td>
                  <td>
                    {canModifyUser(userItem) ? (
                      <>
                        <button 
                          className="btn-secondary"
                          onClick={() => {
                            setEditingUser(userItem);
                            setFormData({
                              name: userItem.name,
                              email: userItem.email,
                              password: '',
                              role: userItem.role
                            });
                          }}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDelete(userItem.id)}
                          disabled={loading || userItem.id === user.id}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="no-permission">No permission</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;