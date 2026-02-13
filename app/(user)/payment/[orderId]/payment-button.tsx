'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface PaymentButtonProps {
  orderId: string
  amount: number
}

export function PaymentButton({ orderId, amount }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handlePayment = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/xendit/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invoice')
      }

      window.location.href = data.invoice_url
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Gagal membuat invoice pembayaran',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className="w-full h-12 bg-green-600 hover:bg-green-700"
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        'Bayar Sekarang'
      )}
    </Button>
  )
}
