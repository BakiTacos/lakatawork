'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Supplier {
  id: string;
  supplierId: string;
  name: string;
  contact: string;
}

export default function Suppliers({ params }: { params: { supplier: string } }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentPage, setCurrentPage] = useState(parseInt(params.supplier) || 1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(suppliers.length / itemsPerPage);
  
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return suppliers.slice(startIndex, endIndex);
  };
  const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({ 
    supplierId: '',
    name: '',
    contact: ''
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
        ...doc.data(),

      })) as Supplier[];
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSupplier(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) return;

      const supplierWithOwner = {
        ...newSupplier,
        ownerId: user.uid
      };

      if (isEditing && editingId) {
        await updateDoc(doc(db, 'suppliers', editingId), supplierWithOwner);
        setIsEditing(false);
        setEditingId('');
      } else {
        await addDoc(collection(db, 'suppliers'), supplierWithOwner);
      }
      setNewSupplier({
        supplierId: '',
        name: '',
        contact: '',

      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setIsEditing(true);
    setEditingId(supplier.id);
    setNewSupplier({
      supplierId: supplier.supplierId,
      name: supplier.name,
      contact: supplier.contact
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Supplier Management</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Supplier ID</label>
          <input
            type="text"
            name="supplierId"
            value={newSupplier.supplierId}
            onChange={handleInputChange}
            placeholder="Enter supplier ID"
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded w-full focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Name</label>
          <input
            type="text"
            name="name"
            value={newSupplier.name}
            onChange={handleInputChange}
            placeholder="Enter supplier name"
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded w-full focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Contact</label>
          <input
            type="text"
            name="contact"
            value={newSupplier.contact}
            onChange={handleInputChange}
            placeholder="Enter contact information"
            className="border border-black/[.08] dark:border-white/[.12] p-2 rounded w-full focus:ring-2 focus:ring-foreground focus:border-foreground outline-none bg-background text-foreground"
            required
          />
        </div>



        <button
          type="submit"
          className="bg-foreground text-background px-4 py-2 rounded hover:bg-foreground/90"
        >
          {isEditing ? 'Update Supplier' : 'Add Supplier'}
        </button>
      </form>

      <div className="overflow-x-auto bg-background rounded-lg shadow-lg p-4 border border-black/[.08] dark:border-white/[.12]">
        <table className="min-w-full divide-y divide-black/[.08] dark:divide-white/[.12]">
          <caption className="sr-only">Supplier Management Table</caption>
          <thead className="bg-background sticky top-0">
            <tr className="border-b border-black/[.08] dark:border-white/[.12]">
              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Supplier ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Contact</th>

              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.08] dark:divide-white/[.12]">
            {getCurrentPageItems().map((supplier) => (
              <tr key={supplier.id} className="hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150 ease-in-out">
                <td className="px-6 py-4 whitespace-nowrap text-foreground">{supplier.supplierId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">{supplier.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-foreground">{supplier.contact}</td>

                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="inline-flex items-center px-3 py-1.5 border border-black/[.08] dark:border-white/[.12] text-sm font-medium rounded-md text-foreground bg-background hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-black/[.08] dark:border-white/[.12] text-sm font-medium rounded-md text-foreground bg-background hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors duration-150"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-black/[.08] dark:border-white/[.12] rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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