'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StockBadge } from "./StockBadge";
import { ErrorToast } from "./ErrorToast";
import { ApiError } from "@/lib/schemas";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PackageSearch, Loader2 } from "lucide-react";

type Warehouse = {
  warehouseId: string;
  warehouseName: string;
  available: number;
  reliabilityScore: number;
  isConfidenceReduced: boolean;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string | null;
  warehouses: Warehouse[];
};

export function ProductCard({ product, mutate }: { product: Product, mutate: () => void }) {
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const router = useRouter();

  const handleReserve = async (warehouseId: string) => {
    setReservingId(warehouseId);
    setError(null);
    
    // Generate idempotency key for this specific reservation attempt
    const idempotencyKey = uuidv4();
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId,
          qty: 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
           toast.error("Not enough stock — someone just grabbed the last unit!");
        }
        setError(data);
        mutate(); // Re-fetch to get updated stock since we hit an error (likely stock change)
      } else {
        toast.success("Item reserved! Please complete your checkout.");
        router.push(`/reservations/${data.reservation.id}`);
      }
    } catch (err) {
      setError({ error: 'INTERNAL_ERROR', message: 'Failed to communicate with server' });
    } finally {
      setReservingId(null);
    }
  };

  const totalAvailable = product.warehouses.reduce((sum, w) => sum + w.available, 0);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60 group">
      <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800/80 relative flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-primary transition-all duration-500">
            <PackageSearch className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm font-medium tracking-wide">NO IMAGE</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StockBadge available={totalAvailable} />
        </div>
      </div>
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {product.name}
            </CardTitle>
            <CardDescription className="mt-1 font-mono text-xs font-medium text-slate-500">
              {product.sku}
            </CardDescription>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
          {product.description}
        </p>
      </CardHeader>
      
      {error && (
        <div className="px-6 pb-2">
          <ErrorToast error={error} />
        </div>
      )}

      <CardContent className="pb-2">
        <div className="space-y-3 pt-2">
          {product.warehouses.map((w, i) => (
            <div key={w.warehouseId}>
              {i > 0 && <Separator className="my-3 opacity-50" />}
              <div className="flex items-center justify-between group/row">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {w.warehouseName}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center mt-0.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${w.available === 0 ? 'bg-red-400' : w.available < 5 ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {w.available} unit{w.available !== 1 ? 's' : ''} available
                    {w.available < 5 && w.available > 0 && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Low Stock</span>
                    )}
                    {w.reliabilityScore > 0.95 && (
                       <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-bold uppercase tracking-tighter border border-emerald-500/20">
                         Verified
                       </span>
                    )}
                  </span>
                </div>
                <Button 
                  onClick={() => handleReserve(w.warehouseId)}
                  disabled={w.available === 0 || reservingId !== null}
                  variant={w.available > 0 ? "default" : "secondary"}
                  size="sm"
                  className={`relative overflow-hidden transition-all ${w.available > 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg' : ''}`}
                >
                  {reservingId === w.warehouseId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reserving
                    </>
                  ) : w.available > 0 ? 'Reserve' : 'Unavailable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
