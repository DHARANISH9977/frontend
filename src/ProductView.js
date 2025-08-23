import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductView.css';

function ProductsView({ user, products, fetchProducts }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    minStockLevel: 0,
    warehouseId: '',
    supplierId: ''
  });
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const safeProducts = Array.isArray(products) ? products : [];


  const fetchAPI = async (endpoint, options = {}) => {
    const baseURL = 'http://localhost:8080';
    const endpointsToTry = [
      `${baseURL}/api${endpoint}`,
      `${baseURL}${endpoint}`,
      `/api${endpoint}`,
      endpoint
    ];

    for (const url of endpointsToTry) {
      try {
        console.log(`Trying to fetch from: ${url}`);
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
          ...options
        });
        console.log(`Success from ${url}:`, response.data);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error.message);
      }
    }
    throw new Error('All API endpoints failed');
  };

  // Fetch warehouses and suppliers
  const fetchFormData = async () => {
    setWarehousesLoading(true);
    setSuppliersLoading(true);
    
    try {
      // warehouses
      try {
        const warehousesResponse = await fetchAPI('/warehouses');
        let warehousesData = extractDataFromResponse(warehousesResponse);
        setWarehouses(warehousesData);
      } catch (warehouseError) {
        console.error('Warehouse fetch failed:', warehouseError);
        setWarehouses([]);
      }
      
      // suppliers
      try {
        const suppliersResponse = await fetchAPI('/suppliers');
        let suppliersData = extractDataFromResponse(suppliersResponse);
        setSuppliers(suppliersData);
      } catch (supplierError) {
        console.error('Supplier fetch failed:', supplierError);
        setSuppliers([]);
      }
      
    } catch (error) {
      console.error('Error fetching form data:', error);
      showError('Failed to fetch data: ' + error.message);
    } finally {
      setWarehousesLoading(false);
      setSuppliersLoading(false);
    }
  };

  
  const extractDataFromResponse = (response) => {
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.content)) {
      return response.data.content;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (response.data && typeof response.data === 'object') {
      
      for (const key in response.data) {
        if (Array.isArray(response.data[key])) {
          return response.data[key];
        }
      }
    }
    return [];
  };

  useEffect(() => {
    if (showCreateForm || editingProduct) {
      fetchFormData();
    }
  }, [showCreateForm, editingProduct]);

  const resetFormData = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      minStockLevel: 0,
      warehouseId: '',
      supplierId: ''
    });
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  
  const handleCreate = async () => {
    setLoading(true);
    try {
      
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || null,
        minStockLevel: formData.minStockLevel || 0,
        warehouse: formData.warehouseId ? { id: parseInt(formData.warehouseId) } : null,
        supplier: formData.supplierId ? { id: parseInt(formData.supplierId) } : null
      };

      console.log('Creating product with data:', JSON.stringify(productData, null, 2));

      const endpointsToTry = [
        'http://localhost:8080/api/products',
        'http://localhost:8080/products',
        '/api/products',
        '/products'
      ];

      let lastError = null;
      
      for (const url of endpointsToTry) {
        try {
          console.log(`Trying POST to: ${url}`);
          const response = await axios.post(url, productData, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          console.log('Product created successfully:', response.data);
          
          setShowCreateForm(false);
          resetFormData();
          fetchProducts();
          showSuccess('Product created successfully!');
          return; 
          
        } catch (error) {
          lastError = error;
          console.warn(`Failed POST to ${url}:`, error.response?.data || error.message);
          
          
          if (error.response && error.response.headers['content-type']?.includes('text/html')) {
            console.error('Server returned HTML instead of JSON. This indicates a server-side error.');
            break; 
          }
        }
      }

      
      if (lastError) {
        throw lastError;
      }
      
    } catch (error) {
      console.error('Error creating product:', error);
      
      let errorMsg = 'Failed to create product: ';
      
      if (error.response) {
        // Server responded with error status
        const contentType = error.response.headers['content-type'];
        
        if (contentType && contentType.includes('text/html')) {
          errorMsg += 'Server error - please check backend logs';
        } else if (error.response.data) {
          // Try to extract meaningful error message
          if (typeof error.response.data === 'object') {
            errorMsg += error.response.data.message || JSON.stringify(error.response.data);
          } else {
            errorMsg += error.response.data;
          }
        } else {
          errorMsg += `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMsg += 'No response from server. Please check if the backend is running.';
      } else {
        // Other errors
        errorMsg += error.message;
      }
      
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    // Similar enhanced error handling for update
    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || null,
        minStockLevel: formData.minStockLevel || 0,
        warehouse: formData.warehouseId ? { id: parseInt(formData.warehouseId) } : null,
        supplier: formData.supplierId ? { id: parseInt(formData.supplierId) } : null
      };

      const response = await axios.put(`http://localhost:8080/api/products/${editingProduct.id}`, productData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      setEditingProduct(null);
      resetFormData();
      fetchProducts();
      showSuccess('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMsg = error.response?.data?.message || error.response?.data || error.message;
      showError('Failed to update product: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:8080/api/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchProducts();
        showSuccess('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        const errorMsg = error.response?.data?.message || error.response?.data || error.message;
        showError('Failed to delete product: ' + errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };
  const refreshSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const response = await fetchAPI('/suppliers');
      
      let suppliersData = [];
      if (Array.isArray(response.data)) {
        suppliersData = response.data;
      } else if (response.data && Array.isArray(response.data.content)) {
        suppliersData = response.data.content;
      } else if (response.data && Array.isArray(response.data.data)) {
        suppliersData = response.data.data;
      }
      
      setSuppliers(suppliersData);
      showSuccess('Suppliers refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing suppliers:', error);
      showError('Failed to refresh suppliers: ' + error.message);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const refreshWarehouses = async () => {
    setWarehousesLoading(true);
    try {
      const response = await fetchAPI('/warehouses');
      
      let warehousesData = [];
      if (Array.isArray(response.data)) {
        warehousesData = response.data;
      } else if (response.data && Array.isArray(response.data.content)) {
        warehousesData = response.data.content;
      } else if (response.data && Array.isArray(response.data.data)) {
        warehousesData = response.data.data;
      }
      
      setWarehouses(warehousesData);
      showSuccess('Warehouses refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing warehouses:', error);
      showError('Failed to refresh warehouses: ' + error.message);
    } finally {
      setWarehousesLoading(false);
    }
  };

  return (
    <div className="products-view">
      <div className="section-header">
        <h2>Product Catalog</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Create New Product'}
        </button>
      </div>

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Product</h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowCreateForm(false);
                  resetFormData();
                }}
                disabled={loading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Name: *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  disabled={loading}
                  placeholder="Product name"
                />
              </div>
              
              <div className="form-group">
                <label>SKU: *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  required
                  disabled={loading}
                  placeholder="Unique SKU code"
                />
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={loading}
                  placeholder="Product description"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Min Stock Level:</label>
                <input
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                  min="0"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Warehouse:</label>
                <div className="select-header">
                  <span>Select Warehouse</span>
                  <button 
                    type="button" 
                    onClick={refreshWarehouses}
                    disabled={warehousesLoading}
                    className="btn-refresh-small"
                    title="Refresh warehouses list"
                  >
                    {warehousesLoading ? '↻' : '↻'}
                  </button>
                </div>
                {warehousesLoading ? (
                  <div className="loading-text">Loading warehouses...</div>
                ) : warehouses.length === 0 ? (
                  <div className="no-data-message">
                    <p>No warehouses available.</p>
                    <p className="help-text">
                      Please create warehouses first in the Warehouses section.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.warehouseId || ''}
                    onChange={(e) => setFormData({...formData, warehouseId: e.target.value})}
                    disabled={loading}
                    className="warehouse-select"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} {warehouse.location && `- ${warehouse.location}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="form-group">
                <label>Supplier:</label>
                <div className="select-header">
                  <span>Select Supplier</span>
                  <button 
                    type="button" 
                    onClick={refreshSuppliers}
                    disabled={suppliersLoading}
                    className="btn-refresh-small"
                    title="Refresh suppliers list"
                  >
                    {suppliersLoading ? '↻' : '↻'}
                  </button>
                </div>
                {suppliersLoading ? (
                  <div className="loading-text">Loading suppliers...</div>
                ) : suppliers.length === 0 ? (
                  <div className="no-data-message">
                    <p>No suppliers available.</p>
                    <p className="help-text">
                      Please create suppliers first in the Suppliers section.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.supplierId || ''}
                    onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                    disabled={loading}
                    className="supplier-select"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.contactPerson && `- ${supplier.contactPerson}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={handleCreate} 
                disabled={loading || !formData.name || !formData.sku}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  resetFormData();
                }} 
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button 
                className="close-btn" 
                onClick={() => {
                  setEditingProduct(null);
                  resetFormData();
                }}
                disabled={loading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
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
                <label>SKU: *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={loading}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Min Stock Level:</label>
                <input
                  type="number"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                  min="0"
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label>Warehouse:</label>
                {warehousesLoading ? (
                  <div className="loading-text">Loading warehouses...</div>
                ) : warehouses.length === 0 ? (
                  <div className="no-warehouses">
                    No warehouses available.
                  </div>
                ) : (
                  <select
                    value={formData.warehouseId || ''}
                    onChange={(e) => setFormData({...formData, warehouseId: e.target.value})}
                    disabled={loading}
                    className="warehouse-select"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="form-group">
                <label>Supplier:</label>
                <div className="supplier-select-header">
                  <span>Select Supplier</span>
                  <button 
                    type="button" 
                    onClick={refreshSuppliers}
                    disabled={suppliersLoading}
                    className="btn-refresh-small"
                    title="Refresh suppliers list"
                  >
                    {suppliersLoading ? '↻' : '↻'}
                  </button>
                </div>
                {suppliersLoading ? (
                  <div className="loading-text">Loading suppliers...</div>
                ) : suppliers.length === 0 ? (
                  <div className="no-suppliers">
                    No suppliers available.
                  </div>
                ) : (
                  <select
                    value={formData.supplierId || ''}
                    onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                    disabled={loading}
                    className="supplier-select"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.contactPerson && `- ${supplier.contactPerson}`}
                        {supplier.email && ` (${supplier.email})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={handleUpdate} 
                disabled={loading || !formData.name || !formData.sku}
                className="btn-primary"
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  resetFormData();
                }} 
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      {/* Products Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>All Products ({safeProducts.length})</h3>
          <div className="table-actions">
            <button onClick={fetchProducts} className="btn-refresh">
              ↻ Refresh
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Description</th>
              <th>Min Stock</th>
              <th>Warehouse</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No products found. Click "Create New Product" to add your first product.
                </td>
              </tr>
            ) : (
              safeProducts.map(product => (
                <tr key={product.id} className={product.minStockLevel > 0 && product.minStockLevel <= 5 ? 'low-stock' : ''}>
                  <td className="id">{product.id}</td>
                  <td className="name">{product.name}</td>
                  <td className="sku">{product.sku}</td>
                  <td className="description">{product.description || '-'}</td>
                  <td className="min-stock">{product.minStockLevel || 0}</td>
                  <td className="warehouse">
                    {product.warehouse ? product.warehouse.name : 'No Warehouse'}
                  </td>
                  <td className="supplier">
                    {product.supplier ? (
                      <>
                        {product.supplier.name}
                        {product.supplier.contactPerson && ` (${product.supplier.contactPerson})`}
                      </>
                    ) : (
                      'No Supplier'
                    )}
                  </td>
                  <td className="actions">
                    <button 
                      className="btn-edit"
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData({
                          name: product.name || '',
                          sku: product.sku || '',
                          description: product.description || '',
                          minStockLevel: product.minStockLevel || 0,
                          warehouseId: product.warehouse?.id || '',
                          supplierId: product.supplier?.id || ''
                        });
                      }}
                      disabled={loading}
                      title="Edit Product"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(product.id)}
                      disabled={loading}
                      title="Delete Product"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Statistics */}
      <div className="stats-container">
        <div className="stat-card">
          <h4>Total Products</h4>
          <p className="stat-number">{safeProducts.length}</p>
        </div>
        <div className="stat-card">
          <h4>Products with Warehouse</h4>
          <p className="stat-number">
            {safeProducts.filter(p => p.warehouse).length}
          </p>
        </div>
        <div className="stat-card">
          <h4>Products with Supplier</h4>
          <p className="stat-number">
            {safeProducts.filter(p => p.supplier).length}
          </p>
        </div>
        <div className="stat-card warning">
          <h4>Low Stock Alert</h4>
          <p className="stat-number">
            {safeProducts.filter(p => p.minStockLevel > 0 && p.minStockLevel <= 5).length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductsView;