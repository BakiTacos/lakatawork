'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/app/auth/AuthContext';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  buyingPrice: number;
}

interface Transaction {
  id: string;
  date: any;
  items: SaleItem[];
  total: number;
  type: string;
  ownerId: string;
}

export default function ProfitReport() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchTransactions();
  }, [user, router]);

  const fetchTransactions = async () => {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('ownerId', '==', user?.uid),
        where('type', '==', 'sale')
      );

      const querySnapshot = await getDocs(q);
      const transactionData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      setTransactions(transactionData.sort((a, b) => 
        b.date.toDate().getTime() - a.date.toDate().getTime()
      ));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactionsByDate = (transactions: Transaction[]) => {
    const monthsAgo = (months: number) => {
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date;
    };

    switch (dateRange) {
      case '3months':
        return transactions.filter(t => t.date.toDate() >= monthsAgo(3));
      case '6months':
        return transactions.filter(t => t.date.toDate() >= monthsAgo(6));
      case '12months':
        return transactions.filter(t => t.date.toDate() >= monthsAgo(12));
      case 'custom':
        if (customStartDate && customEndDate) {
          return transactions.filter(t => {
            const date = t.date.toDate();
            return date >= customStartDate && date <= customEndDate;
          });
        }
        return transactions;
      default:
        return transactions;
    }
  };

  const calculateMetrics = (transactions: Transaction[]) => {
    return transactions.reduce((metrics, t) => {
      const transactionMetrics = t.items.reduce((itemMetrics, item) => {
        const revenue = item.sellingPrice * item.quantity;
        const cost = item.buyingPrice * item.quantity;
        const adminFee = revenue * 0.13;
        const packagingFee = revenue * 0.04;
        const profit = revenue - cost - adminFee - packagingFee;

        return {
          revenue: itemMetrics.revenue + revenue,
          cost: itemMetrics.cost + cost,
          adminFees: itemMetrics.adminFees + adminFee,
          packagingFees: itemMetrics.packagingFees + packagingFee,
          profit: itemMetrics.profit + profit
        };
      }, {
        revenue: 0,
        cost: 0,
        adminFees: 0,
        packagingFees: 0,
        profit: 0
      });

      return {
        revenue: metrics.revenue + transactionMetrics.revenue,
        cost: metrics.cost + transactionMetrics.cost,
        adminFees: metrics.adminFees + transactionMetrics.adminFees,
        packagingFees: metrics.packagingFees + transactionMetrics.packagingFees,
        profit: metrics.profit + transactionMetrics.profit
      };
    }, {
      revenue: 0,
      cost: 0,
      adminFees: 0,
      packagingFees: 0,
      profit: 0
    });
  };

  const filteredTransactions = filterTransactionsByDate(transactions);
  const metrics = calculateMetrics(filteredTransactions);
  const profitMargin = metrics.revenue > 0 ? (metrics.profit / metrics.revenue) * 100 : 0;

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
            <h1 className="text-2xl font-bold">Profit Report</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1"
                  value={customStartDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setCustomStartDate(e.target.value ? new Date(e.target.value) : null)}
                />
                <span>to</span>
                <input
                  type="date"
                  className="bg-background border border-black/[.08] dark:border-white/[.12] rounded px-2 py-1"
                  value={customEndDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setCustomEndDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Total Revenue</h2>
            <p className="text-2xl font-bold">Rp {Math.round(metrics.revenue).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Total Profit</h2>
            <p className="text-2xl font-bold">Rp {Math.round(metrics.profit).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="text-sm text-foreground/60 mb-1">Profit Margin</h2>
            <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]">
            <h2 className="font-medium mb-4">Financial Breakdown</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-foreground/60">Revenue</span>
                <span>Rp {Math.round(metrics.revenue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Cost of Goods</span>
                <span>Rp {Math.round(metrics.cost).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Admin Fees (13%)</span>
                <span>Rp {Math.round(metrics.adminFees).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Packaging Fees (4%)</span>
                <span>Rp {Math.round(metrics.packagingFees).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-black/[.08] dark:border-white/[.12]">
                <span className="font-medium">Net Profit</span>
                <span className="font-medium">Rp {Math.round(metrics.profit).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-foreground/60">
                    {transaction.date.toDate().toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="font-medium">
                    {transaction.items.map(item => item.productName).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rp {Math.round(transaction.total).toLocaleString()}</p>
                  <p className="text-sm text-foreground/60">
                    Profit: Rp {Math.round(transaction.items.reduce((sum, item) => {
                      const revenue = item.sellingPrice * item.quantity;
                      const cost = item.buyingPrice * item.quantity;
                      const adminFee = revenue * 0.13;
                      const packagingFee = revenue * 0.04;
                      return sum + (revenue - cost - adminFee - packagingFee);
                    }, 0)).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-foreground/60">
                {transaction.items.map((item, i) => (
                  <span key={i}>
                    {item.quantity} x {item.productName}
                    {i < transaction.items.length - 1 ? ' • ' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}