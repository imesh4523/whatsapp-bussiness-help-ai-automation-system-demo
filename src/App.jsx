import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Collections from './pages/Collections';
import About from './pages/About';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import CookieBanner from './components/CookieBanner';
import Auth from './pages/Auth';
import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import OrderTrackingPage from './pages/OrderTrackingPage';
import { mockProducts } from './data/mockProducts';
import { API_BASE_URL } from './config';


const isDashboardRoute = (path) => {
  return path.startsWith('/user') || path.startsWith('/help') || path.startsWith('/ticket') || path.startsWith('/user-guide');
};

const isAdminRoute = (path) => {
  return path === '/main-admin' || path.startsWith('/main-admin/');
};

const isTrackOrderRoute = (path) => {
  return path.startsWith('/track-order') || path.startsWith('/trackmyorder');
};

function App() {
  const [view, setView] = useState('home');
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, type: 'login' });
  const [products, setProducts] = useState(mockProducts);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);

  const handleAdminLogin = (adminDetails) => {
    setAdmin(adminDetails);
    localStorage.setItem('agentbunny_admin', JSON.stringify(adminDetails));
    setView('admin');
    window.history.pushState(null, '', '/main-admin');
  };

  const handleAdminLogout = () => {
    setAdmin(null);
    localStorage.removeItem('agentbunny_admin');
    setView('home');
    window.history.pushState(null, '', '/');
  };

  // Fetch products from backend or fallback to mock products
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setProducts(data);
          }
        }
      } catch (e) {
        console.warn('Using fallback mock products because Render backend is offline:', e.message);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Sync user and route path from URL on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    const savedAdmin = localStorage.getItem('agentbunny_admin');
    const path = window.location.pathname;

    if (isTrackOrderRoute(path)) {
      setView('track-order');
    } else if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
      setView('admin');
      if (!isAdminRoute(path)) {
        window.history.replaceState(null, '', '/main-admin');
      }
    } else if (isAdminRoute(path)) {
      setView('admin');
    } else if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setView('dashboard');
      if (!isDashboardRoute(path)) {
        window.history.replaceState(null, '', '/user/dashboard');
      }
      // Fetch fresh profile in the background on app load
      const token = localStorage.getItem('aura_token');
      if (token) {
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => {
            if (res.ok) return res.json();
          })
          .then(updatedUser => {
            if (updatedUser) {
              setUser(updatedUser);
              localStorage.setItem('aura_user', JSON.stringify(updatedUser));
            }
          })
          .catch(e => console.warn('Failed to refresh user profile on app mount:', e.message));
      }
    } else {
      if (isDashboardRoute(path)) {
        window.history.replaceState(null, '', '/');
        setView('home');
        setAuthModal({ isOpen: true, type: 'login' });
      } else {
        if (path === '/collections') setView('collections');
        else if (path === '/about') setView('about');
        else if (path === '/account') setView('account');
        else setView('home');
      }
    }
  }, []);

  // Listen to browser Back/Forward navigation popstate events
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const savedUser = localStorage.getItem('aura_user');
      const savedAdmin = localStorage.getItem('agentbunny_admin');

      if (isTrackOrderRoute(path)) {
        setView('track-order');
      } else if (savedAdmin || isAdminRoute(path)) {
        setView('admin');
        if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
      } else if (savedUser) {
        setView('dashboard');
      } else {
        if (isDashboardRoute(path)) {
          window.history.replaceState(null, '', '/');
          setView('home');
          setAuthModal({ isOpen: true, type: 'login' });
        } else {
          if (path === '/collections') setView('collections');
          else if (path === '/about') setView('about');
          else if (path === '/account') setView('account');
          else setView('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const addToCart = (product, quantity, size, color) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      } else {
        return [...prevCart, { product, quantity, selectedSize: size, selectedColor: color }];
      }
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (productId, size, color, newQty) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        item => item.product.id === productId && item.selectedSize === size && item.selectedColor === color
      );
      if (existingIdx === -1) return prevCart;

      const newCart = [...prevCart];
      if (newQty <= 0) {
        newCart.splice(existingIdx, 1);
      } else {
        newCart[existingIdx].quantity = newQty;
      }
      return newCart;
    });
  };

  const removeItemFromCart = (productId, size, color) => {
    setCart((prevCart) => 
      prevCart.filter(
        item => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleLogin = (userDetails, token) => {
    setUser(userDetails);
    localStorage.setItem('aura_user', JSON.stringify(userDetails));
    if (token) {
      localStorage.setItem('aura_token', token);
    } else {
      localStorage.setItem('aura_token', 'mock_token_' + Math.random().toString());
    }
    setAuthModal({ isOpen: false, type: 'login' });
    setView('dashboard');
    window.history.pushState(null, '', '/user/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    setView('home');
    window.history.pushState(null, '', '/');
  };

  const navigate = (newView) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    let path = '/';
    if (newView === 'collections') path = '/collections';
    else if (newView === 'about') path = '/about';
    else if (newView === 'account') path = '/account';
    window.history.pushState(null, '', path);
  };

  const handleCreateOrder = async (shippingDetails, orderNo) => {
    try {
      const orderPayload = {
        orderId: orderNo,
        items: cart.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor
        })),
        shippingDetails,
        totalAmount: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        status: 'Pending'
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify(orderPayload)
      });
      
      if (res.ok) {
        console.log('Order created successfully in backend.');
      }
    } catch (e) {
      console.warn('Order sync failed: using local success fallback');
    }
    clearCart();
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <Home 
            products={products} 
            loading={loading}
            onProductClick={setSelectedProduct} 
            onNavigate={navigate}
          />
        );
      case 'collections':
      case 'new-arrivals':
        return (
          <Collections 
            products={products} 
            loading={loading}
            filter={view === 'new-arrivals' ? 'new-arrivals' : 'all'} 
            onProductClick={setSelectedProduct} 
          />
        );
      case 'about':
        return <About />;
      case 'account':
        return <Account user={user} onLogout={handleLogout} />;
      default:
        return (
          <Home 
            products={products} 
            loading={loading}
            onProductClick={setSelectedProduct} 
            onNavigate={navigate}
          />
        );
    }
  };

  if (view === 'track-order') {
    const parts = window.location.pathname.split('/');
    const lastPart = parts.pop() || parts.pop();
    const orderId = (lastPart === 'track-order' || lastPart === 'trackmyorder') ? '' : lastPart;
    return <OrderTrackingPage orderId={orderId} />;
  }

  if (view === 'admin') {
    if (admin) {
      return <AdminDashboard admin={admin} onLogout={handleAdminLogout} />;
    } else {
      return <AdminAuth onSuccess={handleAdminLogin} />;
    }
  }

  if ((view === 'dashboard' || view === 'account') && user) {
    return <Dashboard user={user} setUser={setUser} onLogout={handleLogout} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f6f8] text-[#111111]">
      <Header 
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(type) => setAuthModal({ isOpen: true, type })}
        currentView={view}
        onNavigate={navigate}
      />
      
      <main className="flex-grow pt-8">
        {renderView()}
      </main>

      <Footer onNavigate={navigate} />

      {/* Slide-out Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={updateCartQuantity}
        removeItem={removeItemFromCart}
        onCheckout={handleCreateOrder}
        onRequireLogin={(type) => setAuthModal({ isOpen: true, type })}
        user={user}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Authentication Modal */}
      {authModal.isOpen && (
        <Auth 
          type={authModal.type}
          onClose={() => setAuthModal({ isOpen: false, type: 'login' })}
          onSwitchType={(type) => setAuthModal({ isOpen: true, type })}
          onSuccess={handleLogin}
        />
      )}

      <CookieBanner />
    </div>
  );
}

export default App;
