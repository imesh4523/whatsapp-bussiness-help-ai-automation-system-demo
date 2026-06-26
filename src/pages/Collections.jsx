import React, { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';

function Collections({ products, loading, filter, onProductClick }) {
  const [activeCategory, setActiveCategory] = useState(filter === 'new-arrivals' ? 'new-arrivals' : 'all');
  const [priceRange, setPriceRange] = useState('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const categories = [
    'all',
    'Outerwear',
    'Dresses',
    'Tailoring',
    'Basics',
    'Bottoms',
    'Accessories',
    'new-arrivals'
  ];

  // Memoized filter results
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (activeCategory === 'new-arrivals') {
      result = result.filter(p => p.isNew || p.isNewArrival);
    } else if (activeCategory !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Price range filter
    if (priceRange === 'under10k') {
      result = result.filter(p => p.price < 10000);
    } else if (priceRange === '10k-20k') {
      result = result.filter(p => p.price >= 10000 && p.price <= 20000);
    } else if (priceRange === 'over20k') {
      result = result.filter(p => p.price > 20000);
    }

    return result;
  }, [products, activeCategory, priceRange]);

  const clearAllFilters = () => {
    setActiveCategory('all');
    setPriceRange('all');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('LKR', 'Rs.');
  };

  return (
    <div className="animate-fade-in relative z-10 w-full pt-28 md:pt-32 pb-24 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* 1. Category Header Banner */}
      <div className="flex flex-col mb-8 md:mb-12 border-b border-gray-200 pb-6 md:pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 md:mb-4 capitalize">
              {activeCategory === 'new-arrivals' 
                ? 'New Arrivals' 
                : activeCategory === 'all' 
                  ? 'All Collections' 
                  : activeCategory}
            </h1>
            <p className="text-gray-500 font-light">
              Elevate your wardrobe with our meticulously crafted pieces.
            </p>
          </div>
          
          {/* Desktop Filters toggle button */}
          <button 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className="hidden md:flex items-center gap-2 glass-panel px-6 py-3 rounded-full text-sm font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-colors bg-white/40 border border-white/60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters
          </button>
        </div>

        {/* Mobile Filters toggle button */}
        <button 
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className="md:hidden flex items-center justify-center gap-2 glass-panel w-full py-3 mb-6 rounded-xl text-sm font-bold tracking-widest uppercase bg-white/40 border border-white/60"
        >
          Filters {(activeCategory !== 'all' || priceRange !== 'all') && '(Active)'}
        </button>

        {/* Dropdown Filters Panel */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isFilterPanelOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 md:max-h-96 md:opacity-100'
        }`}>
          <div className="flex flex-col md:flex-row gap-8 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm mb-4">
            
            {/* Category selection */}
            <div className="flex-1">
              <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                      activeCategory === cat 
                        ? 'bg-black text-white' 
                        : 'bg-white/60 hover:bg-white text-gray-600 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    {cat === 'new-arrivals' ? 'New Arrivals' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price selection */}
            <div className="flex-1 md:border-l border-gray-200 md:pl-8">
              <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">Price Range</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPriceRange('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    priceRange === 'all' 
                      ? 'bg-black text-white' 
                      : 'bg-white/60 hover:bg-white text-gray-600 border border-transparent hover:border-gray-200'
                  }`}
                >
                  Any Price
                </button>
                <button
                  onClick={() => setPriceRange('under10k')}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    priceRange === 'under10k' 
                      ? 'bg-black text-white' 
                      : 'bg-white/60 hover:bg-white text-gray-600 border border-transparent hover:border-gray-200'
                  }`}
                >
                  Under {formatPrice(10000)}
                </button>
                <button
                  onClick={() => setPriceRange('10k-20k')}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    priceRange === '10k-20k' 
                      ? 'bg-black text-white' 
                      : 'bg-white/60 hover:bg-white text-gray-600 border border-transparent hover:border-gray-200'
                  }`}
                >
                  {formatPrice(10000)} - {formatPrice(20000)}
                </button>
                <button
                  onClick={() => setPriceRange('over20k')}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    priceRange === 'over20k' 
                      ? 'bg-black text-white' 
                      : 'bg-white/60 hover:bg-white text-gray-600 border border-transparent hover:border-gray-200'
                  }`}
                >
                  Over {formatPrice(20000)}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Grid of Product Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="glass-card rounded-2xl md:rounded-3xl p-3 md:p-6 animate-pulse bg-gray-200">
              <div className="h-48 md:h-80 rounded-xl md:rounded-2xl bg-gray-300 mb-4 md:mb-6" />
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-300 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl mt-8 bg-white/40 border border-white/60">
          <p className="text-gray-500 text-lg">No products found matching your filters.</p>
          <button 
            onClick={clearAllFilters}
            className="mt-4 underline underline-offset-4 text-sm font-bold tracking-widest uppercase hover:text-gray-500"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={onProductClick}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export default Collections;
