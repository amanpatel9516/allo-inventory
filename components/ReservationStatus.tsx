import { Badge } from "@/components/ui/badge";

export function ReservationStatus({ status }: { status: 'PENDING' | 'CONFIRMED' | 'RELEASED' }) {
  if (status === 'PENDING') {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm animate-pulse shadow-amber-500/20">Pending</Badge>;
  }
  
  if (status === 'CONFIRMED') {
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm shadow-emerald-500/20">Confirmed</Badge>;
  }
  
  return <Badge variant="secondary" className="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Released</Badge>;
}
