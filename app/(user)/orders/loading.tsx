import { Skeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <div className="container px-4 py-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
