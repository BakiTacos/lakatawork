import { Suspense } from 'react';
import InventoryClient from './inventory-client';

export default async function Inventory({ params }: { params: { inventories: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryClient initialPage={parseInt(params.inventories) || 1} />
    </Suspense>
  );
}