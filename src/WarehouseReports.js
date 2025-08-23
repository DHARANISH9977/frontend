// WarehouseReports.js
import React, { useState, useEffect } from 'react';
import { api } from './App';
import './WarehouseReports.css';

const WarehouseReports = ({ user }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Fetch warehouses
        const warehousesResponse = await api.get('/warehouses');
        const warehousesData = Array.isArray(warehousesResponse.data) 
          ? warehousesResponse.data 
          : Array.isArray(warehousesResponse.data.content) 
            ? warehousesResponse.data.content 
            : [];
        setWarehouses(warehousesData);

        // Fetch products
        const productsResponse = await api.get('/products');
        const productsData = Array.isArray(productsResponse.data) 
          ? productsResponse.data 
          : Array.isArray(productsResponse.data.content) 
            ? productsResponse.data.content 
            : [];
        setProducts(productsData);

        // Fetch inventory
        const inventoryResponse = await api.get('/inventory');
        const inventoryData = Array.isArray(inventoryResponse.data) 
          ? inventoryResponse.data 
          : Array.isArray(inventoryResponse.data.content) 
            ? inventoryResponse.data.content 
            : [];
        setInventory(inventoryData);

        // Fetch suppliers
        const suppliersResponse = await api.get('/suppliers');
        const suppliersData = Array.isArray(suppliersResponse.data) 
          ? suppliersResponse.data 
          : Array.isArray(suppliersResponse.data.content) 
            ? suppliersResponse.data.content 
            : [];
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Error fetching data for reports:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate report when warehouse is selected
  useEffect(() => {
    if (selectedWarehouse) {
      generateReport(selectedWarehouse);
    }
  }, [selectedWarehouse, products, inventory, suppliers]);

  const generateReport = (warehouseId) => {
    setLoading(true);
    
    // Find the selected warehouse
    const warehouse = warehouses.find(w => w.id == warehouseId);
    
    if (!warehouse) {
      setReportData(null);
      setLoading(false);
      return;
    }
    
    // Get products in this warehouse
    const warehouseProducts = products.filter(product => 
      product.warehouse && product.warehouse.id == warehouseId
    );
    
    // Get inventory for this warehouse
    const warehouseInventory = inventory.filter(item => 
      item.warehouse && item.warehouse.id == warehouseId
    );
    
    // Enrich products with inventory data and supplier info
    const enrichedProducts = warehouseProducts.map(product => {
      const inventoryItem = warehouseInventory.find(item => 
        item.product && item.product.id === product.id
      );
      
      // Find complete supplier details
      const productSupplier = product.supplier 
        ? suppliers.find(s => s.id === product.supplier.id) 
        : null;
      
      return {
        ...product,
        currentStock: inventoryItem ? inventoryItem.stockLevel : 0,
        supplier: productSupplier || null
      };
    });
    
    // Group products by supplier
    const productsBySupplier = {};
    enrichedProducts.forEach(product => {
      const supplierId = product.supplier ? product.supplier.id : 'no-supplier';
      const supplierName = product.supplier ? product.supplier.name : 'No Supplier';
      
      if (!productsBySupplier[supplierId]) {
        productsBySupplier[supplierId] = {
          supplier: product.supplier || { name: 'No Supplier' },
          products: []
        };
      }
      
      productsBySupplier[supplierId].products.push(product);
    });
    
    // Calculate totals
    const totalProducts = enrichedProducts.length;
    const totalStockValue = enrichedProducts.reduce((sum, product) => {
      // Assuming each product has a price field - adjust if your data structure differs
      const price = product.price || 0;
      return sum + (price * (product.currentStock || 0));
    }, 0);
    
    const lowStockProducts = enrichedProducts.filter(product => 
      product.minStockLevel > 0 && product.currentStock <= product.minStockLevel
    );
    
    setReportData({
      warehouse,
      productsBySupplier,
      totalProducts,
      totalStockValue,
      lowStockProducts: lowStockProducts.length,
      generatedAt: new Date().toLocaleString()
    });
    
    setLoading(false);
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += `Warehouse Report: ${reportData.warehouse.name} (${reportData.warehouse.location})\n`;
    csvContent += `Generated on: ${reportData.generatedAt}\n\n`;
    
    // Summary
    csvContent += "SUMMARY\n";
    csvContent += `Total Products,${reportData.totalProducts}\n`;
    csvContent += `Low Stock Items,${reportData.lowStockProducts}\n`;
    csvContent += `Estimated Total Value,${reportData.totalStockValue.toFixed(2)}\n\n`;
    
    // Products by supplier
    csvContent += "PRODUCTS BY SUPPLIER\n";
    Object.values(reportData.productsBySupplier).forEach(({ supplier, products }) => {
      csvContent += `\nSupplier: ${supplier.name}\n`;
      if (supplier.contactPerson) csvContent += `Contact Person: ${supplier.contactPerson}\n`;
      if (supplier.email) csvContent += `Email: ${supplier.email}\n`;
      if (supplier.phone) csvContent += `Phone: ${supplier.phone}\n`;
      
      csvContent += "Product Name,SKU,Description,Current Stock,Min Stock,Status\n";
      
      products.forEach(product => {
        const status = product.minStockLevel > 0 && product.currentStock <= product.minStockLevel 
          ? "LOW STOCK" 
          : "OK";
        
        csvContent += `"${product.name}",${product.sku},"${product.description || ''}",${product.currentStock},${product.minStockLevel || 0},${status}\n`;
      });
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warehouse-report-${reportData.warehouse.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // This would require a PDF library like jspdf
    // For now, we'll just alert the user
    alert("PDF export functionality would be implemented here with a library like jsPDF");
  };

  if (dataLoading) {
    return (
      <div className="reports-view">
        <div className="loading-overlay">
          <div className="loading-spinner">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-view">
      <div className="section-header">
        <h2>Warehouse Reports</h2>
        {reportData && (
          <div className="export-buttons">
            <button className="btn-secondary" onClick={exportToCSV}>
              Export to CSV
            </button>
            <button className="btn-secondary" onClick={exportToPDF}>
              Export to PDF
            </button>
          </div>
        )}
      </div>
      
      <div className="report-controls">
        <div className="form-group">
          <label>Select Warehouse:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            disabled={loading || warehouses.length === 0}
          >
            <option value="">Choose a warehouse</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} - {warehouse.location}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Generating report...</div>
        </div>
      )}
      
      {warehouses.length === 0 && !dataLoading && (
        <div className="empty-state">
          <div className="empty-state-icon">🏭</div>
          <h3>No Warehouses Available</h3>
          <p>There are no warehouses to generate reports for.</p>
        </div>
      )}
      
      {reportData && !loading && (
        <div className="report-content">
          <div className="report-header">
            <h3>Warehouse Report: {reportData.warehouse.name}</h3>
            <p>Location: {reportData.warehouse.location}</p>
            <p>Generated on: {reportData.generatedAt}</p>
          </div>
          
          <div className="report-summary">
            <h4>Summary</h4>
            <div className="summary-cards">
              <div className="summary-card">
                <h5>Total Products</h5>
                <p className="summary-value">{reportData.totalProducts}</p>
              </div>
              <div className="summary-card warning">
                <h5>Low Stock Items</h5>
                <p className="summary-value">{reportData.lowStockProducts}</p>
              </div>
              <div className="summary-card">
                <h5>Estimated Total Value</h5>
                <p className="summary-value">${reportData.totalStockValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="supplier-sections">
            <h4>Products by Supplier</h4>
            {Object.values(reportData.productsBySupplier).map(({ supplier, products }) => (
              <div key={supplier.id || 'no-supplier'} className="supplier-section">
                <h5>
                  {supplier.name}
                  {supplier.contactPerson && ` - Contact: ${supplier.contactPerson}`}
                </h5>
                
                <div className="supplier-details">
                  {supplier.email && <p><strong>Email:</strong> {supplier.email}</p>}
                  {supplier.phone && <p><strong>Phone:</strong> {supplier.phone}</p>}
                </div>
                
                <table className="supplier-products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Description</th>
                      <th>Current Stock</th>
                      <th>Min Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className={product.minStockLevel > 0 && product.currentStock <= product.minStockLevel ? 'low-stock' : ''}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.description || '-'}</td>
                        <td>{product.currentStock}</td>
                        <td>{product.minStockLevel || 0}</td>
                        <td>
                          <span className={`status ${product.minStockLevel > 0 && product.currentStock <= product.minStockLevel ? 'low' : 'ok'}`}>
                            {product.minStockLevel > 0 && product.currentStock <= product.minStockLevel ? 'LOW STOCK' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseReports;