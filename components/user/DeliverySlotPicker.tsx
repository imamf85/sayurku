'use client'

import { useState } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DeliverySlot } from '@/types'
import { getAvailableDeliverySlots } from '@/lib/utils'

interface DeliverySlotPickerProps {
  slots: DeliverySlot[]
  selectedDate: Date | null
  selectedSlot: string | null
  onDateChange: (date: Date) => void
  onSlotChange: (slot: string) => void
  isPreorder?: boolean
  minDate?: Date
}

export function DeliverySlotPicker({
  slots,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  isPreorder = false,
  minDate = new Date(),
}: DeliverySlotPickerProps) {
  const [showAllDates, setShowAllDates] = useState(false)

  const dates = Array.from({ length: showAllDates ? 14 : 5 }, (_, i) =>
    addDays(minDate, i)
  )

  const isToday = selectedDate && isSameDay(selectedDate, new Date())
  const availableSlots = getAvailableDeliverySlots(slots, isPreorder || !isToday)

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Tanggal Pengiriman</h4>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {dates.map((date) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const dateIsToday = isSameDay(date, new Date())
            return (
              <button
                key={date.toISOString()}
                onClick={() => onDateChange(date)}
                className={cn(
                  'flex-shrink-0 w-16 p-2 rounded-lg border text-center transition-colors',
                  isSelected
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white hover:border-green-300'
                )}
              >
                <p className="text-xs">
                  {dateIsToday ? 'Hari ini' : format(date, 'EEE', { locale: id })}
                </p>
                <p className="text-lg font-bold">{format(date, 'd')}</p>
                <p className="text-xs">{format(date, 'MMM', { locale: id })}</p>
              </button>
            )
          })}
          {!showAllDates && (
            <button
              onClick={() => setShowAllDates(true)}
              className="flex-shrink-0 w-16 p-2 rounded-lg border text-center hover:border-green-300"
            >
              <p className="text-xs text-gray-500">Lihat</p>
              <p className="text-lg font-bold text-gray-500">...</p>
              <p className="text-xs text-gray-500">lainnya</p>
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Waktu Pengiriman</h4>
        <div className="grid grid-cols-2 gap-2">
          {availableSlots.length === 0 ? (
            <p className="col-span-2 text-sm text-gray-500 text-center py-4">
              Tidak ada slot tersedia untuk tanggal ini
            </p>
          ) : (
            availableSlots.map((slot) => {
              const isSelected = selectedSlot === slot.id
              return (
                <button
                  key={slot.id}
                  onClick={() => onSlotChange(slot.id)}
                  className={cn(
                    'p-3 rounded-lg border text-sm transition-colors',
                    isSelected
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white hover:border-green-300'
                  )}
                >
                  {slot.name}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
