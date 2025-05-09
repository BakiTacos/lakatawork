'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Product {
  id: string;
  productId: string;
  productName: string;
  buyingPrice: number;
  stockQuantity: number;
  supplier: string;
}

interface RestockItem {
  productId: string;
  productName: string;
  buyingPrice: number;
  supplierName: string;
  quantity: number;
}

export default function Restock() {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<RestockItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmQuantity, setConfirmQuantity] = useState(1);
  const [restockHistory, setRestockHistory] = useState<any[]>([]);
  const itemsPerPage = 20;
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      fetchProducts();
      fetchRestockHistory();
    });

    return () => unsubscribe();
  }, [router]);

  const fetchRestockHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('ownerId', '==', user.uid),
        where('type', '==', 'restock')
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRestockHistory(historyData);
    } catch (error) {
      console.error('Error fetching restock history:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        productId: doc.data().productId,
        productName: doc.data().productName,
        buyingPrice: doc.data().buyingPrice,
        stockQuantity: doc.data().stockQuantity,
        supplier: doc.data().supplier
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
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

  const showAddConfirmation = (product: Product) => {
    setSelectedProduct(product);
    setConfirmQuantity(1);
    setShowConfirmation(true);
  };

  const confirmAdd = async () => {
    if (!selectedProduct) return;

    const existingItem = selectedProducts.find(item => item.productId === selectedProduct.productId);
    
    if (existingItem) {
      setSelectedProducts(selectedProducts.map(item =>
        item.productId === selectedProduct.productId
          ? { ...item, quantity: item.quantity + confirmQuantity }
          : item
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        buyingPrice: selectedProduct.buyingPrice,
        supplierName: selectedProduct.supplier,
        quantity: confirmQuantity
      }]);
    }

    // Update stock quantity in products collection
    try {
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        stockQuantity: selectedProduct.stockQuantity + confirmQuantity
      });

      // Update local state
      setProducts(products.map(product =>
        product.id === selectedProduct.id
          ? { ...product, stockQuantity: product.stockQuantity + confirmQuantity }
          : product
      ));
    } catch (error) {
      console.error('Error updating stock quantity:', error);
    }

    setShowConfirmation(false);
    setSelectedProduct(null);
    setConfirmQuantity(1);
  };

  useEffect(() => {
    if (selectedProducts.length > 0) {
      localStorage.setItem('restockTransactionDraft', JSON.stringify(selectedProducts));
    }
  }, [selectedProducts]);

  const removeFromTransaction = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.productId !== productId));
  };

  const saveTransaction = async () => {
    try {
      const user = auth.currentUser;
      if (!user || selectedProducts.length === 0) return;

      const transactionRef = collection(db, 'transactions');
      await addDoc(transactionRef, {
        ownerId: user.uid,
        type: 'restock',
        date: new Date(),
        items: selectedProducts,
        total: selectedProducts.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0).toFixed(2)
      });

      localStorage.removeItem('restockTransactionDraft');
      setSelectedProducts([]);
      router.push('/inventory/inventories');
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Restock Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/inventory/restock/history')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            View History
          </button>
          <button
            onClick={() => router.push('/inventory/inventories')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Inventory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getCurrentPageItems().map((product) => (
              <div key={product.id} className="bg-background border border-black/[.08] dark:border-white/[.12] rounded-lg p-4">
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground mb-2">{product.productName}</h3>
                    <p className="text-sm text-foreground/60">ID: {product.productId}</p>
                    <p className="text-sm text-foreground/60">Current Stock: {product.stockQuantity}</p>
                    <p className="text-sm text-foreground/60">Supplier: {product.supplier}</p>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => showAddConfirmation(product)}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add Stock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded-md disabled:opacity-50 bg-background text-foreground hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded-md disabled:opacity-50 bg-background text-foreground hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirmation && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add Stock for {selectedProduct.productName}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Quantity to Add:</label>
              <input
                type="number"
                min="1"
                value={confirmQuantity}
                onChange={(e) => setConfirmQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded hover:bg-black/[.02] dark:hover:bg-white/[.02]"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}