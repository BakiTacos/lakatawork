'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface RestockItem {
  productId: string;
  productName: string;
  quantity: number;
  buyingPrice: number;
  supplierName: string;
}

interface Transaction {
  id: string;
  date: any;
  items: RestockItem[];
  total: number;
  type: string;
  ownerId: string;
}

export default function RestockHistory() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, 'transactions'),
          where('ownerId', '==', user.uid),
          where('type', '==', 'restock')
        );

        const querySnapshot = await getDocs(q);
        const transactionData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];

        // Sort transactions by date in descending order
        const sortedTransactions = transactionData.sort((a, b) => 
          b.date.toDate().getTime() - a.date.toDate().getTime()
        );

        setTransactions(sortedTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/inventory/restock')}
            className="px-3 py-1 rounded border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02]"
          >
            ← Back to Restock
          </button>
          <h1 className="text-2xl font-bold">Restock History</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/60">Show:</label>
          <select
            className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1 text-sm"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <p className="text-foreground/60">No restock history available</p>
      ) : (
        <>
          <div className="space-y-1">
            {currentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start p-2 hover:bg-black/[.02] dark:hover:bg-white/[.02] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {transaction.items.map(item => item.productName).join(', ')}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60">
                        {new Date(transaction.date.toDate()).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap">
                      Rp {Number(transaction.total).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-1 text-xs text-foreground/60">
                    {transaction.items.map((item, i) => (
                      <span key={i}>
                        {item.quantity} units from {item.supplierName}
                        {i < transaction.items.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-black/[.08] dark:border-white/[.12] disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-foreground/60">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-black/[.08] dark:border-white/[.12] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}