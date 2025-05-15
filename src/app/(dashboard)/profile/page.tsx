'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [productCount, setProductCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [profitCount, setProfitCount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [productCountProfit, setProductProfitCount] = useState(0);
  const [totalPriceProfit, setTotalPriceProfit] = useState(0);
  const [showTotalPrice, setShowTotalPrice] = useState(false);
  const [showTotalPriceProfit, setShowTotalPriceProfit] = useState(false);
  const [showTotalProfit, setShowTotalProfit] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
        return;
      }
      setUser(currentUser);
      setDisplayName(currentUser.displayName || '');
      fetchProductCount(currentUser.uid);
      fetchProductProfitCount(currentUser.uid);
      fetchTotalProfit(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  // Amount of Goods Function
  // Total Price Function
  const fetchProductCount = async (userId: string) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      setProductCount(querySnapshot.size);
      
      const productValues: number[] = [];
      querySnapshot.forEach((doc) => {
        const product = doc.data();
        const stock = parseFloat(product.stockQuantity);
        const buyingPrice = parseFloat(product.buyingPrice);
        if (!isNaN(stock) && !isNaN(buyingPrice)) {
          const productValue = stock * buyingPrice;
          productValues.push(productValue);
        }
      });
      const totalPrice = productValues.reduce((sum, value) => sum + value, 0);
      setTotalPrice(totalPrice);
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  };



  const fetchProductProfitCount = async (userId: string) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      setProductProfitCount(querySnapshot.size);
      
      const productValues: number[] = [];
      querySnapshot.forEach((doc) => {
        const product = doc.data();
        const stock = parseFloat(product.stockQuantity);
        const buyingPrice = parseFloat(product.buyingPrice);
        const profit = product.sellingPrice - product.buyingPrice - (product.sellingPrice * 0.13) - (product.sellingPrice * 0.04);
        if (!isNaN(stock) && !isNaN(buyingPrice)) {
          const productValue = stock * (buyingPrice + profit);
          productValues.push(productValue);
        }
      });
      const totalPriceProfit = productValues.reduce((sum, value) => sum + value, 0);
      setTotalPriceProfit(totalPriceProfit);
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  };



  const fetchTotalProfit = async (userId: string) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      setProfitCount(querySnapshot.size);
      
      const productValues: number[] = [];
      querySnapshot.forEach((doc) => {
        const product = doc.data();
        const stock = parseFloat(product.stockQuantity);
        const profit = product.sellingPrice - product.buyingPrice - (product.sellingPrice * 0.13) - (product.sellingPrice * 0.04);
        if (!isNaN(stock) && !isNaN(profit)) {
          const productValue = stock * profit;
          productValues.push(productValue);
        }
      });
      const totalProfit = productValues.reduce((sum, value) => sum + value, 0);
      setTotalProfit(totalProfit);
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  };

  // Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (user) {
        await updateProfile(user, { displayName });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background rounded-lg shadow-lg p-6 border border-black/[.08] dark:border-white/[.12]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Profile</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-foreground/60">Email</p>
              <p className="font-medium text-foreground">{user.email}</p>
            </div>

            <div>
              <p className="text-sm text-foreground/60">Display Name</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-foreground bg-background"
                    placeholder="Enter display name"
                  />
                  <button
                    onClick={handleUpdateProfile}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(user.displayName || '');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="font-medium text-foreground">{user.displayName || 'Not set'}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-foreground/60">Total Products</p>
              <p className="font-medium text-foreground">{productCount}</p>
            </div>

            
            <div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-foreground/60">Amount of Goods</p>
                <button
                  onClick={() => setShowTotalPrice(!showTotalPrice)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {showTotalPrice ? 'Hide' : 'Show'}
                </button>
              </div>
              {showTotalPrice && (
                <p className="font-medium text-foreground">
                  Rp {totalPrice.toLocaleString()}
                </p>
              )}


              <div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-foreground/60">Estimation of Asset (+Profit)</p>
                <button
                  onClick={() => setShowTotalPriceProfit(!showTotalPriceProfit)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {showTotalPriceProfit ? 'Hide' : 'Show'}
                </button>
              </div>
              {showTotalPriceProfit && (
                <p className="font-medium text-foreground">
                  Rp {totalPriceProfit.toLocaleString()}
                </p>
              )}




<div className="flex justify-between items-center">
                <p className="text-sm text-foreground/60">Estimation of Profit Total</p>
                <button
                  onClick={() => setShowTotalProfit(!showTotalProfit)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {showTotalProfit ? 'Hide' : 'Show'}
                </button>
              </div>
              {showTotalProfit && (
                <p className="font-medium text-foreground">
                  Rp {totalProfit.toLocaleString()}
                </p>
              )}


              
            </div>
            </div>

              

            <div>
            <p className="text-sm text-foreground/60">Account Created</p>
            <p className="font-medium text-foreground">{user.metadata.creationTime}</p>
              <p className="text-sm text-foreground/60">Last Sign In</p>
              <p className="font-medium text-foreground">{user.metadata.lastSignInTime}</p>
            </div>
          </div>
        </div>
      </div>
  </div>
  );
}