import { formatNameWithInitial } from '@/lib/utils';
import React, { useState, useDeferredValue, useRef } from 'react';
import { useCallTrackingSummary, type CallTrackingSummary, useUsers, usePreviewCallLog, type CallLogPreviewResponse } from '@/hooks/usePipeline';
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
import { ArrowUpDown, Filter, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { type ColumnFiltersState, getFacetedUniqueValues } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import CallTrackingDetails from './CallTrackingDetails';
import CallLogImportPreviewModal from './CallLogImportPreviewModal';
import { formatYesNo } from "@/lib/utils";

const STATE_MAP: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
};

function ColumnHeader({ column, title }: { column: any, title: string }) {
  const uniqueValues = React.useMemo(() => {
    return Array.from(column.getFacetedUniqueValues().keys())
      .filter(Boolean)
      .sort() as string[];
  }, [column.getFacetedUniqueValues()]);

  const isDropdown = uniqueValues.length > 0 && uniqueValues.length <= 300;
  
  const filterArray = Array.isArray(column.getFilterValue()) ? column.getFilterValue() as string[] : [];
  
  const toggleOption = (val: string) => {
    if (filterArray.includes(val)) {
      const newFilters = filterArray.filter(v => v !== val);
      column.setFilterValue(newFilters.length ? newFilters : undefined);
    } else {
      column.setFilterValue([...filterArray, val]);
    }
  };

  return (
    <div className="inline-flex items-center gap-0 group whitespace-nowrap">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 flex justify-start data-[state=open]:bg-accent px-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-6 shrink-0 -ml-1">
            <Filter className={`h-3 w-3 ${filterArray.length > 0 || column.getFilterValue() ? "text-primary opacity-100" : "text-muted-foreground opacity-50 group-hover:opacity-100"}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {isDropdown ? (
            <div className="max-h-60 overflow-y-auto space-y-2 p-1">
              {uniqueValues.map(val => (
                <div key={val} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`filter-${title}-${val}`} 
                    checked={filterArray.includes(val)} 
                    onCheckedChange={() => toggleOption(val)} 
                  />
                  <Label htmlFor={`filter-${title}-${val}`} className="text-sm font-normal cursor-pointer leading-none flex-1">
                    {val}
                  </Label>
                </div>
              ))}
              {filterArray.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => column.setFilterValue(undefined)}>
                  Clear filters
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
  const { data: summaries, isLoading, refetch } = useCallTrackingSummary();
  const { data: users } = useUsers();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CallLogPreviewResponse | null>(null);

  const previewCallLog = usePreviewCallLog();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading("Analyzing call log file...", { id: "preview-loading" });
      previewCallLog.mutate(file, {
        onSuccess: (data) => {
          toast.dismiss("preview-loading");
          setPreviewData(data);
          setPreviewOpen(true);
        },
        onError: (err: any) => {
          toast.dismiss("preview-loading");
          toast.error(err?.message || "Failed to parse call log file");
        }
      });
    }
    e.target.value = '';
  };

  
  const getAnalystDetails = React.useCallback((initials: string | null) => {
    if (!initials) return { name: '-', avatar: '?' };
    const upperInit = initials.toUpperCase();
    if (!users) return { name: upperInit, avatar: upperInit };
    const user = users.find(u => {
      const parts = u.full_name.trim().split(/\s+/);
      const computed = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
        : u.full_name[0].toUpperCase();
      return computed === upperInit;
    });
    return user ? { name: user.full_name, avatar: upperInit } : { name: upperInit, avatar: upperInit };
  }, [users]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredGlobalFilter = useDeferredValue(globalFilter);
  
  const columns = React.useMemo<ColumnDef<CallTrackingSummary>[]>(
    () => [
      { 
        accessorKey: 'latest_analyst', 
        header: ({ column }) => <ColumnHeader column={column} title="Analyst" />,
        size: 160,
        cell: ({ row }) => {
          const { name, avatar } = getAnalystDetails(row.original.latest_analyst);
          return (
             <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                   <AvatarFallback className="text-[10px] bg-slate-200 text-slate-700">{avatar}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{name}</span>
             </div>
          );
        }
      },
      { 
        accessorKey: 'company_name', 
        header: ({ column }) => <ColumnHeader column={column} title="Company Name" />,
        size: 240
      },
      { 
        accessorKey: 'industry', 
        header: ({ column }) => <ColumnHeader column={column} title="Industry" />,
        size: 180
      },
      { 
        accessorKey: 'state_province', 
        header: ({ column }) => <ColumnHeader column={column} title="State/Province" />,
        size: 180,
        cell: ({ row }) => {
          const val = row.original.state_province;
          if (!val) return <span>-</span>;
          return <span>{STATE_MAP[val.toUpperCase()] || val}</span>;
        }
      },
      { 
        accessorKey: 'location', 
        header: ({ column }) => <ColumnHeader column={column} title="Country" />,
        size: 180
      },
      { 
        accessorKey: 'contact_name', 
        header: ({ column }) => <ColumnHeader column={column} title="Contact Name" />,
        size: 180
      },
      { 
        accessorKey: 'current_status', 
        header: ({ column }) => <ColumnHeader column={column} title="Current Status" />,
        size: 180
      },
      { 
        accessorKey: 'phone_number', 
        header: ({ column }) => <ColumnHeader column={column} title="Phone Number" />,
        size: 160
      },
      { 
        accessorKey: 'emailed', 
        header: ({ column }) => <ColumnHeader column={column} title="Emailed" />,
        size: 130,
        cell: ({ row }) => <span>{formatYesNo(row.original.emailed)}</span>
      },
      { 
        accessorKey: 'picked_up', 
        header: ({ column }) => <ColumnHeader column={column} title="Picked Up" />,
        size: 130,
        cell: ({ row }) => <span>{formatYesNo(row.original.picked_up)}</span>
      },
      { 
        accessorKey: 'call_length', 
        header: ({ column }) => <ColumnHeader column={column} title="Call Length" />,
        size: 140
      },
    ],
    []
  );

  const table = useReactTable({
    data: summaries || [],
    columns,
    state: { sorting, columnFilters, globalFilter: deferredGlobalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return Object.values(row.original).some(val => 
        typeof val === 'string' && val.toLowerCase().includes(search)
      );
    },
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: {
      multiSelect: (row: any, columnId: string, filterValue: any) => {
        if (!filterValue || filterValue.length === 0) return true;
        const val = row.getValue(columnId);
        if (Array.isArray(filterValue)) return filterValue.includes(String(val));
        return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
      }
    },
    defaultColumn: { filterFn: 'multiSelect' as any },
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;
  
  const [visibleCount, setVisibleCount] = React.useState(50);

  React.useEffect(() => {
    setVisibleCount(50);
  }, [deferredGlobalFilter, columnFilters, sorting]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (visibleCount < allRows.length) {
        setVisibleCount(prev => Math.min(prev + 50, allRows.length));
      }
    }
  };

  const visibleRows = allRows.slice(0, visibleCount);

  if (isLoading) {
    return <div className="p-8">Loading Call Tracking...</div>;
  }

  return (
    <div className="h-full flex flex-col w-full min-h-0">
      <div className="px-8 py-6 border-b bg-card shrink-0 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
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
            Add Call Log
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20">
        <div className="h-full flex flex-col p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Input 
                placeholder="Search call logs..." 
                value={globalFilter} 
                onChange={(e) => setGlobalFilter(e.target.value)} 
                className="w-64 max-w-sm" 
              />
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 flex flex-col shadow-sm overflow-hidden">
            <div className="flex-1 overflow-auto relative" ref={parentRef} onScroll={handleScroll}>
              <Table containerClassName="overflow-visible h-auto" className="table-fixed w-full min-w-[1800px]">
                <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                      {hg.headers.map((h) => (
                        <TableHead key={h.id} className="bg-muted/50 whitespace-nowrap" style={{ width: h.column.getSize() }}>
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
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCompany(row.original.normalized_company_name)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-3 whitespace-nowrap truncate" style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                  {visibleRows.length < allRows.length && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-4 text-center text-muted-foreground">
                        Loading more...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="bg-muted/20 border-t px-4 py-2 text-sm text-muted-foreground font-medium">
              Total rows: {table.getFilteredRowModel().rows.length}
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
        onOpenChange={setPreviewOpen}
        previewData={previewData}
        onSuccess={() => {
          setPreviewData(null);
          refetch();
        }}
      />
    </div>
  );
}
