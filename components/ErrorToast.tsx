import { AlertCircle } from "lucide-react";
import { ApiError } from "@/lib/schemas";

export function ErrorToast({ error }: { error: ApiError }) {
  if (!error) return null;

  return (
    <div className="rounded-lg bg-red-50 p-4 border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-2 dark:bg-red-950/30 dark:border-red-900">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error.message}
          </p>
          <p className="mt-3 text-sm md:ml-6 md:mt-0">
            <span className="whitespace-nowrap font-medium text-red-700/70 dark:text-red-400/70 text-xs uppercase tracking-wider">
              {error.error.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
