import React, { useState } from "react";
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState, type ColumnFiltersState, getFacetedUniqueValues
} from "@tanstack/react-table";
import { type PipelineTask, useDeleteTask } from "@/hooks/usePipeline";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowUpDown, Filter } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getPriorityColors } from "./KanbanCard";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
              className="h-8 text-sm"
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function PipelineListView({ tasks, onTaskClick, onEdit }: { tasks: PipelineTask[], onTaskClick: (task: PipelineTask) => void, onEdit: (task: PipelineTask) => void }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority_name", desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const { mutate: removeTask } = useDeleteTask();

  const columns = React.useMemo<ColumnDef<PipelineTask>[]>(() => [
    { 
      accessorKey: "analyst_name", 
      header: ({ column }) => <ColumnHeader column={column} title="Analyst" />,
      cell: ({ row }) => {
        const analyst = row.original.analyst_name;
        if (!analyst) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                {getInitials(analyst)}
              </AvatarFallback>
            </Avatar>
            <span>{analyst}</span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.analyst_name || "";
        const b = rowB.original.analyst_name || "";
        if (!a && b) return 1;
        if (a && !b) return -1;
        return a.localeCompare(b);
      }
    },
    { accessorKey: "company_name", header: ({ column }) => <ColumnHeader column={column} title="Company Name" /> },
    { accessorKey: "location", header: ({ column }) => <ColumnHeader column={column} title="Location" /> },
    { accessorKey: "revenue", header: ({ column }) => <ColumnHeader column={column} title="Revenue" /> },
    { accessorKey: "team_size", header: ({ column }) => <ColumnHeader column={column} title="Team Size" /> },
    { 
      accessorKey: "latest_note", 
      header: ({ column }) => <ColumnHeader column={column} title="Note" />,
      cell: ({ row }) => {
        const note = row.original.latest_note || "-";
        return <span className="text-muted-foreground truncate max-w-[200px] inline-block" title={note}>{note}</span>;
      }
    },
    { 
      accessorKey: "priority_name", 
      header: ({ column }) => <ColumnHeader column={column} title="Next Steps" />,
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
          "new",
          "high value",
          "good fit",
          "50/50",
          "loi-sent",
          "loi-accepted",
          "loi-declined",
          "not a fit",
          "not ready to sell"
        ];
        
        const idx1 = PRIORITY_ORDER.indexOf(p1);
        const idx2 = PRIORITY_ORDER.indexOf(p2);
        
        if (idx1 !== -1 && idx2 !== -1) return idx1 - idx2;
        if (idx1 !== -1) return -1;
        if (idx2 !== -1) return 1;
        return p1.localeCompare(p2);
      }
    },
    { accessorKey: "nda", header: ({ column }) => <ColumnHeader column={column} title="NDA" /> },
    { accessorKey: "p_and_l", header: ({ column }) => <ColumnHeader column={column} title="P&L" /> },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
              setTaskToDelete(task.id);
            }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    }
  ], [onEdit, removeTask]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const company = (row.original.company_name || "").toLowerCase();
      const name = (row.original.name || "").toLowerCase();
      const ind = (row.original.industry_name || "").toLowerCase();
      const pri = (row.original.priority_name || "").toLowerCase();
      const em = (row.original.email || "").toLowerCase();
      return company.includes(search) || name.includes(search) || ind.includes(search) || pri.includes(search) || em.includes(search);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Input 
          placeholder="Search everything..." 
          value={globalFilter} 
          onChange={(event) => setGlobalFilter(event.target.value)} 
          className="max-w-sm" 
        />
      </div>
      <div className="rounded-md border bg-card flex-1 overflow-auto shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-muted/50">
                {hg.headers.map(h => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onTaskClick(row.original)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No tasks found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
}
