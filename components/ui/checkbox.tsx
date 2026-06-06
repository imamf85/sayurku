"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  onCheckedChange,
  className,
  disabled = false,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const isActive = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        "peer h-5 w-5 shrink-0 rounded border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
        isActive && "bg-green-600 border-green-600 text-white",
        !isActive && "bg-white",
        className
      )}
    >
      {indeterminate && <Minus className="h-3 w-3" />}
      {!indeterminate && checked && <Check className="h-4 w-4" />}
    </button>
  )
}
