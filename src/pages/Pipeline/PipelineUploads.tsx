import { toast } from "sonner";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import React, { useState, useMemo } from 'react';
import { usePipelineAttachments, type PipelineAttachment } from '@/hooks/usePipeline';
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, getFacetedUniqueValues
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Download, Search, ArrowUpDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { BASE_URL } from "@/services/apiClient";

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

export default function PipelineUploads() {


  const handleExportUploads = () => {
    try {
      const dataToExport = table.getFilteredRowModel().rows.map(r => r.original);
      const columnMap: Record<string, ExportColumn<PipelineAttachment>> = {
        attachment_name: { header: "File Name", accessor: (r) => r.attachment_name || "" },
        company_name: { header: "Company Name", accessor: (r) => r.company_name || "" },
        location: { header: "State/Location", accessor: (r) => r.location || "" },
        date: { header: "Date", accessor: (r) => r.date ? format(new Date(r.date), 'MMM d, yyyy') : "" },
        actions: { header: "Download URL", accessor: (r) => r.attachment_url || "" },
      };

      const cols = table.getVisibleLeafColumns()
        .map(col => columnMap[col.id])
        .filter(Boolean);

      exportToCsv(dataToExport.length > 0 ? dataToExport : (attachments || []), cols, "pipeline_uploaded_files");
      toast.success("Uploads list exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export uploads");
    }
  };


  const token = sessionStorage.getItem("token");
  const { data: attachments, isLoading } = usePipelineAttachments();
  const [actualGlobalFilter, setActualGlobalFilter] = useState("");
  const deferredGlobalFilter = React.useDeferredValue(actualGlobalFilter);

  const columns = useMemo<ColumnDef<PipelineAttachment>[]>(() => [
    { 
      accessorKey: "attachment_name", 
      header: ({ column }) => <ColumnHeader column={column} title="File Name" />,
      size: 300,
      cell: ({ row }) => <span className="font-medium truncate block w-full">{row.original.attachment_name}</span>
    },
    { 
      accessorKey: "company_name", 
      header: ({ column }) => <ColumnHeader column={column} title="Company" />,
      size: 250,
      cell: ({ row }) => <span className="truncate block w-full">{row.original.company_name}</span>
    },
    { 
      accessorKey: "location", 
      header: ({ column }) => <ColumnHeader column={column} title="State/Location" />,
      size: 200,
      cell: ({ row }) => <span className="text-muted-foreground truncate block w-full">{row.original.location || '-'}</span>
    },
    { 
      accessorKey: "date", 
      header: ({ column }) => <ColumnHeader column={column} title="Date" />,
      size: 150,
      cell: ({ row }) => <span className="text-muted-foreground truncate block w-full">{row.original.date ? format(new Date(row.original.date), 'MMM d, yyyy') : '-'}</span>
    },
    {
      id: "actions",
      size: 100,
      header: () => <div className="text-right text-muted-foreground font-medium text-xs">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild className="h-8 gap-2">
            <a href={`${BASE_URL}${row.original.attachment_url}?token=${token || ''}`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Download</span>
            </a>
          </Button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: attachments || [],
    columns,
    state: { globalFilter: deferredGlobalFilter },
    onGlobalFilterChange: setActualGlobalFilter as any,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return Object.values(row.original).some(val => 
        typeof val === 'string' && val.toLowerCase().includes(search)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uploads</h1>
          <p className="text-muted-foreground">View all files attached to pipeline tasks.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search files, companies..." 
              className="pl-9 bg-background"
              value={actualGlobalFilter}
              onChange={e => setActualGlobalFilter(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportUploads}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </Button>
          {(actualGlobalFilter || table.getState().columnFilters.length > 0) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setActualGlobalFilter("");
                table.setColumnFilters([]);
              }}
              className="h-8 text-muted-foreground hover:text-foreground shrink-0"
            >
              Reset Filters <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card flex-1 flex flex-col shadow-sm overflow-hidden">
        <div className="flex-1 overflow-auto relative">
          <Table containerClassName="overflow-visible h-auto" className="table-fixed w-full min-w-[1000px]">
            <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                  {hg.headers.map(h => (
                    <TableHead key={h.id} className="bg-muted/50" style={{ width: h.column.getSize() }}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    {actualGlobalFilter || table.getState().columnFilters.length > 0 ? "No files match your search." : "No uploaded files found."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="px-2 truncate" style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
