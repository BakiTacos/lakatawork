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

interface InventoryClientProps {
  initialPage: number;
}

export default function InventoryClient({ initialPage }: InventoryClientProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const router = useRouter();

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

      <div className="overflow-x-auto bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
        {totalPages > 1 && (
          <div className="mb-4 flex justify-center gap-2">
            <button
              onClick={() => {
                const newPage = Math.max(currentPage - 1, 1);
                setCurrentPage(newPage);
                router.push(`/inventory/${newPage}`);
              }}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                const newPage = Math.min(currentPage + 1, totalPages);
                setCurrentPage(newPage);
                router.push(`/inventory/${newPage}`);
              }}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
        <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Product ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Stock Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.08] dark:divide-white/[.12]">
            {getCurrentPageItems().map((item) => (
              <tr key={item.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150 ease-in-out">
                <td className="px-6 py-4 whitespace-nowrap">{item.productId}</td>
                <td className="px-6 py-4 whitespace-nowrap" title={item.productName}>
                  {item.productName.split(' ').slice(0, 4).join(' ')}
                  {item.productName.split(' ').length > 4 ? '...' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-emerald-600">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={item.stockQuantity?.toString() || '0'}
                      onChange={(e) => {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0);
                        updateStock(item.id, newValue);
                      }}
                      className="w-20 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      min="0"
                    />
                    <span className="text-gray-500">units</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{item.supplier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}