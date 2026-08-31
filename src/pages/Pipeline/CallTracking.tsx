import { cn } from "@/lib/utils";
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

function formatCallLocation(stateProvince?: string | null, rawCountry?: string | null): string {
  const state = (stateProvince || "").trim();
  const rawC = (rawCountry || "").trim().toUpperCase();
  const country = (rawC === "US" || rawC === "USA" || rawC === "UNITED STATES")
    ? "USA"
    : (rawC === "CAN" || rawC === "CANADA" ? "CA" : (rawC === "AUS" || rawC === "AUSTRALIA" ? "AU" : (rawCountry || "").trim()));
  
  if (state && country) return `${state}, ${country}`;
  return state || country || "-";
}

import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import React, { useState, useDeferredValue, useRef, useEffect } from 'react';
import { useInfiniteCallTrackingSummary, useTableColumnOrder, useUpdateTableColumnOrder, type CallTrackingSummary, useAnalysts, useIndustries, usePreviewCallLog, useDeleteImportTask, fetchPreviewCallLogResult, type CallLogPreviewResponse } from '@/hooks/usePipeline';
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Filter, Upload, GripVertical, RotateCcw, Save, Plus, Search, FileSpreadsheet } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CallLogUploadQueuePanel from "@/components/Pipeline/CallLogUploadQueuePanel";
import { Input } from "@/components/ui/input";
import { type ColumnFiltersState, getFacetedUniqueValues } from "@tanstack/react-table";

import CallTrackingDetails from './CallTrackingDetails';
import CallLogImportPreviewModal from './CallLogImportPreviewModal';
import { formatYesNo, formatPhoneNumber } from "@/lib/utils";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr === '-') return '';
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [, m, d, yRaw] = slashMatch;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return dateStr;
};

function ColumnHeader({ 
  column, 
  title, 
  customOptions 
}: { 
  column: any; 
  title: string; 
  customOptions?: { label: string; value: string }[]; 
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueValues = React.useMemo(() => {
    if (customOptions && customOptions.length > 0) {
      return customOptions.map(o => o.value).sort((a, b) => a.localeCompare(b));
    }
    const fromData = Array.from(column.getFacetedUniqueValues().keys())
      .filter(Boolean) as string[];
    return fromData.sort((a, b) => a.localeCompare(b));
  }, [column.getFacetedUniqueValues(), customOptions]);

  const isLocation = title === "Country / Province" || title === "State / Country" || column.id === "location";

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

  const isDropdown = (uniqueValues.length > 0 && uniqueValues.length <= 300) || isLocation || (customOptions !== undefined && customOptions.length > 0);
  const filterArray = Array.isArray(column.getFilterValue()) ? column.getFilterValue() as string[] : [];

  const toggleOption = (val: string) => {
    if (filterArray.includes(val)) {
      const newFilters = filterArray.filter(v => v !== val);
      column.setFilterValue(newFilters.length ? newFilters : undefined);
    } else {
      column.setFilterValue([...filterArray, val]);
    }
  };

  const renderOptions = React.useMemo(() => {
    if (customOptions && customOptions.length > 0) {
      return customOptions;
    }
    return uniqueValues.map(val => ({ label: val, value: val }));
  }, [uniqueValues, customOptions]);

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
        "flex items-center gap-0.5 group whitespace-nowrap w-full min-w-0",
        isLocationColumn ? "justify-center text-center" : "justify-start text-left"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 -ml-1 transition-opacity" />
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-1 h-7 min-w-0 flex-1 px-1.5 text-xs font-medium",
          "overflow-hidden",
          isLocationColumn ? "justify-center" : "justify-start"
        )}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span className="truncate">{title}</span>
        <ArrowUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-5 shrink-0 -ml-1">
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

