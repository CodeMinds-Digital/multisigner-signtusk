'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardData {
  id: string
  title: string
  value: number | string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  onClick?: () => void
  isActive?: boolean
}

interface ResponsiveStatsCardsProps {
  cards: StatCardData[]
  loading?: boolean
  className?: string
  cardSize?: 'sm' | 'md' | 'lg'
  showTrends?: boolean
}

export function ResponsiveStatsCards({
  cards,
  loading = false,
  className,
  cardSize = 'md',
  showTrends = false
}: ResponsiveStatsCardsProps) {
  const getGridCols = () => {
    const count = cards.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    if (count === 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  const getCardPadding = () => {
    switch (cardSize) {
      case 'sm': return 'p-3'
      case 'lg': return 'p-6'
      default: return 'p-4'
    }
  }

  const getIconSize = () => {
    switch (cardSize) {
      case 'sm': return 'w-4 h-4'
      case 'lg': return 'w-6 h-6'
      default: return 'w-5 h-5'
    }
  }

  const getValueSize = () => {
    switch (cardSize) {
      case 'sm': return 'text-lg'
      case 'lg': return 'text-3xl'
      default: return 'text-2xl'
    }
  }

  return (
    <div className={cn(`grid gap-3 sm:gap-4 lg:gap-6 ${getGridCols()}`, className)}>
      {cards.map((card) => {
        const Icon = card.icon
        
        return (
          <Card
            key={card.id}
            className={cn(
              'transition-all duration-200 hover:shadow-md',
              card.onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
              card.isActive && 'ring-2 ring-blue-500 shadow-md',
              card.onClick && !card.isActive && 'hover:ring-1 hover:ring-gray-300'
            )}
            onClick={card.onClick}
          >
            <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', getCardPadding())}>
              <CardTitle className={cn(
                'font-medium leading-none tracking-tight',
                cardSize === 'sm' ? 'text-xs' : cardSize === 'lg' ? 'text-base' : 'text-sm'
              )}>
                {card.title}
              </CardTitle>
              <div className={cn('rounded-lg p-2', card.bgColor)}>
                <Icon className={cn(getIconSize(), card.color)} />
              </div>
            </CardHeader>
            <CardContent className={cn('pt-0', getCardPadding())}>
              <div className="space-y-2">
                <div className={cn('font-bold', getValueSize())}>
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 rounded h-6 w-16"></div>
                  ) : (
                    card.value
                  )}
                </div>
                
                <p className={cn(
                  'text-muted-foreground leading-tight',
                  cardSize === 'sm' ? 'text-xs' : 'text-sm'
                )}>
                  {card.description}
                </p>

                {showTrends && card.trend && !loading && (
                  <div className="flex items-center space-x-1">
                    <span className={cn(
                      'text-xs font-medium',
                      card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}>
                      {card.trend.isPositive ? '+' : ''}{card.trend.value}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {card.trend.label}
                    </span>
                  </div>
                )}

                {card.isActive && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 font-medium">Active Filter</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Skeleton loader for stats cards
export function StatsCardsSkeleton({ count = 4, cardSize = 'md' }: { count?: number, cardSize?: 'sm' | 'md' | 'lg' }) {
  const getGridCols = () => {
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    if (count === 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  const getCardPadding = () => {
    switch (cardSize) {
      case 'sm': return 'p-3'
      case 'lg': return 'p-6'
      default: return 'p-4'
    }
  }

  return (
    <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${getGridCols()}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', getCardPadding())}>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </CardHeader>
          <CardContent className={cn('pt-0', getCardPadding())}>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Compact stats display for smaller spaces
export function CompactStatsCards({ cards, loading }: { cards: StatCardData[], loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        
        return (
          <div
            key={card.id}
            className={cn(
              'bg-white rounded-lg border p-3 text-center transition-all duration-200',
              card.onClick && 'cursor-pointer hover:shadow-md hover:border-blue-300',
              card.isActive && 'border-blue-500 bg-blue-50'
            )}
            onClick={card.onClick}
          >
            <div className={cn('w-6 h-6 mx-auto mb-2 rounded p-1', card.bgColor)}>
              <Icon className={cn('w-4 h-4', card.color)} />
            </div>
            <div className="text-lg font-bold">
              {loading ? (
                <div className="animate-pulse bg-gray-200 rounded h-4 w-8 mx-auto"></div>
              ) : (
                card.value
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-tight">
              {card.title}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export type { StatCardData }
