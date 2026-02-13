'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Order } from '@/types'
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { Eye } from 'lucide-react'

interface OrderTableProps {
  orders: Order[]
}

export function OrderTable({ orders }: OrderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-gray-500">
            <th className="pb-3 font-medium">No. Pesanan</th>
            <th className="pb-3 font-medium">Tanggal</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right">Total</th>
            <th className="pb-3 font-medium text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b">
              <td className="py-3">
                <span className="font-medium">{order.order_number}</span>
              </td>
              <td className="py-3 text-sm text-gray-600">
                {formatDate(order.created_at)}
              </td>
              <td className="py-3">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </td>
              <td className="py-3 text-right font-medium">
                {formatPrice(order.total)}
              </td>
              <td className="py-3 text-center">
                <Link href={`/admin/orders/${order.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