export default function CallTracking() {
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteCallTrackingSummary(deferredGlobalFilter);

  const summaries = React.useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((p) => p.items || []);
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.total ?? summaries.length;
  const { data: users } = useAnalysts();
  const { data: industries } = useIndustries();

  const analystCustomOptions = React.useMemo(() => {
    if (!users) return [];
    return users
      .filter(u => u.full_name)
      .map(u => ({ label: u.full_name!, value: u.full_name! }));
  }, [users]);

  const industryCustomOptions = React.useMemo(() => {
    if (!industries) return [];
    return industries
      .filter(i => i.name)
      .map(i => ({ label: i.name, value: i.name }));
  }, [industries]);

  const yesNoOptions = React.useMemo(() => [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" }
  ], []);

  // Automatically fetch remaining pages in the background so all filter options and records are loaded
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CallLogPreviewResponse | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const previewTaskId = searchParams.get("preview_task_id");

  useEffect(() => {
    if (previewTaskId) {
      toast.loading("Loading call log preview...", { id: "load-preview" });
      fetchPreviewCallLogResult(previewTaskId)
        .then((data) => {
          toast.dismiss("load-preview");
          setPreviewData(data);
          setPreviewOpen(true);
        })
        .catch((err) => {
          toast.dismiss("load-preview");
          toast.error(err?.message || "Failed to load preview for this job.");
        });
    }
  }, [previewTaskId]);

  const deleteTask = useDeleteImportTask();
  const previewCallLog = usePreviewCallLog();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      previewCallLog.mutate(file, {
        onSuccess: () => {
          toast.success(`Added '${file.name}' to the call log import queue.`);
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to parse call log file");
        }
      });
    }
    e.target.value = '';
  };


  const getAnalystDetails = React.useCallback((val: string | null) => {
    if (!val) return { name: '-', avatar: '?' };

    const getInitials = (str: string) => {
      const parts = str.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : str.substring(0, 2).toUpperCase();
    };

    const upperVal = val.toUpperCase();
    const valInitials = getInitials(val);

    if (!users) return { name: val, avatar: valInitials };

    let user = users.find(u => (u.full_name || '').toUpperCase() === upperVal);

    if (!user) {
      user = users.find(u => u.full_name ? getInitials(u.full_name) === upperVal : false);
    }

    if (user && user.full_name) {
      return { name: user.full_name, avatar: getInitials(user.full_name) };
    }

    return { name: val, avatar: valInitials };
  }, [users]);

  const getCallCount = React.useCallback((row: CallTrackingSummary) => {
    return row.call_count ?? 1;
  }, []);

  const getLatestCallDate = React.useCallback((row: CallTrackingSummary) => {
    const direct =
      row.date_of_call ||
      (row as any).call_date ||
      (row as any).latest_call_date ||
      (row as any).last_call_date ||
      (row as any).date ||
      (row as any).created_at;

    if (direct) {
      const formatted = formatDate(direct);
      if (formatted) return formatted;
    }
    return "-";
  }, []);

  const getCallNotes = React.useCallback((row: CallTrackingSummary) => {
    return row.notes || "-";
  }, []);

  const [sorting, setSorting] = useState<SortingState>([{ id: "date_of_call", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const columns = React.useMemo<ColumnDef<CallTrackingSummary>[]>(
    () => [

      {
        accessorKey: 'call_count',
        accessorFn: (row) => getCallCount(row),
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Calls</span>
            <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
          </Button>
        ),
        size: 55,
        minSize: 45,
        maxSize: 65,
        sortingFn: (rowA, rowB) => {
          const a = getCallCount(rowA.original);
          const b = getCallCount(rowB.original);
          return a - b;
        },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-medium tabular-nums pl-1">{getCallCount(row.original)}</span>
        )
      },
      {
        accessorKey: 'company_name',
        header: ({ column }) => <ColumnHeader column={column} title="Company Name" />,
        size: 240
      },
      {
        accessorKey: 'industry',
        header: ({ column }) => <ColumnHeader column={column} title="Industry" customOptions={industryCustomOptions} />,
        size: 180
      },
      {
        id: 'location',
        accessorFn: (row: CallTrackingSummary) => {
          const val = formatCallLocation(row.state_province, row.location);
          return val === "-" ? "" : val;
        },
        header: ({ column }) => <ColumnHeader column={column} title="Country / Province" />,
        size: 190,
        cell: ({ row }) => {
          const display = formatCallLocation(row.original.state_province, row.original.location);
          return <span className="truncate block w-full" title={display !== "-" ? display : undefined}>{display}</span>;
        }
      },
      {
        accessorKey: 'contact_name',
        header: ({ column }) => <ColumnHeader column={column} title="Contact Name" />,
        size: 180
      },
      {
        accessorKey: 'phone_number',
        header: ({ column }) => <ColumnHeader column={column} title="Phone Number" />,
        cell: ({ row }) => <span>{formatPhoneNumber(row.original.phone_number) || '-'}</span>,
        size: 160
      },

      {
        accessorKey: 'date_of_call',
        accessorFn: (row) => getLatestCallDate(row),
        header: ({ column }) => <ColumnHeader column={column} title="Date of Call" />,
        size: 160,
        sortingFn: (rowA, rowB) => {
          const valA = getLatestCallDate(rowA.original);
          const valB = getLatestCallDate(rowB.original);
          const timeA = valA && valA !== '-' ? new Date(valA).getTime() : 0;
          const timeB = valB && valB !== '-' ? new Date(valB).getTime() : 0;
          if (isNaN(timeA) && isNaN(timeB)) return 0;
          if (isNaN(timeA)) return -1;
          if (isNaN(timeB)) return 1;
          return timeA - timeB;
        },
        cell: ({ row }) => {
          const val = getLatestCallDate(row.original);
          return <span>{val && val !== '-' ? val : '-'}</span>;
        }
      },

      {
        accessorKey: 'kdm',
        accessorFn: (row) => formatYesNo(row.kdm),
        header: ({ column }) => <ColumnHeader column={column} title="KDM" customOptions={yesNoOptions} />,
        size: 130,
        minSize: 110,
        maxSize: 150,
        cell: ({ row }) => {
          const val = formatYesNo(row.original.kdm);
          return <span>{val || '-'}</span>;
        }
      },
      {
        accessorKey: 'picked_up',
        header: ({ column }) => <ColumnHeader column={column} title="Picked Up" customOptions={yesNoOptions} />,
        size: 130,
        cell: ({ row }) => <span>{formatYesNo(row.original.picked_up)}</span>
      },
      {
        accessorKey: 'current_status',
        accessorFn: (row) => row.current_status || row.outcome || '',
        header: ({ column }) => <ColumnHeader column={column} title="Outcome" />,
        size: 180,
        cell: ({ row }) => {
          const val = row.original.current_status || row.original.outcome;
          if (!val) return <span>-</span>;
          return <span>{val}</span>;
        }
      },
      {
        accessorKey: 'latest_analyst',
        accessorFn: (row: CallTrackingSummary) => {
          const details = getAnalystDetails(row.latest_analyst);
          return details.name !== '-' ? details.name : (row.latest_analyst || '');
        },
        header: ({ column }) => <ColumnHeader column={column} title="Analyst" customOptions={analystCustomOptions} />,
        size: 160,
        cell: ({ row }) => {
          const { name, avatar } = getAnalystDetails(row.original.latest_analyst);
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px] bg-slate-200 text-slate-700">{avatar}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">{name}</span>
            </div>
          );
        }
      },

      {
        accessorKey: 'call_length',
        header: ({ column }) => <ColumnHeader column={column} title="Call Length" />,
        size: 140
      },
      {
        accessorKey: 'notes',
        accessorFn: (row) => getCallNotes(row),
        header: ({ column }) => <ColumnHeader column={column} title="Notes" />,
        size: 260,
        cell: ({ row }) => {
          const val = getCallNotes(row.original);
          return (
            <span className="truncate block max-w-[260px]" title={val !== '-' ? val : undefined}>
              {val || '-'}
            </span>
          );
        }
      },
    ],
    [getAnalystDetails, getLatestCallDate, getCallNotes]
  );

  const defaultColumnOrder = React.useMemo(() => [
    'call_count',
    'company_name',
    'industry',
    'location',
    'contact_name',
    'phone_number',
    'date_of_call',
    'kdm',
    'picked_up',
    'current_status',
    'latest_analyst',
    'call_length',
    'notes'
  ], []);

  const { data: dbColumnSettings } = useTableColumnOrder('call-tracking');
  const updateColumnOrder = useUpdateTableColumnOrder();

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('call_tracking_column_order_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultColumnOrder;
  });

  useEffect(() => {
    if (dbColumnSettings?.column_order && Array.isArray(dbColumnSettings.column_order) && dbColumnSettings.column_order.length > 0) {
      const order = dbColumnSettings.column_order.includes('call_count')
        ? dbColumnSettings.column_order
        : ['call_count', ...dbColumnSettings.column_order];
      setColumnOrder(order);
    }
  }, [dbColumnSettings]);

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    try {
      localStorage.setItem('call_tracking_column_order_v2', JSON.stringify(newOrder));
    } catch {}
  };


  const handleExportCallTracking = () => {
    try {
      const dataToExport = table.getFilteredRowModel().rows.map(r => r.original);
      const columnMap: Record<string, ExportColumn<CallTrackingSummary>> = {
        call_count: { header: "Calls", accessor: (r) => getCallCount(r) },
        company_name: { header: "Company Name", accessor: (r) => r.company_name || "" },
        industry: { header: "Industry", accessor: (r) => r.industry || "" },
        location: { header: "Country / Province", accessor: (r) => {
          const val = formatCallLocation(r.state_province, r.location);
          return val === "-" ? "" : val;
        }},
        contact_name: { header: "Contact Name", accessor: (r) => r.contact_name || "" },
        phone_number: { header: "Phone Number", accessor: (r) => formatPhoneNumber(r.phone_number) || "" },
        date_of_call: { header: "Date of Call", accessor: (r) => getLatestCallDate(r) },
        kdm: { header: "KDM", accessor: (r) => formatYesNo(r.kdm) },
        picked_up: { header: "Picked Up", accessor: (r) => formatYesNo(r.picked_up) },
        current_status: { header: "Outcome", accessor: (r) => r.current_status || r.outcome || "" },
        latest_analyst: { header: "Analyst", accessor: (r) => getAnalystDetails(r.latest_analyst).name },
        call_length: { header: "Call Length", accessor: (r) => r.call_length || "" },
        notes: { header: "Notes", accessor: (r) => getCallNotes(r) },
      };

      const cols = table.getVisibleLeafColumns()
        .map(col => columnMap[col.id])
        .filter(Boolean);

      exportToCsv(dataToExport.length > 0 ? dataToExport : (summaries || []), cols, "call_tracking");
      toast.success("Call tracking exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export call tracking");
    }
  };

  const handleSaveForTeam = () => {
    updateColumnOrder.mutate({
      tableName: 'call-tracking',
      columnOrder
    });
  };

  const normalizeOrder = React.useCallback((order: string[]) => {
    const list = order.filter(id => defaultColumnOrder.includes(id));
    for (const id of defaultColumnOrder) {
      if (!list.includes(id)) {
        if (id === 'call_count') {
          list.unshift(id);
        } else {
          list.push(id);
        }
      }
    }
    return list;
  }, [defaultColumnOrder]);

  const isCustomOrder = React.useMemo(() => {
    const rawBaseline = dbColumnSettings?.column_order && Array.isArray(dbColumnSettings.column_order) && dbColumnSettings.column_order.length > 0
      ? dbColumnSettings.column_order
      : defaultColumnOrder;
    const savedBaseline = normalizeOrder(rawBaseline);
    const currentOrder = normalizeOrder(columnOrder);
    return JSON.stringify(currentOrder) !== JSON.stringify(savedBaseline);
  }, [columnOrder, dbColumnSettings, defaultColumnOrder, normalizeOrder]);

  const resetColumnOrder = () => {
    handleColumnOrderChange(defaultColumnOrder);
  };

  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const reorderColumns = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const currentOrder = columnOrder.length ? [...columnOrder] : [...defaultColumnOrder];

    const fromIndex = currentOrder.indexOf(draggedId);
    const toIndex = currentOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...currentOrder];
      updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, draggedId);
      handleColumnOrderChange(updated);
    }
  };

  const table = useReactTable({
    data: summaries || [],
    columns,
    state: { sorting, columnFilters, globalFilter: deferredGlobalFilter, columnOrder },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: (updater) => {
      const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater;
      handleColumnOrderChange(newOrder);
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const dateVal = getLatestCallDate(row.original) || '';
      const notesVal = getCallNotes(row.original) || '';
      return Object.values(row.original).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(search)
      ) || (dateVal !== '-' && dateVal.toLowerCase().includes(search))
        || (notesVal !== '-' && notesVal.toLowerCase().includes(search));
    },
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: {
      multiSelect: (row: any, columnId: string, filterValue: any) => {
        if (!filterValue || filterValue.length === 0) return true;
        const val = String(row.getValue(columnId) || "").toLowerCase().trim();

        if (Array.isArray(filterValue)) {
          if (columnId === "latest_analyst") {
            const raw = (row.original.latest_analyst || "").toLowerCase().trim();
            const fullName = getAnalystDetails(row.original.latest_analyst).name.toLowerCase().trim();
            return filterValue.some((f: string) => {
              const filter = String(f).toLowerCase().trim();
              if (filter === raw || filter === fullName) return true;
              if (fullName && fullName.includes(filter)) return true;
              if (filter && filter.includes(fullName)) return true;
              // Check initials of the filter against raw
              const parts = filter.split(/\s+/).filter(Boolean);
              if (parts.length >= 2) {
                const filterInitials = (parts[0][0] + parts[parts.length - 1][0]).toLowerCase();
                if (raw === filterInitials) return true;
              }
              return false;
            });
          }

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

  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 350) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading Call Tracking...</div>;
  }

  return (
    <div className="h-full flex flex-col w-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b bg-card shrink-0 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Call Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and review all client and prospect communication.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.xlsm,.csv"
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap" disabled={previewCallLog.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Call Log
          </Button>
          <Button onClick={() => setSelectedCompany('__NEW__')} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Add Call Log
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative bg-muted/20 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-6 space-y-4 min-h-0">
          <CallLogUploadQueuePanel
            onOpenPreview={(taskId) => {
              toast.loading("Loading preview...", { id: "load-preview" });
              fetchPreviewCallLogResult(taskId)
                .then((data) => {
                  toast.dismiss("load-preview");
                  setPreviewData(data);
                  setPreviewOpen(true);
                })
                .catch((err) => {
                  toast.dismiss("load-preview");
                  toast.error(err?.message || "Failed to load preview.");
                });
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <Input
                placeholder="Search call logs..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-64 max-w-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCallTracking}
                className="text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <a href="/templates/Call_Log_Template.xlsx" download="Call_Log_Template.xlsx">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Download Blank Template</span>
                </a>
              </Button>
              {isCustomOrder && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveForTeam}
                    disabled={updateColumnOrder.isPending}
                    className="text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary animate-in fade-in"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {updateColumnOrder.isPending ? "Saving..." : "Save as Team Default"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetColumnOrder}
                    className="text-xs text-muted-foreground hover:text-foreground h-9 animate-in fade-in"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset Columns
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 flex flex-col shadow-xs overflow-hidden min-h-[600px] h-[650px]">
            <div
              className="flex-1 min-h-0 overflow-auto relative"
              ref={parentRef}
              onScroll={handleScroll}
            >
              <Table
                containerClassName="none"
                className="table-fixed min-w-[1550px] w-full text-xs"
                style={{ tableLayout: "fixed" }}
              >
                <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          className={cn(
                            "bg-muted/50 whitespace-nowrap select-none h-8 py-1 px-2 text-xs font-semibold",
                            "overflow-hidden",
                            "transition-colors duration-150",
                            dragOverColumnId === h.column.id &&
                              "bg-primary/20 border-l-2 border-primary",
                            draggedColumnId === h.column.id && "opacity-30"
                          )}
                          style={{
                            width: h.column.getSize(),
                            minWidth: h.column.getSize(),
                            maxWidth: h.column.getSize(),
                          }}
                          draggable
                          onDragStart={(e) => {
                            setDraggedColumnId(h.column.id);
                            e.dataTransfer.setData('text/plain', h.column.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverColumnId !== h.column.id) {
                              setDragOverColumnId(h.column.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverColumnId === h.column.id) {
                              setDragOverColumnId(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('text/plain') || draggedColumnId;
                            if (draggedId) {
                              reorderColumns(draggedId, h.column.id);
                            }
                            setDraggedColumnId(null);
                            setDragOverColumnId(null);
                          }}
                          onDragEnd={() => {
                            setDraggedColumnId(null);
                            setDragOverColumnId(null);
                          }}
                        >
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {allRows.length ? (
                    allRows.map(row => {
                      return (
                        <TableRow
                          key={row.id}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCompany(row.original.normalized_company_name)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                "py-1.5 px-2 text-xs",
                                "whitespace-nowrap",
                                "overflow-hidden",
                                "text-ellipsis",
                                cell.column.id === "location"
                                  ? "text-center"
                                  : "text-left"
                              )}
                              style={{
                                width: cell.column.getSize(),
                                minWidth: cell.column.getSize(),
                                maxWidth: cell.column.getSize(),
                              }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                        No call logs found.
                      </TableCell>
                    </TableRow>
                  )}
                  {isFetchingNextPage && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-4 text-center text-muted-foreground">
                        <span className="text-xs text-primary font-medium animate-pulse">Loading more calls...</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="bg-muted/20 border-t px-4 py-2 text-sm text-muted-foreground font-medium">
              Showing {allRows.length.toLocaleString()} of {totalCount.toLocaleString()} companies
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over details pane */}
      {selectedCompany && (
        <CallTrackingDetails
          companyName={selectedCompany === '__NEW__' ? '' : summaries?.find(s => s.normalized_company_name === selectedCompany)?.company_name || selectedCompany}
          normalizedName={selectedCompany === '__NEW__' ? null : selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      <CallLogImportPreviewModal
        open={previewOpen}
        onOpenChange={(isOpen) => {
          setPreviewOpen(isOpen);
          if (!isOpen && searchParams.has("preview_task_id")) {
            const p = new URLSearchParams(searchParams);
            p.delete("preview_task_id");
            setSearchParams(p);
          }
        }}
        previewData={previewData}
        onSuccess={() => {
          setPreviewData(null);
          if (searchParams.has("preview_task_id")) {
            const tid = searchParams.get("preview_task_id");
            if (tid) {
              deleteTask.mutate(tid);
            }
            const p = new URLSearchParams(searchParams);
            p.delete("preview_task_id");
            setSearchParams(p);
          }
          refetch();
        }}
      />
    </div>
  );
}
