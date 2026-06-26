import React, { useState, useEffect } from 'react';

function Account({ user, onLogout }) {
  const [activeSubTab, setActiveSubTab] = useState('orders'); // 'orders', 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const apiBaseUrl = 'https://aura-api-sn1e.onrender.com/api';

  const fetchOrders = async (showLoading = true) => {
    if (showLoading && orders.length === 0) {
      setLoadingOrders(true);
    }
    try {
      const res = await fetch(`${apiBaseUrl}/orders/user`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        }
      });
      if (res.status === 401) {
        setOrders([]);
        onLogout();
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user && activeSubTab === 'orders') {
      fetchOrders();
      // Poll orders status every 5 seconds
      const timer = setInterval(() => fetchOrders(false), 5000);
      return () => clearInterval(timer);
    }
  }, [user, activeSubTab]);

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      setCancellingOrderId(orderId);
      try {
        const res = await fetch(`${apiBaseUrl}/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('aura_token')}`
          },
          body: JSON.stringify({ reason: cancelReason || 'Cancelled by customer' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancellation failed');
        alert('Order cancelled successfully.');
        fetchOrders(false);
        setActiveTrackingOrderId(null);
      } catch (e) {
        alert(e.message);
      } finally {
        setCancellingOrderId(null);
        setCancelReason('');
      }
    }
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-amber-500 bg-amber-50';
      case 'Processing':
        return 'text-blue-500 bg-blue-50';
      case 'Shipped':
        return 'text-indigo-500 bg-indigo-50';
      case 'Delivered':
        return 'text-emerald-500 bg-emerald-50';
      case 'Cancelled':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const getStepStatus = (currentStatus, stepName) => {
    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentIdx = steps.indexOf(currentStatus);
    const stepIdx = steps.indexOf(stepName);
    if (currentStatus === 'Cancelled') return 'cancelled';
    if (currentIdx >= stepIdx) return 'completed';
    if (currentIdx === stepIdx - 1) return 'next';
    return 'pending';
  };

  const activeTrackingOrder = orders.find(o => o.orderId === activeTrackingOrderId);

  if (!user) return null;

  return (
    <div className="min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Profile Sidebar */}
          <div className="w-full md:w-64 space-y-2">
            <div className="glass-card p-6 rounded-3xl mb-6 bg-white/40 border border-white/60 text-center">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-black mb-4 mx-auto uppercase">
                {user.name[0]}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">{user.role || 'Customer'}</p>
            </div>
            
            <button 
              onClick={() => setActiveSubTab('orders')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeSubTab === 'orders' ? 'bg-black text-white' : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              📦 MY ORDERS
            </button>
            <button 
              onClick={() => setActiveSubTab('profile')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeSubTab === 'profile' ? 'bg-black text-white' : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              👤 ACCOUNT INFO
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-8"
            >
              🚪 LOGOUT
            </button>
          </div>

          {/* Tab Content Display Area */}
          <div className="flex-1 space-y-6">
            {activeSubTab === 'orders' && (
              <div className="animate-fade-in space-y-6">
                
                {/* 1. Track Order view detail */}
                {activeTrackingOrderId && activeTrackingOrder ? (
                  <div className="animate-fade-in space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <button 
                        onClick={() => setActiveTrackingOrderId(null)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-100 hover:border-black transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h1 className="text-2xl font-black tracking-tight text-gray-900">Order Tracking</h1>
                    </div>

                    <div className="glass-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden bg-white/40 border border-white/60">
                      <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8 mb-8 md:mb-10 relative z-10">
                        <div>
                          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">Order Number</p>
                          <h3 className="text-lg md:text-xl font-black text-gray-900 truncate">#{activeTrackingOrder.orderId}</h3>
                        </div>
                        <div className="md:text-right">
                          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">Current Status</p>
                          <span className={`text-xs md:text-sm px-4 py-1.5 rounded-full font-bold uppercase inline-block ${getStatusColorClass(activeTrackingOrder.status)}`}>
                            {activeTrackingOrder.status}
                          </span>
                        </div>
                      </div>

                      {/* Estimated date */}
                      {activeTrackingOrder.estimatedDelivery && activeTrackingOrder.status !== 'Delivered' && activeTrackingOrder.status !== 'Cancelled' && (
                        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                          <span className="text-xl">📅</span>
                          <div>
                            <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">Estimated Delivery</p>
                            <p className="text-sm font-bold text-emerald-900">
                              {new Date(activeTrackingOrder.estimatedDelivery).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cancelled notes */}
                      {activeTrackingOrder.status === 'Cancelled' && activeTrackingOrder.cancellationReason && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                          <span className="text-xl">✕</span>
                          <div>
                            <p className="text-[10px] font-black uppercase text-red-800 tracking-widest">Cancellation Reason</p>
                            <p className="text-sm font-bold text-red-900">{activeTrackingOrder.cancellationReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Timeline Track Progress */}
                      <div className="relative mt-8 md:mt-12 mb-8 px-0 md:px-4">
                        <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full hidden md:block" />
                        <div className="flex flex-col md:flex-row justify-between relative gap-10 md:gap-0">
                          {['Pending', 'Processing', 'Shipped', 'Delivered'].map((stepName, stepIdx) => {
                            const stepStatus = getStepStatus(activeTrackingOrder.status, stepName);
                            return (
                              <div key={stepName} className="flex md:flex-col items-center gap-4 md:gap-4 relative z-10">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all duration-500 ${
                                  stepStatus === 'completed' 
                                    ? 'bg-black text-white shadow-lg shadow-black/20' 
                                    : stepStatus === 'next' 
                                      ? 'bg-white border-2 border-black text-black' 
                                      : stepStatus === 'cancelled' 
                                        ? 'bg-red-50 text-red-500' 
                                        : 'bg-white border border-gray-100 text-gray-300'
                                }`}>
                                  {stepStatus === 'completed' ? '✓' : ['📝', '⚙️', '🚚', '📦'][stepIdx]}
                                </div>
                                <div className="text-left md:text-center">
                                  <p className={`text-[11px] font-black tracking-wider uppercase ${
                                    stepStatus === 'completed' || stepStatus === 'next' ? 'text-gray-900' : 'text-gray-300'
                                  }`}>
                                    {stepName}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Cancel action */}
                      {(activeTrackingOrder.status === 'Pending' || activeTrackingOrder.status === 'Processing') && (
                        <div className="mt-12 pt-8 border-t border-gray-100 space-y-4">
                          <input 
                            type="text" 
                            placeholder="Reason for cancellation (optional)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-black focus:outline-none"
                          />
                          <button
                            onClick={() => handleCancelOrder(activeTrackingOrder.orderId)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-xs tracking-widest uppercase"
                          >
                            {cancellingOrderId ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // 2. Orders list view
                  <div className="space-y-4">
                    <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
                    
                    {loadingOrders ? (
                      <p className="text-sm text-gray-500 font-light">Loading orders...</p>
                    ) : orders.length === 0 ? (
                      <div className="p-12 text-center glass-panel rounded-3xl bg-white/40 border border-white/60">
                        <p className="text-gray-500 text-sm">You haven&apos;t placed any orders yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((o) => (
                          <div 
                            key={o.orderId}
                            onClick={() => setActiveTrackingOrderId(o.orderId)}
                            className="glass-panel p-6 rounded-3xl flex justify-between items-center hover:border-black cursor-pointer bg-white/40 border border-white/60 transition-all"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900">Order #{o.orderId}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${getStatusColorClass(o.status)}`}>
                                {o.status}
                              </span>
                              <p className="text-xs text-gray-400 mt-2">Click to track &rarr;</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'profile' && (
              <div className="animate-fade-in space-y-6">
                <h1 className="text-2xl font-black text-gray-900 font-sans">Account Information</h1>
                <div className="glass-panel p-8 rounded-3xl bg-white/40 border border-white/60 space-y-4 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500">Name</span>
                    <span className="font-bold text-gray-900">{user.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500">Email Address</span>
                    <span className="font-bold text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Member Since</span>
                    <span className="font-bold text-gray-900">2026</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Account;
