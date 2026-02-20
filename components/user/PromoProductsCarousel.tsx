'use client'

import { useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/user/ProductCard'
import { Product, Promo } from '@/types'

interface PromoProduct {
  product: Product
  promo: Promo
}

interface PromoProductsCarouselProps {
  promoProducts: PromoProduct[]
}

export function PromoProductsCarousel({ promoProducts }: PromoProductsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 2,
    containScroll: 'trimSnaps',
  })

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  // No promo - show attractive message
  if (promoProducts.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Promo Spesial
        </h2>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">
            Promo sedang disiapkan!
          </h3>
          <p className="text-sm text-gray-600">
            Nantikan penawaran menarik dari kami. Jangan lupa cek kembali ya!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Promo Spesial
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {promoProducts.map(({ product, promo }) => (
            <div
              key={promo.id}
              className="flex-[0_0_45%] sm:flex-[0_0_30%] lg:flex-[0_0_20%] min-w-0"
            >
              <ProductCard product={product} promo={promo} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
