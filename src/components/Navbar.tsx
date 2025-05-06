'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-black/[.08] dark:border-white/[.12] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-foreground font-bold text-xl">
              LAKATA
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className={`text-foreground/60 hover:text-foreground transition-colors px-3 py-2 rounded-md text-sm font-medium ${pathname === '/' ? 'text-foreground bg-black/[.05] dark:bg-white/[.06]' : ''}`}>
              Home
            </Link>
            <Link href="/products/1" className={`text-foreground/60 hover:text-foreground transition-colors px-3 py-2 rounded-md text-sm font-medium ${pathname === '/products' ? 'text-foreground bg-black/[.05] dark:bg-white/[.06]' : ''}`}>
              Products
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-foreground/60 hover:text-foreground transition-colors p-2 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-black/[.08] dark:border-white/[.12] rounded-md shadow-lg py-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-4 py-2 text-sm text-foreground bg-transparent focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-foreground/60 hover:text-foreground transition-colors p-2 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>

          {isSearchOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-t border-black/[.08] dark:border-white/[.12] shadow-md">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link href="/" onClick={() => setIsSearchOpen(false)} className={`block text-foreground/60 hover:text-foreground transition-colors px-3 py-2 rounded-md text-base font-medium ${pathname === '/' ? 'text-foreground bg-black/[.05] dark:bg-white/[.06]' : ''}`}>
                  Home
                </Link>
                <Link href="/products/1" onClick={() => setIsSearchOpen(false)} className={`block text-foreground/60 hover:text-foreground transition-colors px-3 py-2 rounded-md text-base font-medium ${pathname === '/products' ? 'text-foreground bg-black/[.05] dark:bg-white/[.06]' : ''}`}>
                  Products
                </Link>
                <div className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-4 py-2 text-sm text-foreground bg-black/[.05] dark:bg-white/[.06] rounded-md focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}