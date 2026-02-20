'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Tag,
  Ticket,
  Clock,
  Users,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useTransition } from 'react'

interface SidebarProps {
  adminName: string
  isSuperAdmin: boolean
}

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Produk' },
  { href: '/admin/categories', icon: FolderTree, label: 'Kategori' },
  { href: '/admin/orders', icon: ClipboardList, label: 'Pesanan' },
  { href: '/admin/inquiries', icon: MessageSquare, label: 'Permintaan Item' },
  { href: '/admin/promos', icon: Tag, label: 'Promo' },
  { href: '/admin/vouchers', icon: Ticket, label: 'Voucher' },
  { href: '/admin/delivery-slots', icon: Clock, label: 'Slot Pengiriman' },
]

export function Sidebar({ adminName, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const allMenuItems = isSuperAdmin
    ? [...menuItems, { href: '/admin/admins', icon: Users, label: 'Admin' }]
    : menuItems

  const handleNavigation = (href: string) => {
    setMobileOpen(false)
    startTransition(() => {
      router.push(href)
      router.refresh()
    })
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b h-14 flex items-center justify-between px-4">
        <span className="font-bold text-green-600">Sayurku Admin</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r transform transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-14 flex items-center justify-center border-b">
          <button
            onClick={() => handleNavigation('/admin')}
            className="font-bold text-green-600 text-lg"
          >
            Sayurku Admin
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {allMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                disabled={isPending}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  isActive
                    ? 'bg-green-50 text-green-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100',
                  isPending && 'opacity-50 cursor-wait'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{adminName}</p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <Link href="/admin/login?logout=true">
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
