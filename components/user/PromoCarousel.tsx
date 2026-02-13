'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from '@/lib/utils'

interface PromoSlide {
  id: string
  image_url: string
  title: string
  link?: string
}

interface PromoCarouselProps {
  slides: PromoSlide[]
  autoplayInterval?: number
}

export function PromoCarousel({ slides, autoplayInterval = 5000 }: PromoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return

    const intervalId = setInterval(() => {
      emblaApi.scrollNext()
    }, autoplayInterval)

    return () => clearInterval(intervalId)
  }, [emblaApi, autoplayInterval, slides.length])

  if (slides.length === 0) return null

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="flex-[0_0_100%] min-w-0">
              <div className="relative aspect-[2/1] bg-gray-100">
                {slide.image_url ? (
                  <Image
                    src={slide.image_url}
                    alt={slide.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <span className="text-xl font-bold">{slide.title}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === selectedIndex ? 'bg-green-600' : 'bg-gray-300'
              )}
              onClick={() => emblaApi?.scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
