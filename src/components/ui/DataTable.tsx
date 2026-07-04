/**
 * GemGym — DataTable Component
 *
 * Reusable table with:
 * - Sortable columns
 * - Client-side search filtering
 * - Pagination controls
 * - Loading skeleton state
 * - Empty state
 * - Row selection (optional)
 */

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { Button } from "./Button";

export interface Column<T> {
  /** Unique key matching a property of T or a custom key */
  key: string;
  /** Column header label */
  header: string;
  /** Render function. Falls back to String(row[key]) */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Whether this column can be sorted */
  sortable?: boolean;
  /** Column header className */
  headerClassName?: string;
  /** Cell className */
  cellClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Property used as the React key for each row */
  rowKey: keyof T;
  isLoading?: boolean;
  /** Placeholder to show when data is empty */
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  /** Show a search input above the table */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Server-side pagination — set total for paginated data */
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  /** Right-side action slot above the table */
  actions?: React.ReactNode;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

/** Skeleton rows for loading state */
function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-[var(--color-border-subtle)]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="skeleton h-4 w-full max-w-[160px]" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  isLoading = false,
  emptyMessage = "No records found",
  emptyIcon,
  searchable = false,
  searchPlaceholder = "Search...",
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  actions,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey]       = useState<string | null>(null);
  const [sortDir, setSortDir]       = useState<SortDirection>(null);
  const [localSearch, setLocalSearch] = useState("");

  /* ── Client-side sort ── */
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const result = av! < bv! ? -1 : 1;
      return sortDir === "asc" ? result : -result;
    });
  }, [data, sortKey, sortDir]);

  /* ── Client-side search (when onSearch not provided) ── */
  const displayData = useMemo(() => {
    if (onSearch || !localSearch) return sortedData;
    const q = localSearch.toLowerCase();
    return sortedData.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(q)
      )
    );
  }, [sortedData, localSearch, onSearch]);

  const totalPages = total ? Math.ceil(total / pageSize) : Math.ceil(displayData.length / pageSize);
  const paginatedData = total ? displayData : displayData.slice((page - 1) * pageSize, page * pageSize);

  /* ── Sort handler ── */
  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  /* ── Sort icon ── */
  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortKey !== columnKey || !sortDir) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-[oklch(0.77_0.19_270)]" />
      : <ChevronDown size={12} className="text-[oklch(0.77_0.19_270)]" />;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      {(searchable || actions) && (
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="flex-1 max-w-xs">
              <Input
                placeholder={searchPlaceholder}
                leftIcon={<Search size={14} />}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  onSearch?.(e.target.value);
                }}
              />
            </div>
          )}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-bg-card)]">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(col.headerClassName, col.sortable && "cursor-pointer select-none hover:text-[var(--color-text-secondary)]")}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && <SortIcon columnKey={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} columns={columns.length} />
                  ))
                : paginatedData.length === 0
                  ? (
                    <tr>
                      <td colSpan={columns.length} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                          {emptyIcon && <span className="text-4xl opacity-40">{emptyIcon}</span>}
                          <p className="text-sm">{emptyMessage}</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : paginatedData.map((row, index) => (
                    <tr key={String(row[rowKey])}>
                      {columns.map((col) => (
                        <td key={col.key} className={col.cellClassName}>
                          {col.render
                            ? col.render(row[col.key], row, index)
                            : String(row[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total ?? displayData.length)} of {total ?? displayData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 font-medium text-[var(--color-text-primary)]">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
