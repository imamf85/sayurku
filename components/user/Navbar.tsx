'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavbarProps {
  cartCount?: number
}

export function Navbar({ cartCount = 0 }: NavbarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/search', label: 'Cari' },
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/orders', label: 'Pesanan' },
    { href: '/profile', label: 'Profil' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold text-green-600">Sayurku</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
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

        <div className="flex items-center gap-2">
          <Link href="/search" className="md:hidden">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
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
  )
}
