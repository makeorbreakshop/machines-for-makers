import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageWrapperProps {
  children: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function AdminPageWrapper({
  children,
  title,
  description,
  action,
  className,
  fullWidth = false
}: AdminPageWrapperProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Consistent page padding using Tailwind spacing system */}
      <div className={cn(
        "px-4 sm:px-6 lg:px-8 py-6",
        !fullWidth && "max-w-7xl mx-auto w-full"
      )}>
        {/* Standardized header with consistent spacing */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-50 sm:truncate sm:text-3xl sm:tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>

        {/* Main content area with consistent spacing */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Optional: Specialized wrapper for full-height pages (like price tracker)
export function AdminFullHeightWrapper({
  children,
  title,
  description,
  action,
  className
}: AdminPageWrapperProps) {
  return (
    <AdminPageWrapper
      title={title}
      description={description}
      action={action}
      className={cn("h-full", className)}
      fullWidth
    >
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </AdminPageWrapper>
  );
}