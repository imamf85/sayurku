import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <Icon className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
