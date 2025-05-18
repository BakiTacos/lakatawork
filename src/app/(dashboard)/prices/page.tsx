'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Info } from 'lucide-react';

interface Product {
  id: string;
  productId: string;
  productName: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  supplier: string;
}

export default function Prices() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzePrice, setAnalyzePrice] = useState('');
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [basePrice, setBasePrice] = useState('');
  const [selectedMarkup, setSelectedMarkup] = useState<number | null>(null);
  
  const handleAnalyzePrice = () => {
    const price = parseFloat(analyzePrice);
    if (isNaN(price)) return;
    
    const packagingFee = price * 0.04;
    const adminFee = price * 0.13;
    const finalPrice = price - packagingFee - adminFee;
    
    return {
      packagingFee,
      adminFee,
      finalPrice
    };
  };

  const allMarkups = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const [selectedMarkups, setSelectedMarkups] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedMarkups');
      return saved ? JSON.parse(saved) : allMarkups;
    }
    return allMarkups;
  });
  const [customMarkups, setCustomMarkups] = useState<number[]>([]);
  const itemsPerPage = 20;
  const router = useRouter();

  const handleMarkupToggle = (markup: number) => {
    if (!allMarkups.includes(markup) && !customMarkups.includes(markup)) {
      setCustomMarkups([...customMarkups, markup].sort((a, b) => a - b));
    }
    const newMarkups = selectedMarkups.includes(markup)
      ? selectedMarkups.filter(m => m !== markup)
      : [...selectedMarkups, markup].sort((a, b) => a - b);
    setSelectedMarkups(newMarkups);
    localStorage.setItem('selectedMarkups', JSON.stringify(newMarkups));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      fetchProducts();
    });

    return () => unsubscribe();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const calculateRecommendedPrice = (buyingPrice: number, markup: number) => {
    const basePrice = buyingPrice ; // Add 13% VAT
    if (markup <=99) {
    return basePrice / (1 - markup / 100); // Add markup percentage
    } else {
      return basePrice * (1 + markup / 100); // Add markup percentage
    }
  };

  const calculateProfit = (recommendedPrice: number, buyingPrice: number) => {
    const vat = recommendedPrice * 0.13; // 13% VAT
    const fee = recommendedPrice * 0.04; // 4% Fee
    return recommendedPrice - buyingPrice - vat - fee;
  };

  const filteredProducts = products.filter(product =>
    product.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const [customMarkup, setCustomMarkup] = useState<string>('');

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Price Recommendations</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMarkupModal(true)}
            className="px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
          >
            Price Markup
          </button>
          <button
            onClick={() => setShowAnalyzeModal(true)}
            className="px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
          >
            Price Analyze
          </button>
        </div>
      </div>

      {showMarkupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Price Markup Calculator</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Enter Base Price</label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none"
                  placeholder="Enter base price..."
                />
              </div>
              {basePrice && (
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((markup) => (
                    <button
                      key={markup}
                      onClick={() => setSelectedMarkup(markup)}
                      className={`px-3 py-2 border rounded text-sm ${selectedMarkup === markup ? 'bg-foreground text-background' : 'border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02]'}`}
                    >
                      {markup}%
                    </button>
                  ))}
                </div>
              )}
              {basePrice && selectedMarkup !== null && (
                <div className="space-y-2 mt-4 p-4 border border-black/[.08] dark:border-white/[.12] rounded">
                  <div className="flex justify-between items-center text-sm">
                    <span>Base Price:</span>
                    <span>Rp {parseFloat(basePrice).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span>Markup ({selectedMarkup}%):</span>
                     <span>Rp {Math.round(parseFloat(basePrice) * (selectedMarkup / 100)).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span>Selling Price:</span>
                      <span>Rp {Math.round(calculateRecommendedPrice(parseFloat(basePrice), selectedMarkup)).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span>Admin Fee (13%):</span>
                      <span>Rp {Math.round(calculateRecommendedPrice(parseFloat(basePrice), selectedMarkup) * 0.13).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span>Packaging Fee (4%):</span>
                      <span>Rp {Math.round(calculateRecommendedPrice(parseFloat(basePrice), selectedMarkup) * 0.04).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm font-medium">
                      <span>Estimated Profit:</span>
                      <span>Rp {Math.round(calculateRecommendedPrice(parseFloat(basePrice), selectedMarkup) - parseFloat(basePrice) - calculateRecommendedPrice(parseFloat(basePrice), selectedMarkup) * 0.17).toLocaleString('id-ID')}</span>
                   </div>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowMarkupModal(false);
                    setBasePrice('');
                    setSelectedMarkup(null);
                  }}
                  className="px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalyzeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Price Analysis</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Enter Price</label>
                <input
                  type="number"
                  value={analyzePrice}
                  onChange={(e) => setAnalyzePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none"
                  placeholder="Enter price..."
                />
              </div>
              {analyzePrice && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Packaging Fee (4%):</span>
                    <span>Rp {(parseFloat(analyzePrice) * 0.04).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Admin Fee (13%):</span>
                    <span>Rp {(parseFloat(analyzePrice) * 0.13).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Final Price:</span>
                    <span>Rp {(parseFloat(analyzePrice) - (parseFloat(analyzePrice) * 0.04) - (parseFloat(analyzePrice) * 0.13)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowAnalyzeModal(false);
                    setAnalyzePrice('');
                  }}
                  className="px-4 py-2 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4 w-full">
        <div className="flex items-center gap-4 w-full">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 border border-black/[.08] dark:border-white/[.12] rounded">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max="999"
              value={customMarkup}
              onChange={(e) => setCustomMarkup(e.target.value)}
              placeholder="Custom %"
              className="w-14 sm:w-16 px-1.5 py-0.5 text-xs border border-black/[.08] dark:border-white/[.12] rounded focus:ring-1 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            />
            <button
              onClick={() => {
                const markup = parseInt(customMarkup);
                if (markup > 0 && !selectedMarkups.includes(markup)) {
                  handleMarkupToggle(markup);
                  setCustomMarkup('');
                }
              }}
              className="px-1.5 py-0.5 text-xs bg-foreground text-background rounded hover:bg-foreground/90 transition-colors"
            >
              Add
            </button>
          </div>
          {[...new Set([...allMarkups, ...customMarkups, ...selectedMarkups])].sort((a, b) => a - b).map(markup => (
            <label key={markup} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMarkups.includes(markup)}
                onChange={() => handleMarkupToggle(markup)}
                className="rounded border-black/[.08] dark:border-white/[.12] text-foreground"
              />
              <span className="text-sm text-foreground/60">{markup}%</span>
              {!allMarkups.includes(markup) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkupToggle(markup);
                    setCustomMarkups(customMarkups.filter(m => m !== markup));
                  }}
                  className="ml-1 text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  ×
                </button>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {getCurrentPageItems().map((product) => (
          <div key={product.id} className="bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-2 sm:p-3 border border-black/[.08] dark:border-white/[.12]">
            <div className="mb-1.5 sm:mb-2">
              <h3 className="text-sm font-semibold text-foreground truncate" title={product.productName}>
                {product.productName}
              </h3>
              <p className="text-[10px] sm:text-xs text-foreground/60 mb-0.5">ID: {product.productId}</p>
              <p className="text-[10px] sm:text-xs text-foreground/60">Supplier: {product.supplier}</p>
              <p className="text-[10px] sm:text-xs text-foreground/60">Current Sale Price:</p>
              <span className="text-xs sm:text-sm font-medium">Rp {product.sellingPrice.toLocaleString()}</span>
            </div>
            
            <div className="space-y-1 mt-2 sm:mt-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-foreground/60">Buying Price:</span>
                <span className="text-xs sm:text-sm font-medium">Rp {product.buyingPrice.toLocaleString()}</span>
              </div>
              {selectedMarkups.map(markup => {
                const recommendedPrice = calculateRecommendedPrice(product.buyingPrice, markup);
                const estimatedProfit = calculateProfit(recommendedPrice, product.buyingPrice);
                return (
                  <div key={markup} className="space-y-0.5 sm:space-y-1 pt-1.5 sm:pt-2 border-t border-black/[.08] dark:border-white/[.12]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-foreground/60">{markup}% Markup:</span>
                        <div className="relative group">
                          <Info className="w-3 h-3 text-foreground/40" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1.5 bg-black/90 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            Base Price = Buying Price<br />
                            Final Price = Base Price / (1 - {markup}% Markup / 100)
                          </div>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium">Rp {recommendedPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-foreground/60">Est. Profit:</span>
                        <div className="relative group">
                          <Info className="w-3 h-3 text-foreground/40" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1.5 bg-black/90 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            Profit = Final Price - Buying Price - Admin (13%) - Packaging (4%)
                          </div>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                        Rp {estimatedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}