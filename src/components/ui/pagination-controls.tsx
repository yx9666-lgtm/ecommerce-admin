"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationToken = number | "...";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
}

function getPageTokens(page: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: PaginationToken[] = [1];
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);

  if (page <= 3) {
    start = 2;
    end = 4;
  } else if (page >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  if (start > 2) tokens.push("...");
  for (let p = start; p <= end; p++) tokens.push(p);
  if (end < totalPages - 1) tokens.push("...");
  tokens.push(totalPages);
  return tokens;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel = "条",
  prevLabel = "上一页",
  nextLabel = "下一页",
  className,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const tokens = getPageTokens(safePage, safeTotalPages);

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-sm text-muted-foreground">
        {typeof totalItems === "number" ? `共 ${totalItems} ${itemLabel}，` : ""}
        第 {safePage}/{safeTotalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          {prevLabel}
        </Button>
        {tokens.map((token, index) =>
          token === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={token}
              variant={token === safePage ? "default" : "outline"}
              size="sm"
              className="min-w-8 px-2"
              onClick={() => onPageChange(token)}
            >
              {token}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
