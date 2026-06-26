import React, { useState } from 'react';

// Size Guide subcomponent exactly matching the original code specifications
function SizeGuide({ category, onClose }) {
  const getMeasurements = () => {
    switch (category) {
      case 'Outerwear':
      case 'Tailoring':
      case 'Basics':
        return [
          { size: 'XS', chest: '34-36"', waist: '28-30"', hip: '34-36"' },
          { size: 'S', chest: '36-38"', waist: '30-32"', hip: '36-38"' },
          { size: 'M', chest: '38-40"', waist: '32-34"', hip: '38-40"' },
          { size: 'L', chest: '40-42"', waist: '34-36"', hip: '40-42"' },
          { size: 'XL', chest: '42-44"', waist: '36-38"', hip: '42-44"' },
          { size: 'XXL', chest: '44-46"', waist: '38-40"', hip: '44-46"' }
        ];
      case 'Bottoms':
        return [
          { size: '28', waist: '28"', hip: '34"', length: '30"' },
          { size: '30', waist: '30"', hip: '36"', length: '32"' },
          { size: '32', waist: '32"', hip: '38"', length: '32"' },
          { size: '34', waist: '34"', hip: '40"', length: '34"' },
          { size: '36', waist: '36"', hip: '42"', length: '34"' }
        ];
      default:
        return [{ size: 'Standard', note: 'Standard international sizing applies.' }];
    }
  };

  const measurements = getMeasurements();
  const headers = Object.keys(measurements[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-12 relative z-10 shadow-2xl overflow-hidden animate-slide-up">
        
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all text-gray-500 font-bold"
        >
          ✕
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-400 mb-2">Technical Specifications</p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Size Guide</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">Measurements for {category} in inches.</p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-gray-50/50 p-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                {headers.map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, idx) => (
                <tr key={idx} className="hover:bg-white/80 transition-colors group">
                  {headers.map(h => (
                    <td key={h} className="px-6 py-5 text-sm font-bold text-gray-700 group-last:border-none border-b border-gray-100/50">{m[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-6 bg-gray-900 rounded-3xl text-white flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-1">Perfect Fit Guarantee</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">If the size isn't exactly right, we offer free returns and exchanges within 30 days of delivery.</p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="w-full mt-8 py-4 rounded-2xl border-2 border-gray-900 text-gray-900 text-xs font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all"
        >
          Close Guide
        </button>

      </div>
    </div>
  );
}

function ProductModal({ product, onClose, onAddToCart }) {
  const images = product.images || [product.image];
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : '');
  const [selectedColor, setSelectedColor] = useState(product.colors ? product.colors[0] : '');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const isOutOfStock = product.stock === 0 || product.stock === undefined;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 3;

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('LKR', 'Rs.');
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    onAddToCart(product, 1, selectedSize, selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-fade-in bg-black/40 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="glass-card w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] relative z-10 flex flex-col md:flex-row overflow-hidden rounded-3xl animate-slide-up shadow-2xl bg-white/90 backdrop-blur-md">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm font-bold text-gray-700"
        >
          ✕
        </button>

        {/* Left Side: Images Gallery */}
        <div className="w-full md:w-1/2 p-3 md:p-6 flex flex-col gap-3 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="h-72 md:h-full md:flex-1 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center relative isolate">
            <img 
              src={images[activeImageIdx]} 
              alt={product.name} 
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isOutOfStock ? 'opacity-50 grayscale' : ''
              }`}
              loading="lazy"
            />
            
            {/* New Ribbon */}
            {product.isNew && (
              <div className="absolute top-0 right-0 z-20 size-28 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -right-10 top-5 w-44 rotate-45 bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400 text-white text-[11px] font-black tracking-[0.28em] uppercase py-2 pl-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.35)] border-y border-white/20">
                  New
                </div>
              </div>
            )}

            {/* Low stock indicators */}
            {isLowStock && (
              <div className="absolute top-4 left-4 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 animate-pulse">
                🔥 Only {product.stock} left in stock!
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/70 text-white px-8 py-4 rounded-2xl text-lg font-black tracking-widest uppercase">
                  Sold Out
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          <div className="flex gap-3 h-20 md:h-24 px-1">
            {images.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`w-20 h-full rounded-xl overflow-hidden border-2 transition-all ${
                  activeImageIdx === idx 
                    ? 'border-black' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt={`${product.name} thumbnail ${idx + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Configuration details */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col overflow-y-auto bg-white/40 justify-between">
          <div className="space-y-6">
            <div>
              <div className="uppercase text-xs font-bold tracking-widest text-gray-500 mb-2">{product.category}</div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">{product.name}</h2>
              <div className="text-2xl font-light text-gray-700 mb-4">{formatPrice(product.price)}</div>
            </div>

            {/* Stock status pill */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold w-fit ${
              isOutOfStock 
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : isLowStock 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`} />
              {isOutOfStock ? 'Out of Stock' : isLowStock ? `Hurry! Only ${product.stock} left` : `${product.stock} in stock`}
            </div>

            {/* Colors selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.03)] bg-white/30">
                <h3 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3 flex items-center justify-between">
                  Color: <span className="text-gray-500 font-normal capitalize">{selectedColor}</span>
                </h3>
                <div className="flex gap-3">
                  {product.colors.map(col => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        selectedColor === col
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.03)] bg-white/30">
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Size</h3>
                  <button 
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-xs text-gray-500 underline underline-offset-2 hover:text-black font-bold uppercase tracking-wider"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map(sz => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[3rem] px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        selectedSize === sz
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-gray-300 bg-white/50 text-gray-700 hover:border-black'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add to Cart button */}
          <div className="mt-8 space-y-4">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full py-5 rounded-full text-sm font-bold tracking-widest shadow-xl transition-all ${
                isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-neutral-800 hover:scale-[1.02]'
              }`}
            >
              {isOutOfStock ? 'OUT OF STOCK' : `ADD TO CART - ${formatPrice(product.price)}`}
            </button>
            <p className="text-center text-[10px] text-gray-400 uppercase font-bold opacity-60 tracking-widest">
              Premium Collection &bull; 100% Guaranteed
            </p>
          </div>

        </div>

      </div>

      {/* Embedded Size Guide Overlay */}
      {isSizeGuideOpen && (
        <SizeGuide 
          category={product.category} 
          onClose={() => setIsSizeGuideOpen(false)} 
        />
      )}

    </div>
  );
}

export default ProductModal;
