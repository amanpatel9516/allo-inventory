'use client';

import useSWR from 'swr';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch');
  }
  return res.json();
};

export default function Home() {
  const { data: products, error, mutate, isLoading } = useSWR('/api/products', fetcher, {
    refreshInterval: 30000,
  });

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 lg:py-24 max-w-6xl">
      <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Premium Wellness <br className="hidden md:block"/> Delivered Directly.
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium">
          Secure your items in real-time. High-demand products sell out fast.
        </p>
      </div>

      {error ? (
        <div className="text-center text-red-500 p-8 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
          <p className="font-semibold text-lg mb-2">Database Connection Error</p>
          <p className="text-sm opacity-80 mb-4">{error.message}</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => mutate()} 
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors text-sm font-semibold"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : isLoading || !products ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <Skeleton className="h-20 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : !Array.isArray(products) ? (
        <div className="text-center p-8">
           <p className="text-slate-500">Initializing products...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} mutate={mutate} />
          ))}
        </div>
      )}
    </div>
  );
}
