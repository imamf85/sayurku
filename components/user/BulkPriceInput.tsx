'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPrice, calculateBulkWeight, formatBulkWeight, getMaxBulkNominal } from '@/lib/utils'

interface BulkPriceInputProps {
  pricePerKg: number
  stock: number
  minPrice: number
  value: number
  onChange: (nominal: number) => void
}

const QUICK_AMOUNTS = [5000, 10000, 15000, 20000]

export function BulkPriceInput({
  pricePerKg,
  stock,
  minPrice,
  value,
  onChange,
}: BulkPriceInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const maxNominal = getMaxBulkNominal(stock, pricePerKg)
  const weight = calculateBulkWeight(value, pricePerKg)

  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    setInputValue(rawValue)

    const numValue = parseInt(rawValue) || 0
    if (numValue >= minPrice && numValue <= maxNominal) {
      onChange(numValue)
    } else if (numValue < minPrice && numValue > 0) {
      onChange(minPrice)
    } else if (numValue > maxNominal) {
      onChange(maxNominal)
    }
  }

  const handleBlur = () => {
    let numValue = parseInt(inputValue) || minPrice
    if (numValue < minPrice) numValue = minPrice
    if (numValue > maxNominal) numValue = maxNominal
    setInputValue(numValue.toString())
    onChange(numValue)
  }

  const handleQuickAmount = (amount: number) => {
    const validAmount = Math.min(amount, maxNominal)
    if (validAmount >= minPrice) {
      setInputValue(validAmount.toString())
      onChange(validAmount)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Mau beli berapa?
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            Rp
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="pl-10 text-lg font-semibold"
            placeholder={minPrice.toString()}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Min. {formatPrice(minPrice)} • Maks. {formatPrice(maxNominal)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.filter(amount => amount <= maxNominal && amount >= minPrice).map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={value === amount ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickAmount(amount)}
            className={value === amount ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {formatPrice(amount)}
          </Button>
        ))}
      </div>

      <div className="bg-green-50 rounded-lg p-3 text-center">
        <p className="text-sm text-gray-600">Anda akan mendapat</p>
        <p className="text-xl font-bold text-green-600">
          {formatBulkWeight(weight)}
        </p>
      </div>
    </div>
  )
}
