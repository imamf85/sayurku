'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  formatPrice,
  calculateBulkWeight,
  formatBulkWeight,
  getMaxBulkNominal,
  calculateNominalFromGram,
  getMaxBulkGram
} from '@/lib/utils'

interface BulkPriceInputProps {
  pricePerKg: number
  stock: number
  minPrice: number
  value: number
  onChange: (nominal: number) => void
}

const QUICK_AMOUNTS = [5000, 10000, 15000, 20000]
const QUICK_GRAM_AMOUNTS = [50, 100, 200, 250, 500, 1000]

export function BulkPriceInput({
  pricePerKg,
  stock,
  minPrice,
  value,
  onChange,
}: BulkPriceInputProps) {
  const [inputMode, setInputMode] = useState<'nominal' | 'gram'>('nominal')
  const [inputValue, setInputValue] = useState(value.toString())
  const [gramInputValue, setGramInputValue] = useState('')

  const maxNominal = getMaxBulkNominal(stock, pricePerKg)
  const maxGram = getMaxBulkGram(stock)
  const minGram = Math.ceil((minPrice / pricePerKg) * 1000)
  const weight = calculateBulkWeight(value, pricePerKg)

  // Sync inputValue when value changes externally
  useEffect(() => {
    setInputValue(value.toString())
    // Also update gram input when value changes
    const grams = calculateBulkWeight(value, pricePerKg)
    setGramInputValue(grams.toString())
  }, [value, pricePerKg])

  // Handle mode switch - convert values between modes
  const handleModeChange = (newMode: string) => {
    const mode = newMode as 'nominal' | 'gram'
    setInputMode(mode)

    if (mode === 'gram') {
      // Convert current nominal to gram
      const grams = calculateBulkWeight(value, pricePerKg)
      setGramInputValue(grams.toString())
    } else {
      // Convert current gram to nominal
      setInputValue(value.toString())
    }
  }

  // Handle nominal input change
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

  // Handle gram input change
  const handleGramInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    setGramInputValue(rawValue)

    const gramValue = parseInt(rawValue) || 0
    if (gramValue >= minGram && gramValue <= maxGram) {
      const nominal = calculateNominalFromGram(gramValue, pricePerKg)
      onChange(nominal)
    } else if (gramValue < minGram && gramValue > 0) {
      const nominal = calculateNominalFromGram(minGram, pricePerKg)
      onChange(nominal)
    } else if (gramValue > maxGram) {
      const nominal = calculateNominalFromGram(maxGram, pricePerKg)
      onChange(nominal)
    }
  }

  const handleGramBlur = () => {
    let gramValue = parseInt(gramInputValue) || minGram
    if (gramValue < minGram) gramValue = minGram
    if (gramValue > maxGram) gramValue = maxGram
    setGramInputValue(gramValue.toString())
    const nominal = calculateNominalFromGram(gramValue, pricePerKg)
    onChange(nominal)
  }

  const handleQuickGramAmount = (grams: number) => {
    const validGram = Math.min(grams, maxGram)
    if (validGram >= minGram) {
      setGramInputValue(validGram.toString())
      const nominal = calculateNominalFromGram(validGram, pricePerKg)
      onChange(nominal)
    }
  }

  // Check if a gram amount is selected (approximately matches)
  const isGramSelected = (grams: number) => {
    const currentGram = calculateBulkWeight(value, pricePerKg)
    return Math.abs(currentGram - grams) < 1
  }

  return (
    <div className="space-y-3">
      <Tabs value={inputMode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nominal">Nominal (Rp)</TabsTrigger>
          <TabsTrigger value="gram">Gram</TabsTrigger>
        </TabsList>

        <TabsContent value="nominal" className="space-y-3 mt-3">
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
        </TabsContent>

        <TabsContent value="gram" className="space-y-3 mt-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Mau beli berapa gram?
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={gramInputValue}
                onChange={handleGramInputChange}
                onBlur={handleGramBlur}
                className="pr-14 text-lg font-semibold"
                placeholder={minGram.toString()}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                gram
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Min. {minGram} gram • Maks. {formatBulkWeight(maxGram)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_GRAM_AMOUNTS.filter(gram => gram <= maxGram && gram >= minGram).map((gram) => (
              <Button
                key={gram}
                type="button"
                variant={isGramSelected(gram) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickGramAmount(gram)}
                className={isGramSelected(gram) ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {gram}g
              </Button>
            ))}
          </div>

          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">Anda akan bayar</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(value)}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
