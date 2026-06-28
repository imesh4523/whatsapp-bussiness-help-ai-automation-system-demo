import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function ManageInventory({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Image Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    sizes: '',
    colors: '',
    stock_quantity: 10
  });

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (existingImages.length + selectedFiles.length + files.length > 3) {
      if (window.notify) window.notify('error', 'Maximum 3 images allowed per product.');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/crm/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: 'General',
      sizes: 'S, M, L, XL',
      colors: 'Black, White, Blue',
      stock_quantity: 10
    });
    setExistingImages([]);
    setSelectedFiles([]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      price: p.price,
      description: p.description || '',
      category: p.category || 'General',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : '',
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : '',
      stock_quantity: p.stock_quantity ?? 10
    });
    setExistingImages(p.image_url ? p.image_url.split(',').filter(Boolean) : []);
    setSelectedFiles([]);
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stock_quantity' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', parseFloat(formData.price) || 0);
      data.append('description', formData.description || '');
      data.append('category', formData.category || 'General');
      data.append('stock_quantity', parseInt(formData.stock_quantity) ?? 10);
      
      const sizesArray = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      const colorsArray = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      data.append('sizes', JSON.stringify(sizesArray));
      data.append('colors', JSON.stringify(colorsArray));

      selectedFiles.forEach(file => {
        data.append('images', file);
      });

      const res = await fetch(`${API_BASE_URL}/crm/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: data
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchProducts();
        if (window.notify) window.notify('success', 'Product added successfully.');
      } else {
        if (window.notify) window.notify('error', 'Failed to add product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', parseFloat(formData.price) || 0);
      data.append('description', formData.description || '');
      data.append('category', formData.category || 'General');
      data.append('stock_quantity', parseInt(formData.stock_quantity) ?? 10);
      
      const sizesArray = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      const colorsArray = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      data.append('sizes', JSON.stringify(sizesArray));
      data.append('colors', JSON.stringify(colorsArray));
      data.append('existing_images', JSON.stringify(existingImages));

      selectedFiles.forEach(file => {
        data.append('images', file);
      });

      const res = await fetch(`${API_BASE_URL}/crm/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: data
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchProducts();
        if (window.notify) window.notify('success', 'Product updated successfully.');
      } else {
        if (window.notify) window.notify('error', 'Failed to update product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/crm/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.ok) {
        fetchProducts();
        if (window.notify) window.notify('success', 'Product deleted successfully.');
      } else {
        if (window.notify) window.notify('error', 'Failed to delete product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalStock = products.reduce((acc, curr) => acc + (curr.stock_quantity || 0), 0);
  const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Inventory Catalog</h2>
          <p className="text-sm text-gray-500">Monitor product stock levels, categories, sizes, and pricing in real-time.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn btn--primary px-4 py-2 dash-v2-cta-btn flex items-center gap-2 border-none active:scale-[0.98] rounded-xl font-bold text-xs cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Product
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Unique Products</span>
          <span className="text-2xl font-extrabold text-neutral-800 mt-1">{products.length}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Items in Stock</span>
          <span className="text-2xl font-extrabold text-[#00832e] mt-1">{totalStock}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-gray-100/50 flex flex-col bg-white/40 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">Out of Stock Items</span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1">{outOfStock}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-gray-100/80 shadow-xs">
        <div className="relative flex-1">
          <i className="las la-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '16px' }}></i>
          <input
            type="text"
            placeholder="Search by product name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs outline-none bg-neutral-50/50 focus:bg-white focus:ring-1 focus:ring-[#00832e]/20 border border-gray-200/80 rounded-xl transition-all font-medium text-neutral-700"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="glass-panel rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white/40 backdrop-blur-md">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#00832e] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-500">Loading catalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center bg-white/20">
            <img src="https://wpp.raybeamdigital.com/assets/images/no-data.gif" className="empty-message mx-auto" alt="No data" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
            <span className="d-block mt-2 font-bold text-neutral-700 text-sm">No products found</span>
            <span className="d-block fs-13 text-muted text-xs mt-1">Try another search term or click "Add Product" to get started.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 w-[80px]">Photo</th>
                  <th className="p-4">Product Info</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Sizes & Colors</th>
                  <th className="p-4 text-center">Stock Level</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white/30">
                {filtered.map(p => {
                  const stock = p.stock_quantity ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4">
                        <img
                          src={p.image_url ? (p.image_url.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${p.image_url.split(',')[0]}` : p.image_url.split(',')[0]) : 'https://wpp.raybeamdigital.com/assets/images/default-product.jpg'}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-xl border border-gray-100 shadow-xs"
                          onError={(e) => {
                            e.target.src = 'https://wpp.raybeamdigital.com/assets/images/default-product.jpg';
                          }}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-neutral-800 text-sm">{p.name}</div>
                        <div className="text-gray-400 mt-0.5 line-clamp-1 max-w-[250px]" title={p.description}>{p.description || 'No description provided.'}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md font-bold text-[10px]">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-neutral-800 text-sm">
                        Rs. {parseFloat(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 max-w-[220px]">
                        <div className="flex flex-col gap-1.5">
                          {p.sizes && p.sizes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] font-bold text-gray-400">Sizes:</span>
                              {p.sizes.map((s, idx) => (
                                <span key={idx} className="text-[9px] bg-slate-50 border border-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">{s}</span>
                              ))}
                            </div>
                          )}
                          {p.colors && p.colors.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] font-bold text-gray-400">Colors:</span>
                              {p.colors.map((c, idx) => (
                                <span key={idx} className="text-[9px] bg-emerald-50/50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {stock === 0 ? (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-[10px] font-bold">
                            Out of Stock
                          </span>
                        ) : stock <= 5 ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-bold">
                            Low Stock ({stock})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-[#00832e] border border-emerald-100 rounded-full text-[10px] font-bold">
                            In Stock ({stock})
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-neutral-50 hover:bg-neutral-100 border border-gray-200 rounded-lg text-neutral-600 cursor-pointer transition-colors"
                            title="Edit Product"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer transition-colors"
                            title="Delete Product"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Add / Edit Modals */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-slide-up my-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-neutral-50/50">
              <h3 className="font-bold text-neutral-800 text-base">
                {showAddModal ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="w-7 h-7 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 cursor-pointer transition-colors border-none"
              >
                <i className="las la-times" style={{ fontSize: '14px' }}></i>
              </button>
            </div>
            
            <form onSubmit={showAddModal ? handleAddProduct : handleEditProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Product Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                  placeholder="e.g. Aura Classic T-Shirt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Price (Rs.)</label>
                  <input
                    type="number"
                    name="price"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                    placeholder="e.g. 1500.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Stock Quantity</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    required
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                  placeholder="e.g. Clothing"
                />
              </div>

              {/* Product Images Direct Upload Section */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 block">Product Images (Max 3)</label>
                
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Previews of Existing Saved Images */}
                  {existingImages.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs group bg-neutral-50">
                      <img 
                        src={url.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${url}` : url} 
                        className="w-full h-full object-cover" 
                        alt="Product visual" 
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center cursor-pointer border-none shadow-sm transition-colors text-xs font-bold"
                        title="Remove image"
                      >
                        &times;
                      </button>
                    </div>
                  ))}

                  {/* Previews of Newly Selected Upload Files */}
                  {selectedFiles.map((file, idx) => {
                    const tempUrl = URL.createObjectURL(file);
                    return (
                      <div key={`new-${idx}`} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs group bg-neutral-50">
                        <img 
                          src={tempUrl} 
                          className="w-full h-full object-cover" 
                          alt="Selected upload" 
                        />
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center cursor-pointer border-none shadow-sm transition-colors text-xs font-bold"
                          title="Remove image"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}

                  {/* Direct Upload Trigger Card */}
                  {existingImages.length + selectedFiles.length < 3 && (
                    <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#00832e]/50 hover:bg-emerald-50/10 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-wide">Add</span>
                      <input 
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">Upload up to 3 image files from your computer. The first image will be shown as the primary photo.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Sizes (Comma Separated)</label>
                  <input
                    type="text"
                    name="sizes"
                    value={formData.sizes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                    placeholder="e.g. S, M, L, XL"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Colors (Comma Separated)</label>
                  <input
                    type="text"
                    name="colors"
                    value={formData.colors}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl font-medium text-neutral-700"
                    placeholder="e.g. Red, Black, White"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-xs outline-none bg-neutral-50/80 focus:bg-white focus:ring-2 focus:ring-black/10 border border-gray-200 rounded-xl resize-none font-medium text-neutral-700"
                  placeholder="Describe your product specs, materials or usage..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-neutral-600 hover:bg-neutral-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary px-5 py-2 dash-v2-cta-btn border-none active:scale-[0.98] rounded-xl font-bold text-xs"
                >
                  {showAddModal ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
