import React, { useState, useDeferredValue } from 'react';
import { useCallTrackingSummary, type CallTrackingSummary, useUsers } from '@/hooks/usePipeline';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ArrowUpDown, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { type ColumnFiltersState, getFacetedUniqueValues } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import CallTrackingDetails from './CallTrackingDetails';
import { formatYesNo } from "@/lib/utils";


function ColumnHeader({ column, title }: { column: any, title: string }) {
  const uniqueValues = React.useMemo(() => {
    return Array.from(column.getFacetedUniqueValues().keys())
      .filter(Boolean)
      .sort() as string[];
  }, [column.getFacetedUniqueValues()]);

  const isDropdown = uniqueValues.length > 0 && uniqueValues.length <= 50;

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Filter className={`h-3 w-3 ${column.getFilterValue() ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {isDropdown ? (
            <select
              value={(column.getFilterValue() ?? "") as string}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-9 text-sm border border-input rounded-md px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All {title}s</option>
              {uniqueValues.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          ) : (
            <Input
              placeholder={`Filter ${title}...`}
              value={(column.getFilterValue() ?? "") as string}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-sm"
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function CallTracking() {
  const { data: summaries, isLoading } = useCallTrackingSummary();
  const { data: users } = useUsers();
  
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
        cell: ({ row }) => {
          const { name, avatar } = getAnalystDetails(row.original.latest_analyst);
          return (
             <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                   <AvatarFallback className="text-[10px] bg-slate-200 text-slate-700">{avatar}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
             </div>
          );
        }
      },
      { 
        accessorKey: 'company_name', 
        header: ({ column }) => <ColumnHeader column={column} title="Company Name" />
      },
      { 
        accessorKey: 'industry', 
        header: ({ column }) => <ColumnHeader column={column} title="Industry" />
      },
      { 
        accessorKey: 'full_location', 
        header: ({ column }) => <ColumnHeader column={column} title="Location" />
      },
      { 
        accessorKey: 'contact_name', 
        header: ({ column }) => <ColumnHeader column={column} title="Contact Name" />
      },
      { 
        accessorKey: 'position', 
        header: ({ column }) => <ColumnHeader column={column} title="Position" />
      },
      { 
        accessorKey: 'current_status', 
        header: ({ column }) => <ColumnHeader column={column} title="Current Status" />
      },
      { 
        accessorKey: 'phone_number', 
        header: ({ column }) => <ColumnHeader column={column} title="Phone Number" />
      },
      { 
        accessorKey: 'emailed', 
        header: ({ column }) => <ColumnHeader column={column} title="Emailed" />,
        cell: ({ row }) => <span>{formatYesNo(row.original.emailed)}</span>
      },
      { 
        accessorKey: 'picked_up', 
        header: ({ column }) => <ColumnHeader column={column} title="Picked Up" />,
        cell: ({ row }) => <span>{formatYesNo(row.original.picked_up)}</span>
      },
      { 
        accessorKey: 'call_length', 
        header: ({ column }) => <ColumnHeader column={column} title="Call Length" />
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
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;
  
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Typical row height for CallTracking
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0)
    : 0;
  if (isLoading) {
    return <div className="p-8">Loading Call Tracking...</div>;
  }

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0">
      <div className="px-8 py-6 border-b bg-card shrink-0 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Call Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and review all client and prospect communication.
          </p>
        </div>
        <Button onClick={() => setSelectedCompany('__NEW__')} className="whitespace-nowrap">
          Add Call Log
        </Button>
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
            <div className="flex-1 overflow-auto relative" ref={parentRef}>
              <Table containerClassName="overflow-visible h-auto">
                <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap bg-muted/50">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {paddingTop > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: `${paddingTop}px`, padding: 0 }} />
                    </TableRow>
                  )}
                  {virtualRows.length ? (
                    virtualRows.map(virtualRow => {
                      const row = allRows[virtualRow.index];
                      return (
                        <TableRow 
                          key={row.id} 
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCompany(row.original.normalized_company_name)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-3 text-muted-foreground whitespace-nowrap truncate max-w-[250px]">
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
                  {paddingBottom > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: `${paddingBottom}px`, padding: 0 }} />
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
    </div>
  );
}
