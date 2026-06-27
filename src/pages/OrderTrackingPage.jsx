import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function OrderTrackingPage({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Dynamically inject Line Awesome CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css';
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(link);
      } catch (err) {
        // ignore if already removed
      }
    };
  }, []);

  useEffect(() => {
    const fetchOrderTracking = async () => {
      if (!orderId) {
        setError('No Tracking ID provided in the URL.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/orders/public/track/${orderId}`);
        if (!res.ok) {
          throw new Error('Order not found or invalid Tracking ID.');
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch order details.');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderTracking();
  }, [orderId]);

  // Determine courier brand icon / badge
  const getCourierLogo = (courierName) => {
    const name = (courierName || '').trim();
    const nameLower = name.toLowerCase();

    // Map names to URLs
    let logoUrl = '';
    if (nameLower.includes('domex')) {
      logoUrl = '/domex-logo.png';
    } else if (nameLower.includes('koombiyo')) {
      logoUrl = '/koombiyo-logo.png';
    } else if (nameLower.includes('sri lanka post')) {
      logoUrl = '/sri-lanka-post-logo.png';
    } else if (nameLower.includes('aramex')) {
      logoUrl = '/aramex-logo.png';
    } else if (nameLower.includes('citypak')) {
      logoUrl = '/citypak-logo.png';
    } else if (nameLower.includes('pronto') || nameLower.includes('prompt')) {
      logoUrl = 'https://th.bing.com/th/id/OIP.U13AT8WXkPdZRaq4MD_ofwHaHa?w=176&h=180&c=7&r=0&o=7&pid=1.7&rm=3';
    } else if (nameLower.includes('dhl')) {
      logoUrl = 'https://th.bing.com/th?q=DHL+Logo+Icon+PNG&w=120&h=120&c=1&rs=1&qlt=70&r=0&o=7&cb=1&pid=InlineBlock&rm=3&mkt=en-SG&cc=SG&setlang=en&adlt=strict&t=1&mw=247';
    } else if (nameLower.includes('fedex')) {
      logoUrl = 'https://th.bing.com/th/id/OIP.vuc88Kmi3r_f8yGuQPHVGgHaHa?w=169&h=180&c=7&r=0&o=7&pid=1.7&rm=3';
    }

    // Determine colors and initials for the fallback badge
    let fallbackBg = 'bg-black';
    let fallbackText = 'text-white';
    let initials = 'CO';
    let displayName = courierName || 'Courier';

    if (nameLower.includes('domex')) {
      fallbackBg = 'bg-orange-500';
      initials = 'DX';
      displayName = courierName || 'Domex Express';
    } else if (nameLower.includes('koombiyo')) {
      fallbackBg = 'bg-amber-400';
      fallbackText = 'text-neutral-900';
      initials = 'KB';
      displayName = courierName || 'Koombiyo Delivery';
    } else if (nameLower.includes('sri lanka post')) {
      fallbackBg = 'bg-red-600';
      initials = 'SL';
      displayName = 'Sri Lanka Post';
    } else if (nameLower.includes('aramex')) {
      fallbackBg = 'bg-red-500';
      initials = 'AX';
      displayName = 'Aramex';
    } else if (nameLower.includes('citypak')) {
      fallbackBg = 'bg-red-700';
      initials = 'CP';
      displayName = 'Citypak';
    } else if (nameLower.includes('pronto') || nameLower.includes('prompt')) {
      fallbackBg = 'bg-red-500';
      initials = 'PR';
      displayName = courierName || 'Pronto Lanka';
    } else if (nameLower.includes('fardar')) {
      fallbackBg = 'bg-blue-600';
      initials = 'FD';
      displayName = 'Fardar Express';
    }

    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-contain rounded-2xl bg-white p-1.5 border border-slate-100 shadow-sm z-10"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className={`w-full h-full rounded-2xl ${fallbackBg} ${fallbackText} flex items-center justify-center font-black text-lg tracking-wider shadow-sm`}>
            {initials}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Courier Partner</div>
          <div className="text-sm font-extrabold text-slate-800">{displayName}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col font-sans antialiased selection:bg-slate-200 selection:text-black">
      
      {/* Sleek Minimal Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white shadow-sm">
              <i className="las la-shipping-fast text-lg"></i>
            </div>
            <span className="font-black text-sm tracking-widest uppercase text-slate-800">
              WhatsRay Delivery
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full">
            Live Tracking
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-10">
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-black/10 border-t-black animate-spin"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading consignment details...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-white border border-red-100 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-2xl mb-4">
              <i className="las la-exclamation-circle"></i>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Tracking ID Not Found</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              We couldn't locate any package associated with the ID in your URL. Please check the link and try again.
            </p>
          </div>
        )}

        {order && !loading && (
          <div className="space-y-6">
            
            {/* Top Order Card */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              {getCourierLogo(order.courier_name)}
              
              <div className="flex flex-col md:items-end gap-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking Reference</div>
                <div className="text-sm font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {order.tracking_number || 'Pending'}
                </div>
              </div>
            </div>

            {/* Tracking Status Timeline */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Delivery Milestone</h3>
              
              <div className="relative">
                {/* Connector line for large screens */}
                <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100 rounded-full -z-10 hidden sm:block"></div>
                <div 
                  className="absolute top-5 left-10 h-0.5 bg-black rounded-full -z-10 hidden sm:block transition-all duration-500"
                  style={{
                    width: order.tracking_status === 'Delivered' 
                      ? '100%' 
                      : order.tracking_status === 'Dispatched' || order.status === 'Dispatched'
                        ? '50%' 
                        : '0%'
                  }}
                ></div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-4 relative">
                  
                  {/* Step 1: Placed */}
                  <div className="flex sm:flex-col items-center gap-4 sm:gap-2.5 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg shadow-black/20 border-4 border-white shrink-0">
                      <i className="las la-check"></i>
                    </div>
                    <div className="sm:text-center text-left">
                      <h5 className="font-extrabold text-xs text-slate-800">Order Placed</h5>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Order Confirmed</p>
                    </div>
                  </div>

                  {/* Step 2: Dispatched */}
                  <div className="flex sm:flex-col items-center gap-4 sm:gap-2.5 w-full sm:w-auto">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shrink-0 transition-all ${
                      order.tracking_status === 'Dispatched' || order.tracking_status === 'Delivered' || order.status === 'Dispatched'
                        ? 'bg-black text-white shadow-lg shadow-black/20'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <i className="las la-truck"></i>
                    </div>
                    <div className="sm:text-center text-left">
                      <h5 className={`font-extrabold text-xs ${
                        order.tracking_status === 'Dispatched' || order.tracking_status === 'Delivered' || order.status === 'Dispatched'
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}>Dispatched</h5>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">In Transit</p>
                    </div>
                  </div>

                  {/* Step 3: Delivered */}
                  <div className="flex sm:flex-col items-center gap-4 sm:gap-2.5 w-full sm:w-auto">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shrink-0 transition-all ${
                      order.tracking_status === 'Delivered'
                        ? 'bg-black text-white shadow-lg shadow-black/20'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <i className="las la-box"></i>
                    </div>
                    <div className="sm:text-center text-left">
                      <h5 className={`font-extrabold text-xs ${
                        order.tracking_status === 'Delivered' ? 'text-slate-800' : 'text-slate-400'
                      }`}>Delivered</h5>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Parcel Received</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left Activity Logs (3 columns) */}
              <div className="md:col-span-3 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Activity Logs</h3>
                
                <div className="relative border-l-2 border-slate-100 pl-6 ml-2 space-y-6">
                  {order.tracking_history && order.tracking_history.map((log, idx) => (
                    <div key={idx} className="relative">
                      {/* Pulsing indicator for active log, else solid gray */}
                      <div className={`absolute -left-[32px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                        idx === order.tracking_history.length - 1 ? 'bg-black ring-4 ring-black/10' : 'bg-slate-300'
                      }`}></div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-extrabold text-slate-800">{log.status}</span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {log.timestamp ? new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.details}</p>
                      {log.location && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <i className="las la-map-marker text-slate-400"></i> {log.location}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!order.tracking_history || order.tracking_history.length === 0) && (
                    <div className="relative">
                      <div className="absolute -left-[32px] top-1.5 w-3 h-3 rounded-full bg-black border-2 border-white shadow-sm"></div>
                      <span className="text-xs font-extrabold text-slate-800">Order Confirmed</span>
                      <p className="text-xs text-slate-500 mt-1">Package is being registered and sorted for courier collection.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Order Details (2 columns) */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Recipient Details */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Destination</h3>
                  
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recipient</div>
                      <div className="text-slate-800 font-extrabold mt-0.5">{order.shipping_details?.name || 'Customer'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact Phone</div>
                      <div className="text-slate-800 font-bold mt-0.5">{order.shipping_details?.phone}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Delivery Address</div>
                      <div className="text-slate-500 mt-0.5 leading-relaxed">{order.shipping_details?.address}</div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Package Summary</h3>
                  
                  <div className="space-y-3.5 divide-y divide-slate-100">
                    {order.items && order.items.map((item, idx) => (
                      <div key={idx} className={`flex justify-between items-start gap-4 text-xs ${idx > 0 ? 'pt-3.5' : ''}`}>
                        <div>
                          <div className="font-extrabold text-slate-800">{item.name || item.product || 'Product Name'}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Quantity: x{item.qty || item.quantity || 1}</div>
                        </div>
                        <div className="font-bold text-slate-700 font-mono">
                          Rs. {parseFloat(item.price || order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-3.5 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-800">Total Value</span>
                      <span className="text-emerald-600 font-extrabold text-sm font-mono">
                        Rs. {parseFloat(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-bold tracking-wider uppercase">
          <p>© {new Date().getFullYear()} WhatsRay CRM. All rights reserved.</p>
          <p>Order Fulfillment System</p>
        </div>
      </footer>

    </div>
  );
}
