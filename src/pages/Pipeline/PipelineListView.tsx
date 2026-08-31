const getCountryFullName = (codeOrName: string): string => {
  const clean = codeOrName.trim().toUpperCase();
  const iso2 = clean === "USA" ? "US" : (clean === "UK" ? "GB" : clean);
  try {
    if (iso2.length === 2) {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const name = regionNames.of(iso2);
      if (name) return name;
    }
  } catch {}
  return codeOrName;
};

import React, { useState, useDeferredValue } from "react";
import { cn } from "@/lib/utils";
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type SortingState, type ColumnFiltersState, getFacetedUniqueValues
} from "@tanstack/react-table";
import { type PipelineTask, useDeleteTask, usePriorities, useAnalysts } from "@/hooks/usePipeline";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Filter, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPriorityColors } from "@/lib/utils";
import { useExecutionAnalystOptions } from "@/hooks/useExecutionAnalyst";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  return parts.map(p => p.charAt(0)).join('').toUpperCase();
};

function formatLocation(task: { state_name?: string | null, state_code?: string | null, country_name?: string | null, country_code?: string | null }): string {
  const state = (task.state_name || task.state_code || "").trim();
  const rawCode = (task.country_code || task.country_name || "").trim().toUpperCase();
  // ISO3 for USA ("USA"), ISO2 for all other countries ("CA", "AU", "DE", "JP", etc.)
  const country = (rawCode === "US" || rawCode === "USA" || rawCode === "UNITED STATES") 
    ? "USA" 
    : (task.country_code || rawCode);
  
  if (state && country) return `${state}, ${country}`;
  return state || country || "-";
}


