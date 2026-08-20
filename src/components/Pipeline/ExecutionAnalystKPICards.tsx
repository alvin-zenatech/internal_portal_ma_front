import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { type PipelineTask } from '@/hooks/usePipeline';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExecutionAnalystOptions, DEFAULT_EXECUTION_ANALYSTS } from './ExecutionAnalystSelect';

interface ExecutionAnalystKPICardsProps {
  tasks: PipelineTask[];
  onSelectAnalyst?: (initials: string) => void;
  selectedAnalyst?: string;
}

// Utility to parse revenue string into numeric value (in '000s)
export function parseRevenueNumeric(rev: string | null | undefined): number {
  if (!rev) return 0;
  const clean = rev.trim().toLowerCase().replace(/[$,]/g, '');
  if (!clean) return 0;

  if (clean.endsWith('b')) {
    const num = parseFloat(clean.replace('b', ''));
    return isNaN(num) ? 0 : num * 1_000_000;
  }
  if (clean.endsWith('m')) {
    const num = parseFloat(clean.replace('m', ''));
    return isNaN(num) ? 0 : num * 1_000;
  }
  if (clean.endsWith('k')) {
    const num = parseFloat(clean.replace('k', ''));
    return isNaN(num) ? 0 : num;
  }

  const matches = clean.match(/\d+(\.\d+)?/g);
  if (!matches) return 0;
  const parsed = parseFloat(matches[0]);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCurrencyShort(amount: number): string {
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

    // 1. Seed with default analysts (JH, EH, AM, NS)
    for (const init of DEFAULT_EXECUTION_ANALYSTS) {
      const opt = options.find((o) => o.initials.toUpperCase() === init);
      statsMap.set(init, {
        initials: init,
        name: opt ? opt.name : init,
        totalCompany: 0,
        totalRevenue: 0,
      });
    }

    // 2. Seed with other options
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

    // 3. Calculate Company Count & Revenue based on the Company by the Execution Analysts
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

    // Always include default execution analysts (JH, EH, AM, NS), plus any others that have companies assigned
    const list = Array.from(statsMap.values()).filter(
      (a) => DEFAULT_EXECUTION_ANALYSTS.includes(a.initials) || a.totalCompany > 0
    );

    // Sort with default order (JH, EH, AM, NS) prioritized
    list.sort((a, b) => {
      const idxA = DEFAULT_EXECUTION_ANALYSTS.indexOf(a.initials);
      const idxB = DEFAULT_EXECUTION_ANALYSTS.indexOf(b.initials);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.totalRevenue - a.totalRevenue || b.totalCompany - a.totalCompany;
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
        className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1.5 px-1 w-full"
        style={{ scrollBehavior: 'smooth' }}
      >
        {analystKPIs.map((analyst) => {
          const revPercent = Math.min(Math.round((analyst.totalRevenue / maxRevenue) * 100), 100);
          const isSelected = selectedAnalyst === analyst.initials;

          return (
            <div
              key={analyst.initials}
              onClick={() => onSelectAnalyst && onSelectAnalyst(analyst.initials)}
              className={`flex flex-col justify-between py-3.5 px-4 rounded-xl border bg-card transition-all duration-200 shrink-0 min-w-[210px] max-w-[250px] gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-md'
                  : 'border-border/90 hover:border-border hover:bg-muted/40 shadow-xs'
              }`}
            >
              {/* 1. Name & Avatar */}
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-6 w-6 shrink-0 ring-1 ring-blue-200 dark:ring-blue-800">
                  <AvatarFallback className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200">
                    {analyst.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground text-sm leading-snug truncate">
                  {analyst.name && analyst.name !== analyst.initials ? analyst.name : analyst.initials}
                </span>
              </div>

              {/* 2. Company Count */}
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Company</span>
                </span>
                <span className="font-bold text-foreground tabular-nums text-sm">{analyst.totalCompany}</span>
              </div>

              {/* 3. Revenue (Progress bar) */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Revenue</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                    {formatCurrencyShort(analyst.totalRevenue)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
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
