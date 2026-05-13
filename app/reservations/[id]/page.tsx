'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CountdownTimer } from '@/components/CountdownTimer';
import { ReservationStatus } from '@/components/ReservationStatus';
import { ErrorToast } from '@/components/ErrorToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/schemas';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, Loader2, PackageX } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const { data, error: fetchError, mutate, isLoading } = useSWR(
    `/api/reservations/${unwrappedParams.id}`,
    fetcher
  );

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    const idempotencyKey = uuidv4();

    try {
      const response = await fetch(`/api/reservations/${unwrappedParams.id}/confirm`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result);
        if (response.status === 410) {
          toast.error("Reservation expired. Redirecting...");
        } else {
          toast.error(result.message || "Failed to confirm reservation");
        }
      } else {
        toast.success("Purchase confirmed successfully!");
        mutate({ reservation: result.reservation }, false); // Optimistic update
      }
    } catch (err) {
      setError({ error: 'INTERNAL_ERROR', message: 'Failed to communicate with server' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${unwrappedParams.id}/release`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result);
        toast.error("Failed to cancel reservation");
      } else {
        toast.info("Reservation cancelled.");
        router.push('/');
      }
    } catch (err) {
      setError({ error: 'INTERNAL_ERROR', message: 'Failed to communicate with server' });
    } finally {
      setIsReleasing(false);
    }
  };

  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Could not load reservation</h2>
        <Button onClick={() => router.push('/')}>
          Return to Shop
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { reservation } = data;

  if (!reservation) {
     return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <PackageX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Reservation Not Found</h2>
        <Button onClick={() => router.push('/')}>
          Return to Shop
        </Button>
      </div>
    );
  }

  const isPending = reservation.status === 'PENDING';
  const isConfirmed = reservation.status === 'CONFIRMED';
  const isReleased = reservation.status === 'RELEASED';

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Shop
        </Link>
      </div>

      <Card className={`overflow-hidden transition-all duration-500 ${isConfirmed ? 'border-emerald-500/30 shadow-emerald-500/10 shadow-xl' : 'shadow-xl'}`}>
        <div className={`h-2 w-full ${isConfirmed ? 'bg-emerald-500' : isReleased ? 'bg-slate-300 dark:bg-slate-700' : 'bg-primary'}`} />
        
        <CardHeader className="pb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                {isConfirmed ? 'Order Confirmed' : isReleased ? 'Order Cancelled' : 'Complete Checkout'}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Reservation ID: <span className="font-mono text-slate-500">{reservation.id}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <ReservationStatus status={reservation.status} />
              {isPending && (
                <div className="text-lg bg-white dark:bg-slate-800 px-3 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">
                  <CountdownTimer expiresAt={reservation.expiresAt} onExpire={() => mutate()} />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {error && (
          <div className="px-6 pb-4">
            <ErrorToast error={error} />
            {error.error === 'RESERVATION_EXPIRED' && (
              <div className="mt-4">
                <Button variant="outline" onClick={() => router.push('/')} className="w-full border-red-200 hover:bg-red-50 text-red-700 hover:text-red-800">
                  Return to product page to try again
                </Button>
              </div>
            )}
          </div>
        )}

        <CardContent className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-primary" />
              Order Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800 last:border-0">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{reservation.product.name}</span>
                  <span className="text-sm font-mono text-slate-500">SKU: {reservation.product.sku}</span>
                </div>
                <span className="font-semibold">Qty: {reservation.qty}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800 last:border-0">
                <span className="text-slate-600 dark:text-slate-400">Fulfilling from</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{reservation.warehouse.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800 last:border-0">
                <span className="text-slate-600 dark:text-slate-400">Total Price</span>
                <span className="font-bold text-lg text-slate-900 dark:text-white">To be calculated</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 dark:bg-slate-900/30 flex flex-col sm:flex-row gap-3 pt-6 px-6 pb-6 border-t border-slate-100 dark:border-slate-800">
          {isPending && (
            <>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={handleRelease}
                disabled={isReleasing || isConfirming}
              >
                {isReleasing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Cancel Reservation
              </Button>
              <Button 
                size="lg" 
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 shadow-md hover:shadow-xl transition-all"
                onClick={handleConfirm}
                disabled={isConfirming || isReleasing}
              >
                {isConfirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Purchase
              </Button>
            </>
          )}
          {isConfirmed && (
            <div className="w-full text-center py-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-800 dark:text-emerald-400 font-medium">
              Your order is being processed. You will receive an email shortly.
            </div>
          )}
          {isReleased && (
            <div className="w-full text-center py-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-slate-600 dark:text-slate-400 font-medium">
              This reservation was cancelled or expired.
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
