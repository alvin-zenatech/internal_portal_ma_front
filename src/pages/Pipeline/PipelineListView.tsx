import React, { useState, useDeferredValue } from "react";
import { cn } from "@/lib/utils";
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type SortingState, type ColumnFiltersState, getFacetedUniqueValues
} from "@tanstack/react-table";
import { type PipelineTask, useDeleteTask } from "@/hooks/usePipeline";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPriorityColors } from "./KanbanCard";
import { useExecutionAnalystOptions } from "@/components/Pipeline/ExecutionAnalystSelect";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  return parts.map(p => p.charAt(0)).join('').toUpperCase();
};

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
    <div className="inline-flex items-center gap-1 group whitespace-nowrap px-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 flex justify-start data-[state=open]:bg-accent px-1.5"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-6 shrink-0">
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
    return new Map(executionAnalystOptions.map((o) => [o.initials.toUpperCase(), o.name]));
  }, [executionAnalystOptions]);

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
      header: ({ column }) => <ColumnHeader column={column} title="Priority" />,
      size: 160,
      cell: ({ row }) => {
        const priority = row.original.priority_name;
        if (!priority) return <span className="text-muted-foreground">-</span>;
        const colors = getPriorityColors(row.original);
        return (
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap"
            style={colors.badgeStyle}
          >
            {priority}
          </span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const p1 = (rowA.original.priority_name || "").toLowerCase();
        const p2 = (rowB.original.priority_name || "").toLowerCase();
        
        const PRIORITY_ORDER = [
          "high value",
          "good fit",
          "50/50",
          "new",
          "loi sent",
          "loi-sent",
          "loi sent - accepted",
          "loi-accepted",
          "loi sent - declined",
          "loi-declined"
        ];
        
        const idx1 = PRIORITY_ORDER.indexOf(p1);
        const idx2 = PRIORITY_ORDER.indexOf(p2);
        
        if (idx1 !== -1 && idx2 !== -1) return idx1 - idx2;
        if (idx1 !== -1) return -1;
        if (idx2 !== -1) return 1;
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
    { accessorKey: "state_name", header: ({ column }) => <ColumnHeader column={column} title="State/Province" />, size: 180 },
    { accessorKey: "country_name", header: ({ column }) => <ColumnHeader column={column} title="Country" />, size: 140 },
    { 
      accessorKey: "analyst_name", 
      header: ({ column }: { column: any }) => <ColumnHeader column={column} title="Analyst" />,
      cell: ({ row }: { row: { original: PipelineTask } }) => {
        const initials = getInitials(row.original.analyst_name || '');
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="" />
              <AvatarFallback className="text-[10px] bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{row.original.analyst_name}</span>
          </div>
        );
      },
      size: 160
    },
    { 
      accessorKey: "execution_analyst", 
      header: ({ column }: { column: any }) => <ColumnHeader column={column} title="Execution Analysts" />,
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
    { accessorKey: "team_size", header: ({ column }) => <ColumnHeader column={column} title="Team Size" />, size: 140 },
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
    { accessorKey: "nda", header: ({ column }) => <ColumnHeader column={column} title="NDA" />, size: 120 },
    { accessorKey: "p_and_l", header: ({ column }) => <ColumnHeader column={column} title="P&L" />, size: 120 }
  ], [onEdit, analystNameMap]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters, globalFilter: deferredGlobalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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

  const allRows = table.getRowModel().rows;
  
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

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {(!hideSearchBar || (columnFilters.length > 0)) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {!hideSearchBar && (
              <Input 
                placeholder="Search everything..." 
                value={actualGlobalFilter} 
                onChange={(event) => setActualGlobalFilter(event.target.value)} 
                className="w-64 max-w-sm" 
              />
            )}

            {columnFilters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {columnFilters.map((filter) => (
                  <Badge key={filter.id} variant="secondary" className="h-6 font-normal capitalize">
                    {filter.id.replace(/_/g, " ")}: {filter.value as string}
                  </Badge>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setColumnFilters([]);
                  }}
                  className="h-8 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
                >
                  Reset
                  <X className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="rounded-md border bg-card flex-1 flex flex-col shadow-sm overflow-hidden">
        <div className="flex-1 overflow-auto relative" id="pipeline-list-scroll" ref={parentRef} onScroll={handleScroll}>
        <Table containerClassName="overflow-visible h-auto" className="table-fixed w-full min-w-[2200px]">
          <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="bg-muted/50 px-3 py-2" style={{ width: h.column.getSize() }}>
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
                      <TableCell key={cell.id} className="truncate px-3 py-2.5" style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
            {visibleCount < allRows.length && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground text-sm">
                  Scroll to load more...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        <div className="bg-muted/20 border-t px-4 py-2 text-sm text-muted-foreground font-medium">
          Total rows: {allRows.length}
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
