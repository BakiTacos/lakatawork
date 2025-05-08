'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams } from 'next/navigation';

interface TransactionItem {
  productId: string;
  productName: string;
  buyingPrice: number;
  supplierName: string;
  quantity: number;
}

interface Transaction {
  id: string;
  ownerId: string;
  type: string;
  date: Date;
  items: TransactionItem[];
  total: number;
}

// Removed: import { use } from 'react';

export default function TransactionDetail() {
  const params = useParams();
  const transactionId = params.transactionId as string;
  const [visibleColumns, setVisibleColumns] = useState({
    productId: true,
    name: true,
    price: true,
    quantity: true,
    supplier: true,
    subtotal: true
  });
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      if (transactionId) {
        fetchTransaction(transactionId);
      } else {
        router.push('/purchase/history');
      }
    });

    return () => unsubscribe();
  }, [router, transactionId]);

  const fetchTransaction = async (id: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const transactionDoc = await getDoc(doc(db, 'transactions', id));
      if (transactionDoc.exists() && transactionDoc.data().ownerId === user.uid) {
        const data = transactionDoc.data();
        setTransaction({
          id: transactionDoc.id,
          ownerId: data.ownerId,
          type: data.type,
          date: data.date.toDate(),
          items: data.items,
          total: data.total
        });
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    }
  };

  if (!transaction) {
    return (
      <div className="p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading transaction details...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Transaction Details</h1>
          <button
            onClick={() => router.push('/purchase/history')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to History
          </button>
        </div>

        <div className="bg-background rounded-lg shadow-lg p-6 border border-black/[.08] dark:border-white/[.12]">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Transaction ID</p>
              <p className="font-medium">{transaction.id.substring(0, 7)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{transaction.date.toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(visibleColumns).map(([column, isVisible]) => (
              <label key={column} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, [column]: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="capitalize">{column}</span>
              </label>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
              <thead>
                <tr>
                  {visibleColumns.productId && <th className="px-4 py-2 text-left">Product ID</th>}
                  {visibleColumns.name && <th className="px-4 py-2 text-left">Name</th>}
                  {visibleColumns.price && <th className="px-4 py-2 text-left">Price</th>}
                  {visibleColumns.quantity && <th className="px-4 py-2 text-left">Quantity</th>}
                  {visibleColumns.supplier && <th className="px-4 py-2 text-left">Supplier</th>}
                  {visibleColumns.subtotal && <th className="px-4 py-2 text-right">Subtotal</th>}
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-black/[.02] dark:hover:bg-white/[.02]">
                    {visibleColumns.productId && <td className="px-4 py-2">{item.productId}</td>}
                    {visibleColumns.name && <td className="px-4 py-2">{item.productName}</td>}
                    {visibleColumns.price && <td className="px-4 py-2">Rp {item.buyingPrice.toLocaleString()}</td>}
                    {visibleColumns.quantity && <td className="px-4 py-2">{item.quantity}</td>}
                    {visibleColumns.supplier && <td className="px-4 py-2">{item.supplierName}</td>}
                    {visibleColumns.subtotal && <td className="px-4 py-2 text-right">
                      Rp {(item.buyingPrice * item.quantity).toLocaleString()}
                    </td>}
                  </tr>
                ))}
                <tr className="font-semibold bg-black/[.02] dark:bg-white/[.02]">
                  <td 
                    colSpan={Object.values(visibleColumns).filter(Boolean).length - 1} 
                    className="px-4 py-2 text-right"
                  >
                    Total
                  </td>
                  {visibleColumns.subtotal && (
                    <td className="px-4 py-2 text-right">
                      Rp {transaction.total.toLocaleString()}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}