'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, runTransaction, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';

interface Product {
  id: string;
  name: string;
  stock: number;
  sellingPrice: number;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
}

export default function Sales() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchProducts();
  }, [user, router]);

  const fetchProducts = async () => {
    try {
      if (!user?.uid) {
        setError('Please log in to view products');
        return;
      }

      setLoading(true);
      setError('');

      // Simplified query without orderBy to avoid index requirement
      const q = query(
        collection(db, 'products'),
        where('ownerId', '==', user.uid),
        where('stock', '>', 0)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setProducts([]);
        setError('No products available');
        return;
      }

      // Sort products by stock locally instead
      const productsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];

      const sortedProducts = productsData.sort((a, b) => b.stock - a.stock);
      setProducts(sortedProducts);
      setError('');
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setError(
        error?.message || 
        'Failed to load products. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        setError('Cannot exceed available stock');
        return;
      }
      setSelectedProducts(prev =>
        prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          sellingPrice: product.sellingPrice
        }
      ]);
    }
    setError('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.filter(item => item.productId !== productId)
    );
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || newQuantity > product.stock) {
      setError('Cannot exceed available stock');
      return;
    }
    if (newQuantity < 1) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
    setError('');
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, item) => sum + (item.sellingPrice * item.quantity),
      0
    );
  };

  const confirmSale = async () => {
    if (selectedProducts.length === 0) {
      setError('Please select products');
      return;
    }

    try {
      setLoading(true);
      await runTransaction(db, async (transaction) => {
        // Update product stock
        for (const item of selectedProducts) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.productName} not found`);
          }
          const currentStock = productDoc.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}`);
          }
          transaction.update(productRef, {
            stock: currentStock - item.quantity,
            lastSaleDate: Timestamp.now()
          });
        }

        // Create transaction record
        const transactionRef = collection(db, 'transactions');
        transaction.set(doc(transactionRef), {
          ownerId: user?.uid,
          type: 'sale',
          date: Timestamp.now(),
          items: selectedProducts,
          total: calculateTotal()
        });
      });

      setSelectedProducts([]);
      fetchProducts();
      setError('');
    } catch (error) {
      console.error('Error processing sale:', error);
      setError('Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold">New Sale</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Available Products</h2>
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12] flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-foreground/60">
                      Stock: {product.stock} • Rp {product.sellingPrice.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => addProduct(product)}
                    className="px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Selected Products</h2>
            <div className="space-y-4">
              {selectedProducts.map((item) => (
                <div
                  key={item.productId}
                  className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{item.productName}</p>
                    <button
                      onClick={() => removeProduct(item.productId)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2 py-1 rounded border border-black/[.08] dark:border-white/[.12]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-16 text-center border border-black/[.08] dark:border-white/[.12] rounded"
                      />
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-2 py-1 rounded border border-black/[.08] dark:border-white/[.12]"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-foreground/60">
                      Rp {(item.sellingPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {selectedProducts.length > 0 && (
                <div className="mt-4 p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-medium">Total</p>
                    <p className="text-xl font-bold">
                      Rp {calculateTotal().toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={confirmSale}
                    disabled={loading}
                    className="w-full py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Confirm Sale'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}