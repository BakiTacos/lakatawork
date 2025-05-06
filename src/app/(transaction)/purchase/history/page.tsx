'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface TransactionItem {
  productId: string;
  productName: string;
  buyingPrice: number;
  supplierName: string;
  quantity: number;
}

export default function PurchaseHistory() {
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    date: Date;
    total: number;
    items: TransactionItem[];
  }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();

  const fetchTransactions = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('ownerId', '==', user.uid),
        where('type', '==', 'purchase')
      );
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date.toDate(),
        total: doc.data().total,
        items: doc.data().items
      }));
      setTransactions(transactionsData.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      fetchTransactions();
    });

    return () => unsubscribe();
  }, [router]);

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchase History</h1>
        <button
          onClick={() => router.push('/purchase')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Purchase
        </button>
      </div>

      <div className="bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Items</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageItems().map((transaction) => (
                <tr key={transaction.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                  <td className="px-4 py-2">{transaction.date.toLocaleString()}</td>
                  <td className="px-4 py-2">{transaction.items.length} items</td>
                  <td className="px-4 py-2 text-right">Rp {transaction.total.toLocaleString()}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => router.push(`/purchase/history/${transaction.id}`)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}