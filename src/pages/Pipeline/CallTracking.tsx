import React, { useState } from 'react';
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
import CallTrackingDetails from './CallTrackingDetails';


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
  const [visibleCount, setVisibleCount] = useState(50);
  
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
    ],
    []
  );

  const table = useReactTable({
    data: summaries || [],
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 200;
    if (bottom) {
      setVisibleCount(prev => Math.min(prev + 50, summaries?.length || 0));
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading Call Tracking...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="flex-none bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-800">Call Tracking</h1>
        <Button onClick={() => setSelectedCompany('__NEW__')}>Add Call Log</Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="bg-white rounded-md border shadow-sm h-full flex flex-col">
          <div className="overflow-auto flex-1" onScroll={handleScroll}>
            <Table containerClassName="overflow-visible h-auto">
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap bg-slate-50/80">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.slice(0, visibleCount).map((row) => (
                  <TableRow 
                    key={row.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCompany(row.original.normalized_company_name)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-slate-600 whitespace-nowrap truncate max-w-[250px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-slate-500">
                      No call logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
