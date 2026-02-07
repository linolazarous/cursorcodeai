// apps/web/components/CreditMeter.tsx
"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface CreditMeterProps {
  credits: number
  plan: string
}

export function CreditMeter({ credits, plan }: CreditMeterProps) {
  const maxCredits = {
    starter: 10,
    standard: 75,
    pro: 150,
    premier: 600,
    ultra: 2000,
  }[plan] || 10

  const percentage = Math.min((credits / maxCredits) * 100, 100)

  return (
    <Card className="w-72">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Credits ({plan})</span>
          <Badge variant={credits < 5 ? "destructive" : "secondary"}>
            {credits} / {maxCredits}
          </Badge>
        </div>
        <Progress value={percentage} className="h-2" />
        {credits < 5 && (
          <p className="text-xs text-destructive mt-2">
            Low credits! Upgrade to continue building.
          </p>
        )}
      </CardContent>
    </Card>
  )
}