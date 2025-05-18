'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';

interface Product {
  id: string;
  productName: string;
  stockQuantity: number;
  buyingPrice: number;
  sellingPrice: number;
  lastRestockDate?: any;
  lastSaleDate?: any;
}

export default function InventoryReport() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [filterStock, setFilterStock] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchProducts();
  }, [user, router]);

  const fetchProducts = async () => {
    try {
      const q = query(
        collection(db, 'products'),
        where('ownerId', '==', user?.uid)
      );

      const querySnapshot = await getDocs(q);
      const productData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      setProducts(productData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = (products: Product[]) => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.productName || '').localeCompare(b.productName || '');
        case 'stock':
          return b.stockQuantity - a.stockQuantity;
        case 'value':
          return (b.stockQuantity * b.buyingPrice) - (a.stockQuantity * a.buyingPrice);
        default:
          return 0;
      }
    });
  };

  const filterProducts = (products: Product[]) => {
    switch (filterStock) {
      case 'low':
        return products.filter(p => p.stockQuantity <= 5);
      case 'out':
        return products.filter(p => p.stockQuantity === 0);
      default:
        return products;
    }
  };

  const calculateTotalValue = (products: Product[]) => {
    return products.reduce((total, p) => total + (p.stockQuantity * p.buyingPrice), 0);
  };

  const filteredProducts = filterProducts(products);
  const sortedProducts = sortProducts(filteredProducts);
  const totalValue = calculateTotalValue(filteredProducts);
  const lowStockCount = products.filter(p => p.stockQuantity <= 5).length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/reports')}
              className="px-3 py-1 rounded border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02]"
            >
              ← Back to Reports
            </button>
            <h1 className="text-2xl font-bold">Inventory Report</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="stock">Sort by Stock Level</option>
              <option value="value">Sort by Value</option>
            </select>

            <select
              className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1"
              value={filterStock}
              onChange={(e) => {
                setFilterStock(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Total Inventory Value</h2>
            <p className="text-2xl font-bold">Rp {totalValue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Low Stock Items</h2>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </div>
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Out of Stock Items</h2>
            <p className="text-2xl font-bold">{outOfStockCount}</p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {sortedProducts
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12] flex flex-col"
            >
              <h3 className="font-medium text-lg mb-3 line-clamp-2">{product.productName || 'Unnamed Product'}</h3>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">Stock</span>
                  <span className="font-medium">{product.stockQuantity}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">Unit Price</span>
                  <span>Rp {product.buyingPrice.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">Total Value</span>
                  <span className="font-medium">Rp {(product.stockQuantity * product.buyingPrice).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-black/[.08] dark:border-white/[.12] text-xs text-foreground/60">
                <div className="flex flex-col gap-1">
                  {product.lastRestockDate && (
                    <span>Last Restock: {product.lastRestockDate.toDate().toLocaleDateString()}</span>
                  )}
                  {product.lastSaleDate && (
                    <span>Last Sale: {product.lastSaleDate.toDate().toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
          
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {Math.ceil(sortedProducts.length / itemsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedProducts.length / itemsPerPage)))}
              disabled={currentPage >= Math.ceil(sortedProducts.length / itemsPerPage)}
              className="px-4 py-2 rounded border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}