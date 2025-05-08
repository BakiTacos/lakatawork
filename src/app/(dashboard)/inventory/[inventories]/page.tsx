import Inventory from '@/components/Inventory';

export default function Page({ params }: { params: { inventories: string } }) {
  return <Inventory pageNumber={parseInt(params.inventories)} />;
}