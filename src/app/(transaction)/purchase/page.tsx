'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Product {
  id: string;
  productId: string;
  productName: string;
  buyingPrice: number;
  supplier: string;
}

interface TransactionItem {
  productId: string;
  productName: string;
  buyingPrice: number;
  supplierName: string;
  quantity: number;
}

export default function Purchase() {

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmQuantity, setConfirmQuantity] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<TransactionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const router = useRouter();



  useEffect(() => {
    // Load draft from localStorage
    const savedDraft = localStorage.getItem('purchaseTransactionDraft');
    if (savedDraft) {
      setSelectedProducts(JSON.parse(savedDraft));
    }

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
        productId: doc.data().productId,
        productName: doc.data().productName,
        buyingPrice: doc.data().buyingPrice || 0,
        supplier: doc.data().supplier
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const showAddConfirmation = (product: Product) => {
    setSelectedProduct(product);
    setConfirmQuantity(1);
    setShowConfirmation(true);
  };

  const confirmAdd = () => {
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
    setShowConfirmation(false);
    setSelectedProduct(null);
    setConfirmQuantity(1);
  };

  // Save draft to localStorage whenever selectedProducts changes
  useEffect(() => {
    if (selectedProducts.length > 0) {
      localStorage.setItem('purchaseTransactionDraft', JSON.stringify(selectedProducts));
    }
  }, [selectedProducts]);

  const removeFromTransaction = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setSelectedProducts(selectedProducts.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const [showTransactionConfirmation, setShowTransactionConfirmation] = useState(false);
  const [savedTransactionId, setSavedTransactionId] = useState('');

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const handleSaveClick = () => {
    setShowSaveConfirmation(true);
  };

  const saveTransaction = async () => {
    try {
      const user = auth.currentUser;
      if (!user || selectedProducts.length === 0) return;

      setShowSaveConfirmation(false);

      const transactionRef = collection(db, 'transactions');
      const docRef = await addDoc(transactionRef, {
        ownerId: user.uid,
        type: 'purchase',
        date: new Date(),
        items: selectedProducts,
        total: selectedProducts.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0)
      });

      setSavedTransactionId(docRef.id);
      localStorage.removeItem('purchaseTransactionDraft');
      setShowTransactionConfirmation(true);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction. Please try again.');
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



  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchase Transaction</h1>
        <button
          onClick={() => router.push('/purchase/history')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          View History
        </button>
      </div>



      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
        />
      </div>

      <div>
        {showSaveConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full">
              <h3 className="text-lg font-semibold mb-2">Confirm Transaction</h3>
              <p className="text-sm text-foreground/70 mb-4">Please verify that all items and quantities are correct before proceeding with the transaction.</p>
              <div className="mb-4 max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Supplier</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item, index) => (
                      <tr key={index} className="hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2">{item.supplierName}</td>
                        <td className="px-4 py-2 text-right">Rp {item.buyingPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">Rp {(item.buyingPrice * item.quantity).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeFromTransaction(item.productId)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={4} className="px-4 py-2 text-right">Total:</td>
                      <td className="px-4 py-2 text-right">
                        Rp {selectedProducts.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveConfirmation(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTransaction}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Confirm Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showTransactionConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full">
              <h3 className="text-lg font-semibold mb-4">Transaction Saved Successfully</h3>
              <div className="mb-4 max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Supplier</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item, index) => (
                      <tr key={index} className="hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2">{item.supplierName}</td>
                        <td className="px-4 py-2 text-right">Rp {item.buyingPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">Rp {(item.buyingPrice * item.quantity).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeFromTransaction(item.productId)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={4} className="px-4 py-2 text-right">Total:</td>
                      <td className="px-4 py-2 text-right">
                        Rp {selectedProducts.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowTransactionConfirmation(false);
                    setSelectedProducts([]);
                    router.push(`/purchase/history/${savedTransactionId}`);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmation && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Confirm Product</h3>
              <div className="mb-4">
                <p className="mb-2">Product: {selectedProduct.productName}</p>
                <p className="mb-4">Price: Rp {selectedProduct.buyingPrice.toLocaleString()}</p>
                <label className="block text-sm font-medium mb-2">Quantity:</label>
                <input
                  type="number"
                  value={confirmQuantity}
                  onChange={(e) => setConfirmQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdd}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add to Transaction
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background p-4 border-t border-black/[.08] dark:border-white/[.12] flex justify-between items-center">
            <div className="text-lg font-semibold">
              Total: Rp {selectedProducts.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedProducts([]);
                  localStorage.removeItem('purchaseTransactionDraft');
                }}
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Discard Transaction
              </button>
              <button
                onClick={handleSaveClick}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save Transaction
              </button>
            </div>
          </div>
        )}

        {


        <div className="bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
          <h2 className="text-lg font-semibold mb-4">Available Products</h2>
          {totalPages > 1 && (
            <div className="mb-4 flex justify-center gap-2">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Product ID</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Supplier</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageItems().map((product) => (
                  <tr key={product.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                    <td className="px-4 py-2">{product.productId}</td>
                    <td className="px-4 py-2" title={product.productName}>
                      {product.productName.split(' ').slice(0, 4).join(' ')}
                      {product.productName.split(' ').length > 4 ? '...' : ''}
                    </td>
                    <td className="px-4 py-2">Rp {product.buyingPrice.toLocaleString()}</td>
                    <td className="px-4 py-2">{product.supplier}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => showAddConfirmation(product)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
}
      </div>
    </div>
  );
}