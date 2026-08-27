import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExecutionAnalystOptions } from '@/hooks/useExecutionAnalyst';
import type { PipelineTask } from '@/hooks/usePipeline';

interface ExecutionAnalystKPICardsProps {
  tasks: PipelineTask[];
  onSelectAnalyst?: (analystInitials: string) => void;
  selectedAnalyst?: string;
}

function parseSingleRevenue(valStr: string): number {
  if (!valStr) return 0;
  const s = valStr.trim().replace(/[$,]/g, '').toUpperCase();
  const numMatch = s.match(/([0-9.]+)/);
  if (!numMatch) return 0;
  const num = parseFloat(numMatch[1]);
  if (isNaN(num)) return 0;

  if (s.includes('B')) {
    return num * 1_000_000;
  }
  if (s.includes('M')) {
    return num * 1_000;
  }
  if (s.includes('K')) {
    return num;
  }

  return num;
}

function parseRevenueNumeric(rev: string | null | undefined): number {
  if (!rev) return 0;
  const trimmed = rev.trim();
  if (!trimmed) return 0;

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const val1 = parseSingleRevenue(parts[0]);
      const val2 = parseSingleRevenue(parts[1]);
      if (val1 > 0 && val2 > 0) {
        return (val1 + val2) / 2;
      }
      return val1 || val2 || 0;
    }
  }

  return parseSingleRevenue(trimmed);
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount > 0) {
    return `$${amount.toLocaleString()}K`;
  }
  return `$0`;
}

export default function ExecutionAnalystKPICards({
  tasks,
  onSelectAnalyst,
  selectedAnalyst,
}: ExecutionAnalystKPICardsProps) {
  const { options } = useExecutionAnalystOptions();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Aggregate stats per execution analyst
  const analystKPIs = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        initials: string;
        name: string;
        totalCompany: number;
        totalRevenue: number;
      }
    >();

    // 1. Seed with database analysts
    for (const opt of options) {
      const init = opt.initials.toUpperCase();
      if (!statsMap.has(init)) {
        statsMap.set(init, {
          initials: init,
          name: opt.name,
          totalCompany: 0,
          totalRevenue: 0,
        });
      }
    }

    // 2. Calculate Company Count & Revenue based on the Company by the Execution Analysts
    if (tasks && Array.isArray(tasks)) {
      for (const t of tasks) {
        if (!t.execution_analyst) continue;
        const rawInit = t.execution_analyst.trim().toUpperCase();
        if (!rawInit) continue;

        let entry = statsMap.get(rawInit);
        if (!entry) {
          entry = {
            initials: rawInit,
            name: rawInit,
            totalCompany: 0,
            totalRevenue: 0,
          };
          statsMap.set(rawInit, entry);
        }

        entry.totalCompany += 1;
        entry.totalRevenue += parseRevenueNumeric(t.revenue);
      }
    }

    const allList = Array.from(statsMap.values());

    // Filter to analysts with companies or show top active ones
    const activeList = allList.filter(a => a.totalCompany > 0);
    const list = activeList.length > 0 ? activeList : allList;

    // Sort by revenue descending, then company count descending
    list.sort((a, b) => {
      return b.totalRevenue - a.totalRevenue || b.totalCompany - a.totalCompany || a.name.localeCompare(b.name);
    });

    return list;
  }, [tasks, options]);

  // Find max revenue for relative progress bar
  const maxRevenue = useMemo(() => {
    const max = Math.max(...analystKPIs.map((a) => a.totalRevenue), 0);
    return max > 0 ? max : 1;
  }, [analystKPIs]);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll, analystKPIs]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 260;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 350);
  };

  if (analystKPIs.length === 0) {
    return null;
  }

  const selectedUpper = (selectedAnalyst || '').toUpperCase().trim();

  return (
    <div className="relative flex items-center w-full group">
      {/* Left Arrow Button */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll('left')}
          className="absolute left-0 z-20 h-8 w-8 rounded-full shadow-md bg-background/95 hover:bg-background border-border/80 -translate-x-2.5 text-foreground"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Cards Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scrollbar-none py-1 px-1 w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        {analystKPIs.map((analyst) => {
          const revPercent = Math.min(Math.round((analyst.totalRevenue / maxRevenue) * 100), 100);
          const isSelected = selectedUpper === analyst.initials.toUpperCase();

          return (
            <div
              key={analyst.initials}
              onClick={() => onSelectAnalyst && onSelectAnalyst(isSelected ? 'all' : analyst.initials)}
              className={`flex flex-col justify-between py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-lg border transition-all duration-200 shrink-0 min-w-[160px] sm:min-w-[190px] max-w-[220px] gap-2 cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm scale-[1.01]'
                  : 'bg-card border-border/90 hover:border-primary/50 hover:bg-muted/40 shadow-xs'
              }`}
            >
              {/* 1. Name & Avatar */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-5 w-5 shrink-0 ring-1 ring-blue-200 dark:ring-blue-800">
                    <AvatarFallback className="text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200">
                      {analyst.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-foreground text-xs leading-snug truncate">
                    {analyst.name && analyst.name !== analyst.initials ? analyst.name : analyst.initials}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-1.5 py-0.2 rounded-full shrink-0">
                    Active
                  </span>
                )}
              </div>

              {/* 2. Company Count */}
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1 text-[11px]">
                  <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>Company</span>
                </span>
                <span className="font-bold text-foreground tabular-nums text-xs">{analyst.totalCompany}</span>
              </div>

              {/* 3. Revenue (Progress bar) */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Revenue</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
                    {formatCurrencyShort(analyst.totalRevenue)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(revPercent, analyst.totalRevenue > 0 ? 8 : 0)}%` }}
                    title={`Revenue: ${formatCurrencyShort(analyst.totalRevenue)} (${revPercent}%)`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Arrow Button */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll('right')}
          className="absolute right-0 z-20 h-8 w-8 rounded-full shadow-md bg-background/95 hover:bg-background border-border/80 translate-x-2.5 text-foreground"
          aria-label="Scroll Right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
