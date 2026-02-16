import { Skeleton } from '@/components/ui/skeleton'

export default function ProductLoading() {
  return (
    <div className="container px-4 py-4">
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
