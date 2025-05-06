'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Product {
  id: string;
  productId: string;
  productName: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  supplier: string;
}

export default function Stocks({ params }: { params: { product: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [currentPage, setCurrentPage] = useState(parseInt(use(params).product) || 1);
  const itemsPerPage = 24;
  const filteredProducts = products.filter(product => {
    const matchesSearch = (
      product.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesSupplier = !selectedSupplier || product.supplier === selectedSupplier;
    const matchesPrice = (
      (!minPrice || product.sellingPrice >= parseFloat(minPrice)) &&
      (!maxPrice || product.sellingPrice <= parseFloat(maxPrice))
    );
    return matchesSearch && matchesSupplier && matchesPrice;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({ 
    productId: '',
    productName: '',
    buyingPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    supplier: suppliers[0]?.name || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }
      fetchProducts();
      fetchSuppliers();
    });

    return () => unsubscribe();
  }, [router]);

  const fetchSuppliers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const suppliersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'productId' || name === 'productName' || name === 'supplier' ? value : Number(value)
    }));
  };

  const calculateProfit = (sellingPrice: number, buyingPrice: number) => {
    const vat = sellingPrice * 0.13; // 13% VAT
    const fee = sellingPrice * 0.04; // 4% Fee
    return sellingPrice - buyingPrice - vat - fee;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) return;

      const productWithOwner = {
        ...newProduct,
        ownerId: user.uid
      };

      if (isEditing && editingId) {
        await updateDoc(doc(db, 'products', editingId), productWithOwner);
        setIsEditing(false);
        setEditingId('');
      } else {
        await addDoc(collection(db, 'products'), productWithOwner);
      }
      setNewProduct({
        productId: '',
        productName: '',
        buyingPrice: 0,
        sellingPrice: 0,
        stockQuantity: 0,
        supplier: ''
      });
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setIsEditing(true);
    setEditingId(product.id);
    setNewProduct({
      productId: product.productId,
      productName: product.productName,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      supplier: product.supplier
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Stock Management</h1>
      
      <div className="mb-8 space-y-4 max-w-2xl">
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="w-full flex items-center justify-between p-4 bg-background rounded-lg shadow-lg border border-black/[.08] dark:border-white/[.12] hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
        >
          <span className="text-foreground font-medium">Search & Filter Products</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${isSearchOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isSearchOpen && (
          <div className="mt-2 space-y-4 bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
            <div className="space-y-2">
          <input
            type="text"
            placeholder="Search by Product ID or Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Min Price (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">Rp</span>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="pl-10 w-full border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Max Price (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">Rp</span>
              <input
                type="number"
                placeholder="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="pl-10 w-full border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Filter by Supplier</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.name}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )}
  </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="productId"
            value={newProduct.productId}
            onChange={handleInputChange}
            placeholder="Enter product ID"
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Product Name</label>
          <input
            type="text"
            name="productName"
            value={newProduct.productName}
            onChange={handleInputChange}
            placeholder="Enter product name"
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Buying Price (Rp)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">Rp</span>
          <input
            type="number"
            name="buyingPrice"
            value={newProduct.buyingPrice}
            onChange={handleInputChange}
            placeholder="0"
            className="pl-10 border border-black/[.08] dark:border-white/[.12] p-2 rounded w-full focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Selling Price (Rp)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">Rp</span>
          <input
            type="number"
            name="sellingPrice"
            value={newProduct.sellingPrice}
            onChange={handleInputChange}
            placeholder="0"
            className="pl-10 border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-green-50 dark:bg-green-900/20"
            required
          />
          </div>
        </div>
        <input type="hidden" name="stockQuantity" value="0" />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Supplier</label>
          <select
            name="supplier"
            value={newProduct.supplier}
            onChange={(e) => setNewProduct(prev => ({ ...prev, supplier: e.target.value }))}
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded w-full focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.name}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-foreground text-background px-4 py-2 rounded hover:bg-foreground/90"
        >
          {isEditing ? 'Update Product' : 'Add Product'}
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {getCurrentPageItems().map((product) => (
          <div key={product.id} className="bg-background rounded-lg shadow p-2 border border-black/[.08] dark:border-white/[.12] hover:shadow-md transition-shadow duration-200">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{product.productName}</h3>
              <p className="text-xs text-foreground/60">ID: {product.productId}</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground/60">Stock:</span>
                <span className="font-medium text-foreground">{product.stockQuantity} Units</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground/60">Purchase:</span>
                <span className="font-medium text-blue-600">Rp {product.buyingPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground/60">Sales:</span>
                <span className="font-medium text-green-600">Rp {product.sellingPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground/60">Profit:</span>
                <span className="font-medium text-emerald-600">Rp {calculateProfit(product.sellingPrice, product.buyingPrice).toLocaleString('id-ID')}</span>
              </div>
              <div className="pt-2 flex justify-between gap-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 px-2 py-1 border border-black/[.08] dark:border-white/[.12] text-xs font-medium rounded text-foreground bg-background hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 px-2 py-1 border border-black/[.08] dark:border-white/[.12] text-xs font-medium rounded text-foreground bg-background hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              const newPage = Math.max(currentPage - 1, 1);
              setCurrentPage(newPage);
              router.push(`/products/${newPage}`);
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
              router.push(`/products/${newPage}`);
            }}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}