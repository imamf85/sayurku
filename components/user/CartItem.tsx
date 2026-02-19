'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CartItem as CartItemType } from '@/types'
import {
  formatPrice,
  formatUnit,
  calculateBulkWeight,
  formatBulkWeight,
  getMaxBulkNominal,
} from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (quantity: number) => Promise<boolean>
  onRemove: () => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const product = item.product!
  const isBulk = product.is_bulk_pricing
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const [isUpdating, setIsUpdating] = useState(false)
  const [inputValue, setInputValue] = useState(item.quantity.toString())

  const handleQuantityChange = async (newQuantity: number) => {
    if (isUpdating) return

    if (isBulk) {
      const minPrice = product.bulk_min_price || 1000
      const maxNominal = getMaxBulkNominal(product.stock, product.price)
      if (newQuantity < minPrice || newQuantity > maxNominal) return
    } else {
      if (newQuantity < 1 || newQuantity > product.stock) return
    }

    const previousQuantity = localQuantity
    setLocalQuantity(newQuantity)
    setInputValue(newQuantity.toString())
    setIsUpdating(true)

    const success = await onUpdateQuantity(newQuantity)

    if (!success) {
      setLocalQuantity(previousQuantity)
      setInputValue(previousQuantity.toString())
    }

    setIsUpdating(false)
  }

  const handleBulkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    setInputValue(rawValue)
  }

  const handleBulkInputBlur = async () => {
    const minPrice = product.bulk_min_price || 1000
    const maxNominal = getMaxBulkNominal(product.stock, product.price)
    let numValue = parseInt(inputValue) || minPrice

    if (numValue < minPrice) numValue = minPrice
    if (numValue > maxNominal) numValue = maxNominal

    if (numValue !== localQuantity) {
      await handleQuantityChange(numValue)
    } else {
      setInputValue(numValue.toString())
    }
  }

  // Bulk pricing display
  if (isBulk) {
    const weight = calculateBulkWeight(localQuantity, product.price)
    const minPrice = product.bulk_min_price || 1000
    const maxNominal = getMaxBulkNominal(product.stock, product.price)

    return (
      <div className="flex gap-3 p-4 bg-white rounded-lg border">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatPrice(product.price)}/kg
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                Rp
              </span>
              <Input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleBulkInputChange}
                onBlur={handleBulkInputBlur}
                className="pl-7 h-8 text-sm"
                disabled={isUpdating}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              = {formatBulkWeight(weight)}
            </p>
            <p className="font-bold text-green-600 text-sm">
              {formatPrice(localQuantity)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Regular product display
  return (
    <div className="flex gap-3 p-4 bg-white rounded-lg border">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatUnit(product.unit, product.unit_value)}
        </p>
        <p className="font-bold text-green-600 mt-1">
          {formatPrice(product.price)}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(localQuantity - 1)}
              disabled={localQuantity <= 1 || isUpdating}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {localQuantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(localQuantity + 1)}
              disabled={localQuantity >= product.stock || isUpdating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
