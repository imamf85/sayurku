'use client'

import { useState } from 'react'
import { Package, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InquiryFormModal } from './InquiryFormModal'

export function InquiryBanner() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-green-500 p-5 text-white">
        {/* Background decoration */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <Package className="h-7 w-7" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1">
              Tidak menemukan yang dicari?
            </h3>
            <p className="text-sm text-green-100 leading-snug">
              Ajukan permintaan item dan tim kami akan mencarikannya untuk Anda!
            </p>
          </div>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full bg-white text-green-600 hover:bg-green-50 font-semibold"
        >
          Ajukan Permintaan
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <InquiryFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
