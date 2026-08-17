import { useSearchParams } from "react-router-dom";

import React, { useState, useDeferredValue, useRef, useEffect } from 'react';
import { useCallTrackingSummary, useCallLogs, useTableColumnOrder, useUpdateTableColumnOrder, type CallTrackingSummary, type CallLog, useUsers, usePreviewCallLog, useDeleteImportTask, fetchPreviewCallLogResult, type CallLogPreviewResponse } from '@/hooks/usePipeline';
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
import { ArrowUpDown, Filter, Upload, GripVertical, RotateCcw, Save, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CallLogUploadQueuePanel from "@/components/Pipeline/CallLogUploadQueuePanel";
import { Input } from "@/components/ui/input";
import { type ColumnFiltersState, getFacetedUniqueValues } from "@tanstack/react-table";

import CallTrackingDetails from './CallTrackingDetails';
import CallLogImportPreviewModal from './CallLogImportPreviewModal';
import { formatYesNo } from "@/lib/utils";

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
    <div className="inline-flex items-center gap-0.5 group whitespace-nowrap">
      <GripVertical className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 -ml-1 transition-opacity" />
      <Button
        variant="ghost"
        size="sm"
        className="-ml-1 h-8 flex justify-start data-[state=open]:bg-accent px-2"
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
  const { data: allCallLogs } = useCallLogs();
  const { data: users, isLoading: isUsersLoading } = useUsers();

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
  const previewCallLog = usePreviewCallLog((progress, message) => {
    toast.loading(message || `Analyzing call log ${progress}%...`, { id: "preview-loading" });
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading("Analyzing call log in background...", { id: "preview-loading" });
      previewCallLog.mutate(file, {
        onSuccess: (data) => {
          toast.dismiss("preview-loading");
          toast.success("Call log analysis ready!", {
            description: `Parsed rows for '${file.name}'.`,
            action: {
              label: "Open Preview",
              onClick: () => {
                setPreviewData(data);
                setPreviewOpen(true);
              }
            },
            duration: 8000
          });
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

    let user = users.find(u => u.full_name.toUpperCase() === upperVal);

    if (!user) {
      user = users.find(u => getInitials(u.full_name) === upperVal);
    }

    if (user) {
      return { name: user.full_name, avatar: getInitials(user.full_name) };
    }

    return { name: val, avatar: valInitials };
  }, [users]);

  const [visibleCount, setVisibleCount] = React.useState(50);

  const companyLogsMap = React.useMemo(() => {
    const map = new Map<string, CallLog[]>();
    if (!allCallLogs || !Array.isArray(allCallLogs)) return map;

    for (const log of allCallLogs) {
      const norm = (log.company_name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');
      if (!norm) continue;

      const existing = map.get(norm);
      if (existing) {
        existing.push(log);
      } else {
        map.set(norm, [log]);
      }
    }
    return map;
  }, [allCallLogs]);

  const getMatchingCallLog = React.useCallback((row: CallTrackingSummary): CallLog | null => {
    const rowCompNorm = (row.normalized_company_name || row.company_name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');

    const compLogs = companyLogsMap.get(rowCompNorm);
    if (!compLogs || compLogs.length === 0) return null;
    if (compLogs.length === 1) return compLogs[0];

    const rowPhoneNorm = (row.phone_number || '').replace(/\D/g, '');
    const rowContactNorm = (row.contact_name || '').toLowerCase().trim();
    const rowAnalyst = (row.latest_analyst || '').toLowerCase().trim();
    const rowStatus = (row.current_status || row.outcome || '').toLowerCase().trim();
    const rowCallLength = (row.call_length || '').trim();

    let bestLog: CallLog = compLogs[0];
    let bestScore = -1;

    for (const log of compLogs) {
      let score = 0;
      const logPhoneNorm = (log.phone_number || '').replace(/\D/g, '');
      const logContactNorm = (log.contact_name || '').toLowerCase().trim();
      const logAnalyst = (log.analyst || '').toLowerCase().trim();
      const logOutcome = (log.outcome || '').toLowerCase().trim();
      const logCallLength = (log.call_length || '').trim();

      if (rowPhoneNorm && logPhoneNorm && rowPhoneNorm === logPhoneNorm) score += 4;
      if (rowCallLength && logCallLength && rowCallLength === logCallLength) score += 4;
      if (rowContactNorm && logContactNorm && rowContactNorm === logContactNorm) score += 3;
      if (rowStatus && logOutcome && (rowStatus === logOutcome || logOutcome.includes(rowStatus) || rowStatus.includes(logOutcome))) score += 3;
      if (rowAnalyst && logAnalyst && (rowAnalyst === logAnalyst || logAnalyst.includes(rowAnalyst) || rowAnalyst.includes(logAnalyst))) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestLog = log;
      } else if (score === bestScore) {
        const dateA = formatDate(log.date_of_call) || log.created_at || '';
        const dateB = formatDate(bestLog.date_of_call) || bestLog.created_at || '';
        if (dateA > dateB || (dateA === dateB && (log.id || 0) > (bestLog.id || 0))) {
          bestLog = log;
        }
      }
    }

    return bestLog;
  }, [companyLogsMap]);

  const getLatestCallDate = React.useCallback((row: CallTrackingSummary) => {
    // 1. Direct field on row if available from backend
    const direct =
      row.date_of_call ||
      (row as any).call_date ||
      (row as any).latest_call_date ||
      (row as any).last_call_date ||
      (row as any).date ||
      (row as any).latest_date ||
      (row as any).date_called ||
      (row as any).activity_date ||
      (row as any).created_at;

    if (direct) {
      const formatted = formatDate(direct);
      if (formatted) return formatted;
    }

    const log = getMatchingCallLog(row);
    if (!log) return '-';

    const res = formatDate(log.date_of_call) || formatDate(log.created_at);
    return res || '-';
  }, [getMatchingCallLog]);

  const getCallNotes = React.useCallback((row: CallTrackingSummary) => {
    if (row.notes) return row.notes;
    const log = getMatchingCallLog(row);
    return log?.notes || '-';
  }, [getMatchingCallLog]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const [globalFilter, setGlobalFilter] = useState("");
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  const columns = React.useMemo<ColumnDef<CallTrackingSummary>[]>(
    () => [

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
          return <span>{val}</span>;
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
        accessorKey: 'phone_number',
        header: ({ column }) => <ColumnHeader column={column} title="Phone Number" />,
        size: 160
      },

      {
        accessorKey: 'date_of_call',
        accessorFn: (row) => getLatestCallDate(row),
        header: ({ column }) => <ColumnHeader column={column} title="Date of Call" />,
        size: 160,
        cell: ({ row }) => {
          const val = getLatestCallDate(row.original);
          return <span>{val && val !== '-' ? val : '-'}</span>;
        }
      },

      {
        accessorKey: 'kdm',
        accessorFn: (row) => {
          const direct = row.kdm;
          if (direct !== undefined && direct !== null && direct !== '') return formatYesNo(direct);
          const log = getMatchingCallLog(row);
          return log?.kdm !== undefined && log?.kdm !== null && log?.kdm !== '' ? formatYesNo(log.kdm) : '-';
        },
        header: ({ column }) => <ColumnHeader column={column} title="KDM" />,
        size: 130,
        cell: ({ row }) => {
          const direct = row.original.kdm;
          if (direct !== undefined && direct !== null && direct !== '') return <span>{formatYesNo(direct)}</span>;
          const log = getMatchingCallLog(row.original);
          return <span>{log?.kdm !== undefined && log?.kdm !== null && log?.kdm !== '' ? formatYesNo(log.kdm) : '-'}</span>;
        }
      },
      {
        accessorKey: 'picked_up',
        header: ({ column }) => <ColumnHeader column={column} title="Picked Up" />,
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
    'company_name',
    'industry',
    'state_province',
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
      setColumnOrder(dbColumnSettings.column_order);
    }
  }, [dbColumnSettings]);

  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    try {
      localStorage.setItem('call_tracking_column_order_v2', JSON.stringify(newOrder));
    } catch {}
  };

  const handleSaveForTeam = () => {
    updateColumnOrder.mutate({
      tableName: 'call-tracking',
      columnOrder
    });
  };

  const isCustomOrder = React.useMemo(() => {
    return JSON.stringify(columnOrder) !== JSON.stringify(defaultColumnOrder);
  }, [columnOrder, defaultColumnOrder]);

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
        const val = row.getValue(columnId);
        if (Array.isArray(filterValue)) return filterValue.includes(String(val));
        return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
      }
    },
    defaultColumn: { filterFn: 'multiSelect' as any },
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
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

  if (isLoading || isUsersLoading) {
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
            <Plus className="h-4 w-4 mr-2" />
            Add Call Log
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20">
        <div className="h-full flex flex-col p-6 space-y-4">
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
                onClick={handleSaveForTeam}
                disabled={updateColumnOrder.isPending}
                className="text-xs h-9 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {updateColumnOrder.isPending ? "Saving..." : "Save as Team Default"}
              </Button>
              {isCustomOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetColumnOrder}
                  className="text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset Columns
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 flex flex-col shadow-sm overflow-hidden">
            <div className="flex-1 overflow-auto relative" ref={parentRef} onScroll={handleScroll}>
              <Table containerClassName="overflow-visible h-auto" className="table-fixed w-full min-w-[1800px]">
                <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted/50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          className={`bg-muted/50 whitespace-nowrap select-none transition-colors duration-150 ${
                            dragOverColumnId === h.column.id ? "bg-primary/20 border-l-2 border-primary" : ""
                          } ${draggedColumnId === h.column.id ? "opacity-30" : ""}`}
                          style={{ width: h.column.getSize() }}
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
