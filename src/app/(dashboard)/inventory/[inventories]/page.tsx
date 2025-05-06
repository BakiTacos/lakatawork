import { Suspense } from 'react';
import InventoryClient from './inventory-client';

type Props = {
  params: { inventories: string }
}

export default function Inventory({ params }: Props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryClient initialPage={parseInt(params.inventories) || 1} />
    </Suspense>
  );
}