function FollowUpDateCell({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-muted-foreground">-</span>;
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  let tone = "text-muted-foreground";
  if (diffDays < 0) tone = "text-red-600 dark:text-red-400 font-medium";
  else if (diffDays <= 1) tone = "text-amber-600 dark:text-amber-400 font-medium";

  return (
    <span className={tone}>
      {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
    </span>
  );
}

function ColumnHeader({ column, title, customOptions }: { column: any, title: string, customOptions?: { label: string, value: string }[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueValues = React.useMemo(() => {
    return Array.from(column.getFacetedUniqueValues().keys())
      .filter(Boolean)
      .sort() as string[];
  }, [column.getFacetedUniqueValues()]);

  const isLocation = title === "Country / Province" || title === "State / Country" || column.id === "location";

  // For location column: extract unique countries with full names and states
  const { countries, states } = React.useMemo(() => {
    if (!isLocation) return { countries: [], states: [] };
    const countryMap = new Map<string, { code: string, fullName: string }>();
    const stateList: string[] = [];

    uniqueValues.forEach(val => {
      stateList.push(val);
      let cCode = val.trim();
      if (val.includes(",")) {
        const parts = val.split(",");
        cCode = parts[parts.length - 1].trim();
      }
      if (cCode && !countryMap.has(cCode)) {
        const fullName = getCountryFullName(cCode);
        countryMap.set(cCode, { code: cCode, fullName });
      }
    });

    const countryList = Array.from(countryMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));

    return {
      countries: countryList,
      states: stateList.sort()
    };
  }, [isLocation, uniqueValues]);

  const isDropdown = (uniqueValues.length > 0 && uniqueValues.length <= 300) || customOptions !== undefined || isLocation;
  const filterArray = Array.isArray(column.getFilterValue()) ? column.getFilterValue() as string[] : [];
  
  const toggleOption = (val: string) => {
    if (filterArray.includes(val)) {
      const newFilters = filterArray.filter(v => v !== val);
      column.setFilterValue(newFilters.length ? newFilters : undefined);
    } else {
      column.setFilterValue([...filterArray, val]);
    }
  };

  const renderOptions = customOptions 
    ? customOptions 
    : uniqueValues.map(val => ({ label: val, value: val }));

  const filteredOptions = renderOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredCountries = countries.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Active selected countries
  const selectedCountryCodes = filterArray.filter(f => countries.some(c => c.code === f));

  // If one or more countries are checked, only show provinces belonging to those countries
  const filteredStates = states.filter(s => {
    if (selectedCountryCodes.length > 0) {
      const sLower = s.toLowerCase();
      const belongsToSelectedCountry = selectedCountryCodes.some(cCode => {
        const codeLower = cCode.toLowerCase();
        return sLower.endsWith(`, ${codeLower}`) || sLower === codeLower;
      });
      if (!belongsToSelectedCountry) return false;
    }
    return s.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const isLocationColumn = title === "Country / Province" || title === "State / Country" || column.id === "location";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 group whitespace-nowrap w-full min-w-0 px-1",
        isLocationColumn ? "justify-center text-center" : "justify-start text-left"
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-1 h-7 min-w-0 flex-1 px-1.5 text-xs font-medium overflow-hidden",
          isLocationColumn ? "justify-center" : "justify-start"
        )}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span className="truncate">{title}</span>
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100 shrink-0" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-5 shrink-0">
            <Filter className={`h-3 w-3 ${filterArray.length > 0 || column.getFilterValue() ? "text-primary opacity-100" : "text-muted-foreground opacity-50 group-hover:opacity-100"}`} />
          </Button>
        </PopoverTrigger>
                <PopoverContent className={isLocation ? "w-[500px] p-3" : "w-56 p-2"} align="start">
          {isDropdown ? (
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={isLocation ? "Search countries or provinces..." : `Search ${title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/30"
                />
              </div>

              {isLocation ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Left Column: Countries */}
                  <div className="flex flex-col border rounded-md bg-card overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/60 border-b flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        Countries
                      </span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {filteredCountries.length}
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-2 space-y-1.5">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map(c => (
                          <div key={`country-${c.code}`} className="flex items-center space-x-2 py-0.5">
                            <Checkbox 
                              id={`filter-country-${c.code}`} 
                              checked={filterArray.includes(c.code)} 
                              onCheckedChange={() => toggleOption(c.code)} 
                            />
                            <Label htmlFor={`filter-country-${c.code}`} className="text-xs font-medium cursor-pointer leading-tight flex-1 truncate" title={c.fullName}>
                              {c.fullName} <span className="text-[10px] text-muted-foreground font-normal">({c.code})</span>
                            </Label>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-4">No countries</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Provinces */}
                  <div className="flex flex-col border rounded-md bg-card overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/60 border-b flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        Provinces
                      </span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {filteredStates.length}
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-2 space-y-1.5">
                      {filteredStates.length > 0 ? (
                        filteredStates.map(stateVal => (
                          <div key={`state-${stateVal}`} className="flex items-center space-x-2 py-0.5">
                            <Checkbox 
                              id={`filter-state-${stateVal}`} 
                              checked={filterArray.includes(stateVal)} 
                              onCheckedChange={() => toggleOption(stateVal)} 
                            />
                            <Label htmlFor={`filter-state-${stateVal}`} className="text-xs font-normal cursor-pointer leading-tight flex-1 truncate" title={stateVal}>
                              {stateVal}
                            </Label>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-4">No provinces</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {filteredOptions.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`filter-${title}-${opt.value}`} 
                        checked={filterArray.includes(opt.value)} 
                        onCheckedChange={() => toggleOption(opt.value)} 
                      />
                      <Label htmlFor={`filter-${title}-${opt.value}`} className="text-sm font-normal cursor-pointer leading-none flex-1">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {filterArray.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-1.5 h-7 text-xs text-muted-foreground hover:text-foreground border-t pt-1" onClick={() => column.setFilterValue(undefined)}>
                  Clear filters ({filterArray.length})
                </Button>
              )}
            </div>
          ) : (
            <Input
              placeholder={`Filter ${title}...`}
              value={(column.getFilterValue() ?? "") as string}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="h-8 text-sm"
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const PipelineListView = React.memo(function PipelineListView({ 
  tasks, 
  onTaskClick,
  onEdit, 
  defaultSorting = [],
  globalFilter,
  onGlobalFilterChange,
  hideSearchBar
}: {
  tasks: PipelineTask[],
  onTaskClick: (task: PipelineTask) => void,
  onEdit: (task: PipelineTask) => void,
  defaultSorting?: SortingState,
  globalFilter?: string,
  onGlobalFilterChange?: (value: string) => void,
  hideSearchBar?: boolean
}) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting || []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
  const actualGlobalFilter = globalFilter !== undefined ? globalFilter : internalGlobalFilter;
  const setActualGlobalFilter = onGlobalFilterChange || setInternalGlobalFilter;
  const deferredGlobalFilter = useDeferredValue(actualGlobalFilter);
  const [visibleCount, setVisibleCount] = useState(50);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const { mutate: removeTask } = useDeleteTask();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const { options: executionAnalystOptions } = useExecutionAnalystOptions();
  const analystNameMap = React.useMemo(() => {
    return new Map<string, string>(executionAnalystOptions.map((o) => [o.initials.toUpperCase(), o.name]));
  }, [executionAnalystOptions]);

  const { data: analysts } = useAnalysts();
  const analystOptions = React.useMemo(() => {
    return (analysts || [])
      .filter(a => a.full_name)
      .map(a => ({ label: a.full_name!, value: a.full_name! }));
  }, [analysts]);

  const { data: priorities } = usePriorities();
  const priorityOptions = React.useMemo(() => {
    return (priorities || [])
      .filter(p => p.name)
      .map(p => ({ label: p.name, value: p.name }));
  }, [priorities]);

  const yesNoOptions = React.useMemo(() => [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" }
  ], []);

  const priorityOrderMap = React.useMemo(() => {
    const map = new Map<string, number>();
    (priorities || []).forEach((p, idx) => {
      const order = typeof p.sort_order === "number" ? p.sort_order : idx;
      if (p.name) {
        map.set(p.name.trim().toLowerCase(), order);
      }
      if (p.id !== undefined && p.id !== null) {
        map.set(String(p.id), order);
      }
    });
    return map;
  }, [priorities]);

  const columns = React.useMemo(() => [
    { 
      accessorKey: "company_name", 
      header: ({ column }) => <ColumnHeader column={column} title="Company Name" />, 
      size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{row.original.company_name}</span>
          {row.original.is_dnc && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold shrink-0">DNC</Badge>
          )}
        </div>
      )
    },
    { 
      accessorKey: "priority_name", 
      header: ({ column }) => <ColumnHeader column={column} title="Priority" customOptions={priorityOptions} />,
      size: 160,
      cell: ({ row }) => {
        const priority = row.original.priority_name;
        if (!priority) return <span className="text-muted-foreground">-</span>;
        const colors = getPriorityColors(row.original);
        return (
          <div className="flex items-center justify-start">
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap"
              style={colors.badgeStyle}
            >
              {priority}
            </span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const id1 = rowA.original.priority_id;
        const id2 = rowB.original.priority_id;
        const p1 = (rowA.original.priority_name || "").trim().toLowerCase();
        const p2 = (rowB.original.priority_name || "").trim().toLowerCase();

        const order1 = (id1 !== undefined && id1 !== null && priorityOrderMap.has(String(id1)))
          ? priorityOrderMap.get(String(id1))!
          : (priorityOrderMap.has(p1) ? priorityOrderMap.get(p1)! : -1);

        const order2 = (id2 !== undefined && id2 !== null && priorityOrderMap.has(String(id2)))
          ? priorityOrderMap.get(String(id2))!
          : (priorityOrderMap.has(p2) ? priorityOrderMap.get(p2)! : -1);

        if (order1 !== -1 && order2 !== -1) return order1 - order2;
        if (order1 !== -1) return -1;
        if (order2 !== -1) return 1;
        return p1.localeCompare(p2);
      }
    },
    { 
      accessorKey: "latest_note", 
      header: () => <div className="px-2 font-medium text-sm text-foreground">Note</div>,
      size: 250,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const note = row.original.latest_note || "-";
        return <span className="text-muted-foreground truncate block w-full" title={note}>{note}</span>;
      }
    },
    { 
      id: "location",
      accessorFn: (row: PipelineTask) => {
        const val = formatLocation(row);
        return val === "-" ? "" : val;
      },
      header: ({ column }: { column: any }) => <ColumnHeader column={column} title="Country / Province" />,
      size: 190,
      cell: ({ row }: { row: any }) => {
        const display = formatLocation(row.original);
        return <span className="truncate block w-full text-center" title={display !== "-" ? display : undefined}>{display}</span>;
      }
    },
    { 
      accessorKey: "analyst_name", 
      header: ({ column }: { column: any }) => <ColumnHeader column={column} title="Analyst" customOptions={analystOptions} />,
      cell: ({ row }: { row: { original: PipelineTask } }) => {
        const initials = getInitials(row.original.analyst_name || '');
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src="" />
              <AvatarFallback className="text-[9px] bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs">{row.original.analyst_name}</span>
          </div>
        );
      },
      size: 160
    },
    { 
      accessorKey: "execution_analyst", 
      header: ({ column }: { column: any }) => (
        <ColumnHeader 
          column={column} 
          title="Execution Analysts" 
          customOptions={executionAnalystOptions.map(o => ({ label: o.name, value: o.initials.toUpperCase() }))}
        />
      ),
      cell: ({ row }: { row: { original: PipelineTask } }) => {
        const val = row.original.execution_analyst;
        if (!val) return <span className="text-muted-foreground">-</span>;
        const name = analystNameMap.get(val.toUpperCase()) || val;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 font-bold">
                {val}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{name}</span>
          </div>
        );
      },
      size: 210
    },
    { 
      accessorKey: "revenue", 
      header: ({ column }) => <ColumnHeader column={column} title="Revenue" />,
      size: 160,
      sortingFn: (rowA, rowB) => {
        const parseRevenue = (rev: string | null) => {
          if (!rev) return 0;
          const normalized = rev.replace(/,/g, "");
          const matches = normalized.match(/\d+/g);
          if (!matches) return 0;
          return Math.max(...matches.map(m => parseInt(m, 10)));
        };
        const revA = parseRevenue(rowA.original.revenue);
        const revB = parseRevenue(rowB.original.revenue);
        return revA - revB;
      }
    },
    { accessorKey: "team_size", header: ({ column }) => <ColumnHeader column={column} title="Team Size" />, size: 130, minSize: 110, maxSize: 150 },
    {
      accessorKey: "follow_up_date" as const,
      header: ({ column }: { column: any }) => <ColumnHeader column={column} title="Follow-up Date" />,
      size: 180,
      cell: ({ row }: { row: { original: PipelineTask } }) => (
        <FollowUpDateCell dateStr={row.original.follow_up_date} />
      ),
      sortingFn: (rowA: { original: PipelineTask }, rowB: { original: PipelineTask }) => {
        const a = rowA.original.follow_up_date || "";
        const b = rowB.original.follow_up_date || "";
        return a.localeCompare(b);
      },
    },
    { 
      accessorKey: "nda", 
      header: ({ column }) => <ColumnHeader column={column} title="NDA" customOptions={yesNoOptions} />, 
      size: 130, 
      minSize: 110, 
      maxSize: 160 
    },
    { 
      accessorKey: "p_and_l", 
      header: ({ column }) => <ColumnHeader column={column} title="P&L" customOptions={yesNoOptions} />, 
      size: 110, 
      minSize: 95, 
      maxSize: 140 
    }
  ], [onEdit, analystNameMap, priorityOrderMap, priorityOptions, analystOptions, yesNoOptions, executionAnalystOptions]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters, globalFilter: deferredGlobalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setActualGlobalFilter as any,
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const search = String(filterValue).toLowerCase().trim();
      if (!search) return true;

      // 1. Check all object values (strings, numbers)
      const matchesRaw = Object.values(row.original).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(search);
      });
      if (matchesRaw) return true;

      // 2. Check formatted Location string (e.g. "California, USA", "Alberta, CA")
      const loc = formatLocation(row.original);
      if (loc.toLowerCase().includes(search)) return true;

      // 3. Check Execution Analyst full name
      if (row.original.execution_analyst) {
        const eaName = analystNameMap.get(row.original.execution_analyst.toUpperCase());
        if (eaName && eaName.toLowerCase().includes(search)) return true;
      }

      return false;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
      multiSelect: (row: any, columnId: string, filterValue: any) => {
        if (!filterValue || filterValue.length === 0) return true;
        const val = String(row.getValue(columnId) || "").toLowerCase().trim();
        if (!val) return false;

        if (Array.isArray(filterValue)) {
          if (columnId === "location") {
            const selectedCountries = filterValue.filter((f: string) => !f.includes(",")).map((f: string) => f.toLowerCase().trim());
            const selectedProvinces = filterValue.filter((f: string) => f.includes(",")).map((f: string) => f.toLowerCase().trim());

            // 1. If matching any explicitly selected province
            if (selectedProvinces.some((p: string) => val === p || val.startsWith(`${p},`) || val.endsWith(`, ${p}`) || val.includes(p))) {
              return true;
            }

            // 2. For selected countries that do NOT have specific provinces selected, match the entire country
            const countriesWithoutSpecificProvinces = selectedCountries.filter((c: string) =>
              !selectedProvinces.some((p: string) => p.endsWith(`, ${c}`))
            );

            return countriesWithoutSpecificProvinces.some((c: string) => val === c || val.endsWith(`, ${c}`));
          }

          return filterValue.some(f => {
            const filter = String(f).toLowerCase().trim();
            if (val === filter) return true;
            if (val.endsWith(`, ${filter}`)) return true;
            if (val.startsWith(`${filter},`)) return true;
            if (val.includes(filter)) return true;
            return false;
          });
        }
        return val.includes(String(filterValue).toLowerCase().trim());
      }
    },
    defaultColumn: { filterFn: 'multiSelect' as any },
  });

  const allRows = table.getRowModel().rows;
  
  React.useEffect(() => {
    setVisibleCount(50);
  }, [deferredGlobalFilter, columnFilters, sorting]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 350) {
      if (visibleCount < allRows.length) {
        setVisibleCount(prev => Math.min(prev + 50, allRows.length));
      }
    }
  };

  const visibleRows = allRows.slice(0, visibleCount);

  return (
    <div className="h-full flex flex-col space-y-2.5 sm:space-y-3 p-2.5 sm:p-4 md:p-5 min-h-0 overflow-hidden">
      {(!hideSearchBar || (columnFilters.length > 0)) && (
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {!hideSearchBar && (
              <Input 
                placeholder="Search everything..." 
                value={actualGlobalFilter} 
                onChange={(event) => setActualGlobalFilter(event.target.value)} 
                className="w-48 sm:w-64 max-w-sm h-8.5 sm:h-9 text-xs sm:text-sm" 
              />
            )}

            {columnFilters.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {columnFilters.map((filter) => (
                  <Badge key={filter.id} variant="secondary" className="h-6 text-[11px] font-normal capitalize">
                    {filter.id.replace(/_/g, " ")}: {filter.value as string}
                  </Badge>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setColumnFilters([]);
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                  <X className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="rounded-md border bg-card flex-1 flex flex-col shadow-xs overflow-hidden h-full min-h-0">
        <div
          className="flex-1 min-h-0 overflow-auto relative"
          id="pipeline-list-scroll"
          ref={parentRef}
          onScroll={handleScroll}
        >
        <Table
          containerClassName="none"
          className="table-fixed w-full min-w-[1500px] text-xs"
          style={{ tableLayout: "fixed" }}
        >
          <TableHeader className="sticky top-0 z-10 shadow-xs bg-muted/90 backdrop-blur">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-muted/90 hover:bg-muted/90">
                {hg.headers.map(h => (
                  <TableHead
                    key={h.id}
                    className="bg-muted/90 h-8 py-1 px-2.5 sm:px-3 text-xs font-semibold whitespace-nowrap select-none overflow-hidden"
                    style={{
                      width: h.column.getSize(),
                      minWidth: h.column.getSize(),
                      maxWidth: h.column.getSize(),
                    }}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map(row => {
                return (
                  <TableRow 
                    key={row.id} 
                    className={cn(
                      "cursor-pointer transition-colors",
                      row.original.is_dnc 
                        ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border-l-2 border-l-red-500" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => onTaskClick(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-1.5 px-2.5 sm:px-3 text-xs whitespace-nowrap overflow-hidden text-ellipsis",
                          cell.column.id === "location" ? "text-center" : "text-left"
                        )}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs sm:text-sm text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
            {visibleCount < allRows.length && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-12 text-center text-muted-foreground text-xs">
                  Scroll to load more (showing {visibleRows.length} of {allRows.length})...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        <div className="bg-muted/20 border-t px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-muted-foreground font-medium shrink-0">
          Showing {visibleRows.length.toLocaleString()} of {allRows.length.toLocaleString()} companies{allRows.length !== tasks.length ? ` (filtered from ${tasks.length.toLocaleString()} total)` : ''}
        </div>
      </div>

      <ConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? All history and notes will be permanently lost."
        onConfirm={() => {
          if (taskToDelete) {
            removeTask(taskToDelete, { onSuccess: () => toast.success("Task deleted") });
            setTaskToDelete(null);
          }
        }}
      />
    </div>
  );
});

export default PipelineListView;
