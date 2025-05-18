'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/AuthContext';
import { useEffect } from 'react';

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  const reportSections = [
    {
      title: 'Sales Report',
      description: 'View detailed sales analytics and trends',
      path: '/reports/sales'
    },
    {
      title: 'Inventory Report',
      description: 'Track stock levels and inventory movements',
      path: '/reports/inventory'
    },
    {
      title: 'Profit Report',
      description: 'Analyze profit margins and financial performance',
      path: '/reports/profit'
    },
    {
      title: 'Restock History',
      description: 'Review product restock transactions',
      path: '/reports/restock'
    }
  ];

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportSections.map((section) => (
            <div
              key={section.path}
              onClick={() => router.push(section.path)}
              className="p-4 rounded-lg border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02] cursor-pointer transition-colors"
            >
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-sm text-foreground/60">{section.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}