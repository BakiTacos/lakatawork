'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  stockQuantity: number;
  supplier: string;
}

export default function Inventory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  
  useEffect(() => {
    const filtered = inventory.filter(item =>
      item.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInventory(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [inventory, searchTerm]);

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInventory.slice(startIndex, endIndex);
  };
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      fetchInventory();
    });

    return () => unsubscribe();
  }, [router]);

  const updateStock = async (productId: string, newQuantity: number) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (newQuantity < 0) return;

      await updateDoc(doc(db, 'products', productId), {
        stockQuantity: newQuantity
      });

      setInventory(inventory.map(item => 
        item.id === productId 
          ? { ...item, stockQuantity: newQuantity }
          : item
      ));
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const inventoryData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        productId: doc.data().productId,
        productName: doc.data().productName,
        stockQuantity: doc.data().stockQuantity,
        supplier: doc.data().supplier
      }));
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Inventory Management</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by Product ID, Name, or Supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-black/[.08] dark:border-white/[.12] rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {getCurrentPageItems().map((item) => (
          <div key={item.id} className="bg-background border border-black/[.08] dark:border-white/[.12] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-3 sm:p-4">
            <div className="flex flex-col h-full">
              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 truncate" title={item.productName}>
                  {item.productName}
                </h3>
                <p className="text-xs sm:text-sm text-foreground/60 mb-1 sm:mb-2">ID: {item.productId}</p>
                <p className="text-xs sm:text-sm text-foreground/60">Supplier: {item.supplier}</p>
              </div>
              
              <div className="mt-auto">
                <div className="flex items-center justify-between bg-black/[.02] dark:bg-white/[.02] rounded-lg p-2 sm:p-3">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Stock:</label>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <input
                      type="number"
                      value={item.stockQuantity?.toString() || '0'}
                      onChange={(e) => {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0);
                        updateStock(item.id, newValue);
                      }}
                      className="w-16 sm:w-20 px-1 sm:px-2 py-1 border border-black/[.08] dark:border-white/[.12] rounded text-center bg-background text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      min="0"
                    />
                    <span className="text-xs sm:text-sm text-foreground/60">units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
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
  );
}