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
    });

    return () => unsubscribe();
  }, [router]);

  const fetchProductCount = async (userId: string) => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      setProductCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching product count:', error);
    }
  };

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
              <p className="text-sm text-foreground/60">Account Created</p>
              <p className="font-medium text-foreground">{user.metadata.creationTime}</p>
            </div>

            <div>
              <p className="text-sm text-foreground/60">Last Sign In</p>
              <p className="font-medium text-foreground">{user.metadata.lastSignInTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}