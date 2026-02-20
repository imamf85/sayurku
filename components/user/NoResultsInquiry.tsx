'use client'

import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InquiryFormModal } from './InquiryFormModal'

interface NoResultsInquiryProps {
  searchQuery: string
}

export function NoResultsInquiry({ searchQuery }: NoResultsInquiryProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-6">Tidak ada produk yang ditemukan</p>

        <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto border border-green-100">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">
            Tidak menemukan yang dicari?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Jangan khawatir! Ajukan permintaan dan tim kami akan mencarikan item tersebut untuk Anda.
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Package className="h-4 w-4 mr-2" />
            Ajukan Permintaan
          </Button>
        </div>
      </div>

      <InquiryFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialItemName={searchQuery}
      />
    </>
  )
}
