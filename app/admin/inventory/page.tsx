'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { LayoutDashboard, Package, Warehouse, PlusCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminInventoryPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/admin/inventory', fetcher);
  const [refilling, setRefilling] = useState<string | null>(null);

  const handleRefill = async (productId: string, warehouseId: string, amount: number) => {
    const id = `${productId}-${warehouseId}`;
    setRefilling(id);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'REFILL', productId, warehouseId, amount })
      });
      if (res.ok) {
        toast.success('Stock updated successfully');
        mutate();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setRefilling(null);
    }
  };

  const handleReportDiscrepancy = async (warehouseId: string) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'REPORT_DISCREPANCY', warehouseId })
      });
      if (res.ok) {
        toast.warning('Discrepancy reported. Warehouse reliability score updated.');
        mutate();
      }
    } catch (e) {
      toast.error('Failed to report discrepancy');
    }
  };

  const handleMarkSuccess = async (warehouseId: string) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MARK_SUCCESS', warehouseId })
      });
      if (res.ok) {
        toast.success('Order success recorded. Trust score increasing.');
        mutate();
      }
    } catch (e) {
      toast.error('Failed to record success');
    }
  };

  if (error) return <div className="p-8 text-center text-red-500">Failed to load admin data</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Inventory Control
          </h1>
          <p className="text-slate-500 mt-1">Monitor and refill stock across all warehouses</p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Shop</Button>
        </Link>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Warehouse Ledger</CardTitle>
              <CardDescription>Real-time stock availability and reservation status</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => mutate()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 dark:bg-slate-900/30">
                <TableHead className="pl-6 py-4">Product</TableHead>
                <TableHead>Warehouse & Trust</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                data?.map((item: any) => {
                  const actualAvailable = item.totalQty - item.reservedQty;
                  const reliability = item.warehouse.reliabilityScore;
                  const confidenceBuffer = Math.ceil(item.totalQty * (1 - reliability));
                  const available = Math.max(0, actualAvailable - confidenceBuffer);
                  
                  const isLow = available < 5 && available > 0;
                  const isOut = available <= 0;
                  const id = `${item.productId}-${item.warehouseId}`;

                  return (
                    <TableRow key={id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Package className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.product.name}</p>
                            <p className="text-xs font-mono text-slate-500">{item.product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.warehouse.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${reliability > 0.9 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${reliability * 100}%` }} />
                             </div>
                             <span className="text-[10px] font-bold text-slate-400">{Math.round(reliability * 100)}% Trust</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-400">{item.totalQty}</TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium">
                        {item.reservedQty > 0 ? (
                           <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50">
                             {item.reservedQty}
                           </Badge>
                        ) : '0'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-2">
                            {isOut ? (
                              <Badge variant="destructive" className="animate-pulse">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1">
                                <AlertTriangle className="w-3 h-3" /> {available}
                              </Badge>
                            ) : (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{available}</span>
                            )}
                          </div>
                          {confidenceBuffer > 0 && (
                            <span className="text-[9px] font-mono text-red-500 font-bold">-{confidenceBuffer} SHADOW BUFFER</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 gap-1 text-slate-500"
                              onClick={() => handleReportDiscrepancy(item.warehouseId)}
                            >
                              Report Error
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleMarkSuccess(item.warehouseId)}
                            >
                              Mark Success
                            </Button>
                            <Button 
                              size="sm" 
                              className="h-8 gap-1"
                              disabled={refilling === id}
                              onClick={() => handleRefill(item.productId, item.warehouseId, 50)}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Refill 50
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">System Health</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">Operational</div>
             <p className="text-xs text-slate-500 mt-1">Inventory lock engine is active</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Total SKU Count</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{data ? [...new Set(data.map((i: any) => i.productId))].length : 0}</div>
             <p className="text-xs text-slate-500 mt-1">Unique products in catalog</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Active Reservations</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{data?.reduce((sum: number, i: any) => sum + i.reservedQty, 0) || 0}</div>
             <p className="text-xs text-slate-500 mt-1">Global items currently locked</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
