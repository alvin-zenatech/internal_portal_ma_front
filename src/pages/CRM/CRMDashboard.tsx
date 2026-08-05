import React, { useState, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePipelineTasks, useCRMStats, useImportCallLog, useAnalysts } from "@/hooks/usePipeline";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, TrendingUp, PhoneCall, ArrowUpDown, Filter, Download, Upload, Loader2, User } from "lucide-react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, getFacetedUniqueValues, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const getInitials = (name?: string) => {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

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
              className="h-8"
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { data: tasks } = usePipelineTasks();
  const { data: stats, isLoading: statsLoading } = useCRMStats();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: importCallLog, isPending: isImporting } = useImportCallLog();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importCallLog(file, {
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      });
    }
  };

  const { data: analystOptions } = useAnalysts();
  const [searchQuery, setSearchQuery] = useState("");
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const tableData = useMemo(() => {
    let result = tasks || [];
    if (analystFilter !== "all") {
      result = result.filter(t => t.analyst_id === analystFilter);
    }
    return result;
  }, [tasks, analystFilter]);

  const columns = [
    {
      accessorKey: "analyst_name",
      header: ({ column }: any) => <ColumnHeader column={column} title="Assigned To" />,
      cell: ({ row }: any) => {
        const name = row.original.analyst_name;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-slate-900">{name || 'Unassigned'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "company_name",
      header: ({ column }: any) => <ColumnHeader column={column} title="Company Name" />,
      cell: ({ row }: any) => <span className="font-medium text-slate-900">{row.original.company_name}</span>,
    },
    {
      accessorKey: "industry_name",
      header: ({ column }: any) => <ColumnHeader column={column} title="Industry" />,
    },
    {
      accessorKey: "location",
      header: ({ column }: any) => <ColumnHeader column={column} title="Location" />,
      cell: ({ row }: any) => row.original.location ? `${row.original.location}, ${row.original.country_name || ''}` : '-',
    },
    {
      accessorKey: "name",
      header: ({ column }: any) => <ColumnHeader column={column} title="Primary Contact" />,
      cell: ({ row }: any) => (
        <div>
          <div>{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.position_name}</div>
        </div>
      )
    },
    {
      accessorKey: "outcome_name",
      header: ({ column }: any) => <ColumnHeader column={column} title="Current Status" />,
      cell: ({ row }: any) => (
        <Badge variant="outline" style={{ backgroundColor: (row.original.outcome_color || '#e2e8f0') + '20', color: row.original.outcome_color || '#64748b', borderColor: (row.original.outcome_color || '#e2e8f0') + '40' }}>
          {row.original.outcome_name || 'No Activity'}
        </Badge>
      ),
      sortingFn: (rowA: any, rowB: any) => {
        const o1 = (rowA.original.outcome_name || "").toLowerCase();
        const o2 = (rowB.original.outcome_name || "").toLowerCase();
        
        const OUTCOME_ORDER = [
          "interested",
          "meeting scheduled",
          "callback requested",
          "no answer",
          "loi-sent",
          "loi-accepted",
          "loi-declined",
          "not interested",
          "not a fit",
          "not ready to sell",
          "closed"
        ];
        
        const idx1 = OUTCOME_ORDER.indexOf(o1);
        const idx2 = OUTCOME_ORDER.indexOf(o2);
        
        if (idx1 !== -1 && idx2 !== -1) return idx1 - idx2;
        if (idx1 !== -1) return -1;
        if (idx2 !== -1) return 1;
        return o1.localeCompare(o2);
      }
    },
    {
      accessorKey: "updated_at",
      header: ({ column }: any) => <ColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }: any) => row.original.updated_at ? new Date(row.original.updated_at).toLocaleDateString() : '-',
    },

  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: setSearchQuery,
    state: {
      globalFilter: deferredSearchQuery,
    },
    initialState: {
      sorting: [
        { id: "outcome_name", desc: false }
      ],
    },
  });

  const [visibleCount, setVisibleCount] = useState(50);

  React.useEffect(() => {
    setVisibleCount(50);
  }, [deferredSearchQuery]);

  const observer = React.useRef<IntersectionObserver | null>(null);
  const lastRowRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (node) {
        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + 50);
          }
        }, { rootMargin: "400px" });
        observer.current.observe(node);
      }
    },
    []
  );

  const allRows = table.getRowModel().rows;
  const isSearching = deferredSearchQuery.length > 0;
  const visibleRows = allRows.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full bg-muted/50 overflow-auto">
      <div className="p-4 sm:p-8 flex-1 w-full max-w-7xl mx-auto space-y-8">
        
        {/* Header & Stats Cards */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Call Tracking</h1>
            <div className="flex items-center space-x-2">
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImport} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Call Log
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Total Companies</h3>
                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.total_companies || 0}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Calls Today</h3>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.calls_today || 0}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Interested Leads</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.interested_leads || 0}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Follow-ups Due</h3>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{statsLoading ? "-" : stats?.follow_ups_due || 0}</div>
            </div>
          </div>
        </div>

        {/* Company List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between bg-muted/50 gap-4">
            <h2 className="text-lg font-semibold">Company List</h2>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search companies..."
                  className="pl-8 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={analystFilter} onValueChange={setAnalystFilter}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white">
                  <User className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder="All analysts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All analysts</SelectItem>
                  {analystOptions?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || a.email || "Unnamed analyst"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap h-11">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {visibleRows.length ? (
                  <>
                    {visibleRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate(`/pipeline/crm/companies/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!isSearching && visibleRows.length < allRows.length && (
                      <TableRow ref={lastRowRef}>
                        <TableCell colSpan={columns.length} className="h-1 p-0 border-0" />
                      </TableRow>
                    )}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      No companies found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function BuildingIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  )
}
