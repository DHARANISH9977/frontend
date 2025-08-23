// Suppliers.js
import React, { useState } from 'react';
import { api } from './App';

const SuppliersView = ({ user, suppliers, fetchSuppliers }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post('/suppliers', formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: ''
      });
      fetchSuppliers();
      alert('Supplier created successfully!');
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert('Failed to create supplier: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await api.put(`/suppliers/${editingSupplier.id}`, formData);
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: ''
      });
      fetchSuppliers();
      alert('Supplier updated successfully!');
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Failed to update supplier: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      setLoading(true);
      try {
        await api.delete(`/suppliers/${id}`);
        fetchSuppliers();
        alert('Supplier deleted successfully!');
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="suppliers-view">
      <div className="section-header">
        <h2>Suppliers Management</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Add New Supplier'}
        </button>
      </div>
      
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New Supplier</h3>
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
              <label>Contact Person: *</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="form-actions">
              <button 
                onClick={handleCreate} 
                disabled={loading || !formData.name || !formData.contactPerson}
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
      
      {editingSupplier && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Supplier</h3>
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
              <label>Contact Person: *</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={loading}
              />
            </div>
            <div className="form-actions">
              <button 
                onClick={handleUpdate} 
                disabled={loading || !formData.name || !formData.contactPerson}
                className="btn-primary"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button 
                onClick={() => setEditingSupplier(null)} 
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
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact  No</th>
            </tr>
          </thead>
          <tbody>
            {safeSuppliers.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No suppliers found
                </td>
              </tr>
            ) : (
              safeSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contactPerson}</td>
                 
                  <td>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setFormData({
                          name: supplier.name,
                          contactPerson: supplier.contactPerson,
                          
                        });
                      }}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-danger"
                      onClick={() => handleDelete(supplier.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliersView;