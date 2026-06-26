import React, { useState, useEffect } from 'react';

function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeItem, onCheckout, onRequireLogin, user }) {
  const [step, setStep] = useState('cart'); // 'cart', 'shipping', 'payment', 'success'
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    smsOptIn: false
  });
  const [errors, setErrors] = useState({});
  const [orderNumber, setOrderNumber] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Sync user details to shipping details form
  useEffect(() => {
    if (isOpen) {
      setShippingDetails(prev => ({
        ...prev,
        fullName: user?.name || '',
        email: user?.email || '',
        address: user?.address || prev.address || '',
        city: user?.city || prev.city || '',
        postalCode: user?.postalCode || prev.postalCode || '',
        phone: user?.phone || prev.phone || '',
        smsOptIn: prev.smsOptIn
      }));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('LKR', 'Rs.');
  };

  const handleClose = () => {
    onClose();
    setErrors({});
    setOrderNumber('');
    setShippingDetails({
      fullName: user?.name || '',
      email: user?.email || '',
      address: user?.address || '',
      city: user?.city || '',
      postalCode: user?.postalCode || '',
      phone: user?.phone || '',
      smsOptIn: false
    });
    setTimeout(() => setStep('cart'), 300);
  };

  const validateForm = () => {
    const err = {};
    if (!shippingDetails.fullName.trim()) err.fullName = 'Required';
    if (!shippingDetails.email.trim()) {
      err.email = 'Required';
    } else if (!/\S+@\S+\.\S+/.test(shippingDetails.email)) {
      err.email = 'Invalid email';
    }
    if (!shippingDetails.address.trim()) err.address = 'Required';
    if (!shippingDetails.city.trim()) err.city = 'Required';
    if (!shippingDetails.postalCode.trim()) err.postalCode = 'Required';
    if (!shippingDetails.phone.trim()) err.phone = 'Required';
    
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setShippingDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleOrderSubmission = () => {
    setSubmittingOrder(true);
    // Simulate order placement API call
    setTimeout(() => {
      const generatedOrderNo = Math.floor(100000 + Math.random() * 900000).toString();
      setOrderNumber(generatedOrderNo);
      setSubmittingOrder(false);
      setStep('success');
      onCheckout(shippingDetails, generatedOrderNo);
    }, 1500);
  };

  const renderContent = () => {
    switch (step) {
      case 'success':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center text-4xl mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Order Confirmed!</h3>
            <p className="text-gray-500 mb-2 font-light">Thank you for your purchase.</p>
            
            <div className="glass-panel px-6 py-3 rounded-xl mb-6 bg-gray-50/50 border border-gray-100">
              <span className="text-xs font-semibold text-gray-400">Order Number</span>
              <p className="text-lg font-mono font-bold text-gray-800">#{orderNumber}</p>
            </div>
            
            <button 
              onClick={handleClose} 
              className="glass-dark mt-4 px-8 py-3 rounded-full text-xs font-bold tracking-widest bg-black text-white hover:bg-neutral-800 w-full uppercase"
            >
              Continue Shopping
            </button>
          </div>
        );

      case 'shipping':
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-gray-800 mb-4">Shipping Details</h3>
            
            {/* Full Name */}
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={shippingDetails.fullName}
                onChange={e => handleFieldChange('fullName', e.target.value)}
                className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                  errors.fullName ? 'ring-2 ring-red-400 border-transparent' : ''
                }`}
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.fullName}</p>}
            </div>

            {/* Email Address */}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={shippingDetails.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                  errors.email ? 'ring-2 ring-red-400 border-transparent' : ''
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.email}</p>}
            </div>

            {/* Address */}
            <div>
              <input
                type="text"
                placeholder="Address"
                value={shippingDetails.address}
                onChange={e => handleFieldChange('address', e.target.value)}
                className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                  errors.address ? 'ring-2 ring-red-400 border-transparent' : ''
                }`}
              />
              {errors.address && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.address}</p>}
            </div>

            {/* City & Zip */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <input
                  type="text"
                  placeholder="City"
                  value={shippingDetails.city}
                  onChange={e => handleFieldChange('city', e.target.value)}
                  className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                    errors.city ? 'ring-2 ring-red-400 border-transparent' : ''
                  }`}
                />
                {errors.city && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.city}</p>}
              </div>
              <div className="w-1/2">
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={shippingDetails.postalCode}
                  onChange={e => handleFieldChange('postalCode', e.target.value)}
                  className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                    errors.postalCode ? 'ring-2 ring-red-400 border-transparent' : ''
                  }`}
                />
                {errors.postalCode && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.postalCode}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={shippingDetails.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                className={`w-full glass-panel px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/20 focus:bg-white transition-all border border-gray-100 ${
                  errors.phone ? 'ring-2 ring-red-400 border-transparent' : ''
                }`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.phone}</p>}
            </div>

            {/* SMS OPT IN */}
            <div 
              className="flex items-start gap-3 mt-2 glass-panel p-4 rounded-xl border border-white/20 hover:border-black/10 transition-colors cursor-pointer"
              onClick={() => handleFieldChange('smsOptIn', !shippingDetails.smsOptIn)}
            >
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                shippingDetails.smsOptIn ? 'bg-black border-black text-white' : 'bg-white border-gray-300'
              }`}>
                {shippingDetails.smsOptIn && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">Sign up for SMS Alerts</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-light">
                  Receive exclusive restock alerts, flash sales, and birthday offers straight to your phone. Unsubscribe anytime.
                </p>
              </div>
            </div>

          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-gray-800 mb-2">Select Payment Method</h3>
            <p className="text-xs text-gray-500 font-light leading-relaxed">
              We securely process card payments offline or provide Cash on Delivery for island-wide purchases.
            </p>
            
            <div className="space-y-4">
              <div className="glass-panel p-6 rounded-2xl border border-black flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Cash on Delivery</h4>
                  <p className="text-xs text-gray-500 font-light mt-1">Pay with physical cash at your doorstep.</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'cart':
      default:
        return (
          <div className="space-y-6">
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-4 glass-panel p-3 rounded-2xl relative group bg-white/40 border border-white/60 shadow-xs">
                
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={item.product.image} 
                    className="w-full h-full object-cover" 
                    alt={item.product.name} 
                    loading="lazy" 
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between">
                      <h4 className="font-semibold text-sm text-gray-800 line-clamp-1 pr-6">{item.product.name}</h4>
                      <button 
                        onClick={() => removeItem(item.product.id, item.selectedSize, item.selectedColor)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 capitalize font-medium">{item.selectedColor} | Size: {item.selectedSize}</p>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-semibold">{formatPrice(item.product.price)}</span>
                    <div className="flex items-center gap-3 bg-white/50 px-2 py-1 rounded-lg border border-white/40">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity - 1)} 
                        className="w-5 h-5 flex items-center justify-center font-bold text-gray-600 hover:text-black"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity + 1)} 
                        className="w-5 h-5 flex items-center justify-center font-bold text-gray-600 hover:text-black"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs transition-opacity" onClick={handleClose}></div>
      
      {/* Slide body */}
      <div className="glass-card w-full max-w-md h-full relative z-10 flex flex-col border-l border-white/40 bg-white/80 backdrop-blur-md shadow-2xl animate-slide-up">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/20 flex justify-between items-center backdrop-blur-md bg-white/40">
          <h2 className="text-xl font-bold tracking-tight text-neutral-800">
            {step === 'cart' ? 'YOUR CART' : step === 'success' ? 'ORDER COMPLETE' : 'CHECKOUT'}
          </h2>
          <button 
            onClick={handleClose} 
            className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 && step !== 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="mb-4 font-medium">Your cart is empty.</p>
              <button 
                onClick={handleClose} 
                className="glass-panel px-6 py-2 rounded-full text-sm font-bold text-gray-800 border border-gray-200"
              >
                BROWSE PRODUCTS
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Totals panel & Actions footer */}
        {cart.length > 0 && step !== 'success' && (
          <div className="p-6 bg-white/40 backdrop-blur-md border-t border-white/20">
            <div className="flex justify-between mb-2 text-gray-600 text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between mb-4 text-sm text-gray-500 font-semibold">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between mb-6 text-gray-900 font-black text-lg">
              <span>Total</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
            
            <button 
              disabled={submittingOrder}
              onClick={() => {
                if (step === 'cart') {
                  if (!user) {
                    onClose();
                    onRequireLogin('login');
                    return;
                  }
                  setStep('shipping');
                } else if (step === 'shipping') {
                  if (validateForm()) {
                    setStep('payment');
                  }
                } else if (step === 'payment') {
                  handleOrderSubmission();
                }
              }}
              className="w-full bg-black text-white py-4 rounded-full text-sm font-bold tracking-widest hover:bg-black/90 hover:scale-[1.02] transition-all flex justify-center px-8 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              <span>
                {submittingOrder 
                  ? 'Processing...' 
                  : step === 'cart' 
                    ? 'PROCEED TO CHECKOUT' 
                    : step === 'shipping' 
                      ? 'CONTINUE TO PAYMENT' 
                      : 'PLACE ORDER'}
              </span>
            </button>

            {step !== 'cart' && (
              <button 
                onClick={() => setStep(step === 'payment' ? 'shipping' : 'cart')} 
                className="w-full mt-3 py-2 text-xs font-bold text-gray-500 hover:text-black tracking-widest uppercase"
              >
                Back
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default CartDrawer;
