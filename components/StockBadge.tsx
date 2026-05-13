import { Badge } from "@/components/ui/badge";

export function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return <Badge variant="destructive" className="font-semibold shadow-red-500/20 shadow-sm border-none">Out of stock</Badge>;
  }
  
  if (available <= 5) {
    return <Badge variant="outline" className="text-amber-600 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 font-semibold shadow-sm">Only {available} left!</Badge>;
  }
  
  return <Badge variant="outline" className="text-emerald-600 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 font-semibold shadow-sm">{available} in stock</Badge>;
}
