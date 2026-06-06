'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchOverlay } from './SearchOverlay'
import { cn } from '@/lib/utils'

interface NavbarProps {
  cartCount?: number
}

export function Navbar({ cartCount = 0 }: NavbarProps) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  const navItems = [
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/orders', label: 'Pesanan' },
    { href: '/requests', label: 'Permintaan' },
    { href: '/profile', label: 'Profil' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b">
        <div className="container flex h-14 items-center gap-4 px-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-xl font-bold text-green-600">Sayurku</span>
          </Link>

          {/* Desktop search bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex flex-1 items-center gap-2.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-400 transition-colors text-left max-w-md"
            aria-label="Buka pencarian"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span>Cari sayur, buah, bumbu...</span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-green-600',
                    isActive ? 'text-green-600' : 'text-gray-600'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-1 ml-auto md:ml-0">
            {/* Mobile search icon */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-600 text-xs text-white flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
