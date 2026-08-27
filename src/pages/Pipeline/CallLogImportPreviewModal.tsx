import { toast } from "sonner";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/services/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { CheckCircle2, Building2, HelpCircle, PlusCircle, Search, Loader2, Edit3, Download, Check, Trash2 } from 'lucide-react';
import { type CallLogPreviewResponse, type CallLogPreviewRow, type ExistingCallLogItem, useConfirmImportCallLog, useAnalysts, useCountries, useStates } from '@/hooks/usePipeline';
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";
import { formatYesNo, formatPhoneNumber } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: CallLogPreviewResponse | null;
  onSuccess: () => void;
}

interface IndexedRow extends CallLogPreviewRow {
  _searchKey: string;
  _searchClean: string;
  is_imported?: boolean;
}

const normalizeForDupCheck = (str?: string | null) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const normalizePhoneDigits = (str?: string | null) => {
  if (!str) return '';
  return str.replace(/\D/g, '');
};

const normalizeDateForCheck = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '-') return '';
  const clean = dateStr.trim();
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [, m, d, yRaw] = slashMatch;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
};

// Fast O(1) Duplicate Lookup Index
class DupLookupIndex {
  private dbCompanyExact = new Set<string>();
  private dbPhoneExact = new Set<string>();
  private dbCompanyDates = new Map<string, Set<string>>();
  private dbPhoneDates = new Map<string, Set<string>>();
  private dbCompanyAnalysts = new Map<string, string>();

  constructor(existingLogs: ExistingCallLogItem[]) {
    for (const ex of existingLogs) {
      this.add(ex.company_name, ex.phone_number, ex.date_of_call, ex.analyst);
    }
  }

  add(companyName?: string | null, phoneStr?: string | null, dateStr?: string | null, analyst?: string | null) {
    const comp = normalizeForDupCheck(companyName);
    const phone = normalizePhoneDigits(phoneStr);
    const date = normalizeDateForCheck(dateStr);
    const an = analyst || '';

    if (comp) {
      this.dbCompanyExact.add(comp);
      if (an) this.dbCompanyAnalysts.set(comp, an);
      if (date) {
        if (!this.dbCompanyDates.has(comp)) this.dbCompanyDates.set(comp, new Set());
        this.dbCompanyDates.get(comp)!.add(date);
      }
    }

    if (phone && phone.length >= 7) {
      this.dbPhoneExact.add(phone);
      if (date) {
        if (!this.dbPhoneDates.has(phone)) this.dbPhoneDates.set(phone, new Set());
        this.dbPhoneDates.get(phone)!.add(date);
      }
    }
  }

  remove(companyName?: string | null, phoneStr?: string | null, dateStr?: string | null) {
    const comp = normalizeForDupCheck(companyName);
    const phone = normalizePhoneDigits(phoneStr);
    const date = normalizeDateForCheck(dateStr);

    if (comp && date) {
      if (this.dbCompanyDates.has(comp)) {
        this.dbCompanyDates.get(comp)!.delete(date);
      }
    }
    if (phone && date) {
      if (this.dbPhoneDates.has(phone)) {
        this.dbPhoneDates.get(phone)!.delete(date);
      }
    }
  }

  check(targetName: string, phoneStr?: string, dateStr?: string): { isDup: boolean; dupReason: string } {
    const normTarget = normalizeForDupCheck(targetName);
    const normPhone = normalizePhoneDigits(phoneStr);
    const normDate = normalizeDateForCheck(dateStr);

    if (!normTarget && !normPhone) return { isDup: false, dupReason: '' };

    if (normTarget && this.dbCompanyExact.has(normTarget)) {
      const dates = this.dbCompanyDates.get(normTarget);
      if (normDate && dates && dates.has(normDate)) {
        const analyst = this.dbCompanyAnalysts.get(normTarget);
        return {
          isDup: true,
          dupReason: `Call log already exists for '${targetName}' on ${dateStr}${analyst ? ` by ${analyst.toUpperCase()}` : ''}`
        };
      }
      if (!normDate && (!dates || dates.size === 0)) {
        const analyst = this.dbCompanyAnalysts.get(normTarget);
        return {
          isDup: true,
          dupReason: `Call log already exists for '${targetName}'${analyst ? ` by ${analyst.toUpperCase()}` : ''}`
        };
      }
    }

    if (normPhone && normPhone.length >= 7 && this.dbPhoneExact.has(normPhone)) {
      const dates = this.dbPhoneDates.get(normPhone);
      if (normDate && dates && dates.has(normDate)) {
        return {
          isDup: true,
          dupReason: `Call log already exists with phone (${phoneStr || normPhone}) on ${dateStr}`
        };
      }
      if (!normDate && (!dates || dates.size === 0)) {
        return {
          isDup: true,
          dupReason: `Call log already exists with phone (${phoneStr || normPhone})`
        };
      }
    }

    return { isDup: false, dupReason: '' };
  }
}

// Memoized Single Table Row Component
interface RowProps {
  row: IndexedRow;
  analysts?: Array<{ id: string; full_name?: string | null }>;
  isImportingSingle?: boolean;
  isRemovingSingle?: boolean;
  onToggleRow: (index: number, checked: boolean) => void;
  onCompanyChange: (index: number, val: string) => void;
  onPhoneChange: (index: number, val: string) => void;
  onAnalystChange: (index: number, analystId: string) => void;
  onOpenCompanyModal: (row: CallLogPreviewRow) => void;
  onUnconfirmRow: (index: number) => void;
  onConfirmRow: (index: number) => void;
  onImportSingleRow: (index: number) => void;
  onRemoveSingleRow: (index: number) => void;
}

const TableRowItem = React.memo(function TableRowItem({
  row,
  analysts,
  isImportingSingle,
  isRemovingSingle,
  onToggleRow,
  onCompanyChange,
  onPhoneChange,
  onAnalystChange,
  onOpenCompanyModal,
  onUnconfirmRow,
  onConfirmRow,
  onImportSingleRow,
  onRemoveSingleRow,
}: RowProps) {
  return (
    <TableRow
      className={`hover:bg-muted/50 transition-colors ${
        !row.selected_for_import ? 'opacity-50 bg-muted/20' : row.is_duplicate ? 'bg-rose-500/5' : ''
      }`}
    >
      <TableCell className="text-center py-1.5 px-2.5">
        <Checkbox
          checked={row.selected_for_import}
          onCheckedChange={(checked) => onToggleRow(row.row_index, !!checked)}
        />
      </TableCell>

      <TableCell className="space-y-1 py-1.5 px-3 max-w-[420px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-xs sm:text-sm text-muted-foreground truncate max-w-[260px]" title={row.raw_company_name}>
            File: "{row.raw_company_name}"
          </span>
          {row.match_type === 'exact' && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0.5 px-2 font-semibold">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Exact
            </Badge>
          )}
          {row.match_type === 'suggested' && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0.5 px-2 font-semibold">
              <HelpCircle className="h-3 w-3 mr-1" /> Suggested
            </Badge>
          )}
          {row.match_type === 'new' && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] py-0.5 px-2 font-semibold">
              <PlusCircle className="h-3 w-3 mr-1" /> New Company
            </Badge>
          )}
        </div>

        {row.is_imported ? (
          <div className="flex items-center justify-between gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 truncate" title={row.company_name}>
                Added: {row.company_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px] py-0 px-1.5 font-bold">
                In Database
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 font-medium cursor-pointer"
                disabled={isRemovingSingle}
                onClick={() => onRemoveSingleRow(row.row_index)}
                title="Remove this call log from database"
              >
                {isRemovingSingle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Remove
              </Button>
            </div>
          </div>
        ) : row.is_confirmed ? (
          <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1.5">
            <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 truncate" title={row.company_name}>
              ✓ Confirmed: {row.company_name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => onUnconfirmRow(row.row_index)}
              >
                Edit
              </Button>
              {row.is_duplicate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6.5 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 font-medium cursor-pointer"
                  disabled={isRemovingSingle}
                  onClick={() => onRemoveSingleRow(row.row_index)}
                  title="Remove this existing call log from database"
                >
                  {isRemovingSingle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Remove from DB
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-6.5 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 shadow-xs"
                  disabled={isImportingSingle}
                  onClick={() => onImportSingleRow(row.row_index)}
                  title="Add this call log to database now (keeps preview open)"
                >
                  {isImportingSingle ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                  Add Log
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 w-full">
            {row.suggestions && row.suggestions.length > 0 ? (
              <select
                value={row.matched_company_id ? String(row.matched_company_id) : '__NEW__'}
                onChange={(e) => onCompanyChange(row.row_index, e.target.value)}
                className="h-7 text-xs rounded-md border border-input bg-background px-2 py-0.5 flex-1 max-w-[200px] min-w-[120px] text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary truncate"
              >
                <option value="__NEW__" className="text-blue-600 font-medium" title={row.company_name || row.raw_company_name}>+ New: {row.company_name || row.raw_company_name}</option>
                {row.suggestions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} {s.score < 1 ? `(${Math.round(s.score * 100)}% match)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-semibold text-xs sm:text-sm truncate flex-1 min-w-[120px]" title={row.company_name}>
                {row.company_name}
              </div>
            )}

            {!row.matched_company_id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6.5 text-xs px-1.5 text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0 font-medium flex items-center gap-1"
                onClick={() => onOpenCompanyModal(row)}
                title="Set Up / Edit Company Details"
              >
                <Edit3 className="h-3 w-3" />
                Setup
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6.5 text-xs px-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0 font-medium flex items-center gap-1"
              onClick={() => onConfirmRow(row.row_index)}
              title="Confirm match for batch import"
            >
              <Check className="h-3 w-3" />
              Confirm
            </Button>

            <Button
              type="button"
              size="sm"
              className="h-6.5 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium flex items-center gap-1 shadow-xs"
              disabled={isImportingSingle}
              onClick={() => onImportSingleRow(row.row_index)}
              title="Add this call log to database now (keeps preview open)"
            >
              {isImportingSingle ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
              Add
            </Button>
          </div>
        )}

        {/* Close Match Suggestion Banner with Use Button */}
        {!row.is_imported && !row.is_confirmed && !row.matched_company_id && row.suggestions && row.suggestions.length > 0 && row.suggestions[0].score >= 0.70 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1">
            <span className="text-[11px] font-medium text-muted-foreground">Close match:</span>
            <span className="font-semibold truncate max-w-[180px]" title={row.suggestions[0].name}>
              {row.suggestions[0].name}
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 rounded px-1.5 py-0.5 font-bold shrink-0">
              {Math.round(row.suggestions[0].score * 100)}% match
            </span>
            <button
              type="button"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-auto shrink-0 cursor-pointer"
              onClick={() => onCompanyChange(row.row_index, String(row.suggestions![0].id))}
            >
              Use
            </button>
          </div>
        )}
      </TableCell>

      <TableCell className="text-xs py-1.5 px-2.5">{row.industry || row.raw_industry || '-'}</TableCell>
      <TableCell className="text-xs py-1.5 px-2.5">{row.state_province || row.raw_state_province || '-'}</TableCell>
      <TableCell className="text-xs py-1.5 px-2.5">{row.country || row.location || '-'}</TableCell>
      <TableCell className="text-xs truncate py-1.5 px-2.5 max-w-[150px]" title={`${row.contact_name || ''} ${row.position ? `(${row.position})` : ''}`}>
        {row.contact_name || '-'}
        {row.position && <span className="text-xs text-muted-foreground block truncate">{row.position}</span>}
      </TableCell>

      <TableCell className="text-xs font-mono py-1.5 px-2.5 max-w-[150px]">
        {row.detected_phones && row.detected_phones.length > 1 ? (
          <select
            value={row.phone_number || row.detected_phones[0]}
            onChange={(e) => onPhoneChange(row.row_index, e.target.value)}
            className="h-6 text-xs rounded-md border border-input bg-background font-mono px-1.5 py-0 text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {row.detected_phones.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <div className="font-mono text-sm text-muted-foreground truncate" title={row.phone_number || row.raw_phone_number}>
            {formatPhoneNumber(row.phone_number || row.raw_phone_number) || '-'}
          </div>
        )}
      </TableCell>

      <TableCell className="text-xs whitespace-nowrap py-1.5 px-2.5">{row.date_of_call || '-'}</TableCell>
      <TableCell className="text-xs text-center font-medium py-1.5 px-2.5">{formatYesNo(row.kdm || row.raw_kdm) || '-'}</TableCell>
      <TableCell className="text-xs text-center font-medium py-1.5 px-2.5">{formatYesNo(row.picked_up) || '-'}</TableCell>
      <TableCell className="text-xs py-1.5 px-2.5 truncate max-w-[150px]" title={row.outcome}>{row.outcome || '-'}</TableCell>
      <TableCell className="text-xs text-center font-mono py-1.5 px-2.5">{row.call_length || '-'}</TableCell>

      <TableCell className="py-1.5 px-2.5 min-w-[180px] max-w-[220px] space-y-1">
        {(row.raw_analyst || row.analyst) && (
          <div className="text-xs font-medium text-muted-foreground truncate" title={row.raw_analyst || row.analyst}>
            File: "{row.raw_analyst || row.analyst}"
          </div>
        )}
        <select
          value={row.analyst_id || "unassigned"}
          onChange={(e) => onAnalystChange(row.row_index, e.target.value)}
          className="h-7 text-xs rounded-md border border-input bg-background px-2 py-0.5 w-full text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="unassigned" className="text-muted-foreground">Unassigned</option>
          {analysts?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </TableCell>

      <TableCell className="text-xs text-muted-foreground truncate py-1.5 px-3 max-w-[280px]" title={row.notes}>
        {row.notes || '-'}
      </TableCell>

      <TableCell className="text-xs py-1.5 px-2.5">
        {row.is_imported ? (
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-semibold">
            Imported
          </Badge>
        ) : row.is_duplicate ? (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs font-semibold" title={row.duplicate_reason}>
            Duplicate
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
            Unique
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
});

export default function CallLogImportPreviewModal({
  open,
  onOpenChange,
  previewData,
  onSuccess
}: Props) {
  const [rows, setRows] = useState<IndexedRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'exact' | 'suggested' | 'new' | 'duplicate' | 'selected'>('all');
  const [subTab, setSubTab] = useState<'all' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pageSize, setPageSize] = useState(50);

  const { data: liveCallLogs } = useQuery<ExistingCallLogItem[]>({
    queryKey: ["live-existing-call-logs"],
    queryFn: async () => {
      return await api.get<ExistingCallLogItem[]>("/api/pipeline/call-logs/index");
    },
    enabled: open,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Pre-computed duplicate lookup index from live DB + preview data
  const dupIndex = useMemo(() => {
    return new DupLookupIndex(liveCallLogs || previewData?.existing_logs || []);
  }, [liveCallLogs, previewData?.existing_logs]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const [editingRowForCompany, setEditingRowForCompany] = useState<CallLogPreviewRow | null>(null);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    industry: '',
    location: '',
    contact_name: '',
    email: '',
    phone_number: '',
    state_province: '',
    country: ''
  });

  const queryClient = useQueryClient();
  const { mutate: confirmImport, isPending: isImporting } = useConfirmImportCallLog();
  const [importingRows, setImportingRows] = useState<Record<number, boolean>>({});
  const [removingRows, setRemovingRows] = useState<Record<number, boolean>>({});

  const handleRemoveSingleRow = useCallback(async (rowIndex: number) => {
    const targetRow = rows.find((r) => r.row_index === rowIndex);
    if (!targetRow) return;

    setRemovingRows((prev) => ({ ...prev, [rowIndex]: true }));
    try {
      await api.post("/api/pipeline/call-logs/delete-by-entry", {
        company_name: targetRow.company_name || targetRow.raw_company_name,
        date_of_call: targetRow.date_of_call,
        phone_number: targetRow.phone_number || targetRow.raw_phone_number
      });

      toast.success(`Removed call log for "${targetRow.company_name || targetRow.raw_company_name}" from database`);

      dupIndex.remove(
        targetRow.company_name || targetRow.raw_company_name,
        targetRow.phone_number || targetRow.raw_phone_number,
        targetRow.date_of_call
      );

      setRows((prev) =>
        prev.map((r) => {
          if (r.row_index === rowIndex) {
            return {
              ...r,
              is_imported: false,
              is_duplicate: false,
              duplicate_reason: "",
              selected_for_import: true
            };
          }
          const targetName = r.company_name || r.raw_company_name;
          const targetPhone = r.phone_number || r.raw_phone_number;
          const { isDup } = dupIndex.check(targetName, targetPhone, r.date_of_call);
          if (!isDup && r.is_duplicate && r.duplicate_reason?.includes(targetName)) {
            return {
              ...r,
              is_duplicate: false,
              duplicate_reason: "",
              selected_for_import: true
            };
          }
          return r;
        })
      );

      queryClient.invalidateQueries({ queryKey: ["live-existing-call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-tasks"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove call log from database");
    } finally {
      setRemovingRows((prev) => { const { [rowIndex]: _, ...rest } = prev; return rest; });
    }
  }, [rows, dupIndex, queryClient]);

  const handleImportSingleRow = useCallback((rowIndex: number) => {
    const targetRow = rows.find((r) => r.row_index === rowIndex);
    if (!targetRow) return;

    setImportingRows((prev) => ({ ...prev, [rowIndex]: true }));
    confirmImport([targetRow], {
      onSuccess: () => {
        toast.success(`Imported call log for "${targetRow.company_name || targetRow.raw_company_name}"`);
        
        // 1. Add this newly imported log to the duplicate lookup index
        dupIndex.add(
          targetRow.company_name || targetRow.raw_company_name,
          targetRow.phone_number || targetRow.raw_phone_number,
          targetRow.date_of_call,
          targetRow.analyst || targetRow.raw_analyst
        );

        // 2. Mark this row as imported, and immediately update any other row in this file to Duplicate
        setRows((prev) =>
          prev.map((r) => {
            if (r.row_index === rowIndex) {
              return {
                ...r,
                is_imported: true,
                is_confirmed: true,
                selected_for_import: false,
                is_duplicate: true,
                duplicate_reason: "Imported to database"
              };
            }
            const targetName = r.company_name || r.raw_company_name;
            const targetPhone = r.phone_number || r.raw_phone_number;
            const { isDup, dupReason } = dupIndex.check(targetName, targetPhone, r.date_of_call);
            if (isDup && !r.is_duplicate) {
              return {
                ...r,
                is_duplicate: true,
                duplicate_reason: dupReason,
                selected_for_import: false
              };
            }
            return r;
          })
        );

        // 3. Live invalidate caches without resetting modal preview state
        queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
        queryClient.invalidateQueries({ queryKey: ["call-tracking-summary-infinite"] });
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        queryClient.invalidateQueries({ queryKey: ["pipeline-tasks"] });

        setImportingRows((prev) => { const { [rowIndex]: _, ...rest } = prev; return rest; });
      },
      onError: (err: any) => {
        toast.error(err?.message || 'Failed to import call log row');
        setImportingRows((prev) => { const { [rowIndex]: _, ...rest } = prev; return rest; });
      }
    });
  }, [rows, confirmImport, dupIndex, queryClient]);
  const { data: analysts } = useAnalysts();
  const { data: countries } = useCountries();
  const { data: states } = useStates(companyForm.country || undefined);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchFilter(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Pre-index rows and check live duplicates when previewData or dupIndex updates
  useEffect(() => {
    if (previewData?.rows) {
      const indexed = previewData.rows.map((r) => {
        const phoneDigits = (r.phone_number || r.raw_phone_number || '').replace(/\D/g, '');
        const detectedPhonesStr = (r.detected_phones || []).join(' ');
        const suggestionsStr = (r.suggestions || []).map((s) => s.name).join(' ');

        // Check against live duplicate index
        const targetName = r.company_name || r.raw_company_name;
        const targetPhone = r.phone_number || r.raw_phone_number;
        const { isDup, dupReason } = dupIndex.check(targetName, targetPhone, r.date_of_call);
        const finalIsDup = r.is_imported || isDup || r.is_duplicate;
        const finalReason = r.is_imported ? "Imported to database" : (dupReason || r.duplicate_reason);

        const rowText = [
          r.company_name,
          r.raw_company_name,
          (r as any).suggested_company_name,
          (r as any).close_match_company_name,
          r.contact_name,
          r.raw_contact_name,
          r.position,
          r.phone_number,
          r.raw_phone_number,
          phoneDigits,
          detectedPhonesStr,
          suggestionsStr,
          r.analyst,
          r.raw_analyst,
          r.industry,
          r.state_province,
          r.location,
          r.outcome,
          r.date_of_call,
          r.notes,
          finalReason,
          finalIsDup ? 'duplicate dup' : '',
          r.match_type ? `match-${r.match_type} ${r.match_type}` : '',
          r.kdm ? 'kdm' : '',
          r.picked_up ? 'picked up' : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return {
          ...r,
          is_duplicate: finalIsDup,
          duplicate_reason: finalReason,
          selected_for_import: r.is_imported ? false : !finalIsDup,
          _searchKey: rowText,
          _searchClean: rowText.replace(/[^a-z0-9]/g, '')
        };
      });
      setRows(indexed);
    }
  }, [previewData, liveCallLogs]);





  // Fast Filtering with robust symbol, phrase, and word-boundary matching
  const filteredRows = useMemo(() => {
    let list = rows;
    let term = searchFilter.trim().toLowerCase();

    // Strip common copy-paste prefixes like 'File: ' or quotes
    if (term.startsWith('file:')) {
      term = term.slice(5).trim();
    }
    term = term.replace(/^["']|["']$/g, '').trim();

    if (term) {
      const termClean = term.replace(/[^a-z0-9]/g, '');
      const normTerm = term.replace(/&/g, ' and ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanTokens = term.split(/[^a-z0-9]+/i).filter(Boolean);
      const rawTokens = term.split(/\s+/).filter(Boolean);

      list = list.filter((r) => {
        // 1. Direct raw substring match
        if (r._searchKey.includes(term)) return true;

        // 2. Alphanumeric clean match (matches 'L & L', 'L&L', 'L and L', '225-274-5482', etc.)
        if (termClean && r._searchClean.includes(termClean)) return true;

        // 3. Normalized phrase match (ampersand to 'and', stripped punctuation)
        const rowNorm = r._searchKey.replace(/&/g, ' and ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        if (normTerm && rowNorm.includes(normTerm)) return true;

        // 4. Multi-word token match (all words/tokens present)
        if (cleanTokens.length > 0) {
          const allTokensMatch = cleanTokens.every((token) => {
            return r._searchKey.includes(token) || r._searchClean.includes(token);
          });
          if (allTokensMatch) return true;
        }

        // 5. Raw tokens fallback
        if (rawTokens.length > 1) {
          const allRawMatch = rawTokens.every((token) => {
            const tClean = token.replace(/[^a-z0-9]/g, '');
            return r._searchKey.includes(token) || (tClean && r._searchClean.includes(tClean));
          });
          if (allRawMatch) return true;
        }

        return false;
      });
    }

    if (statusFilter === 'exact') {
      list = list.filter((r) => r.match_type === 'exact');
    } else if (statusFilter === 'suggested') {
      list = list.filter((r) => r.match_type === 'suggested');
    } else if (statusFilter === 'new') {
      list = list.filter((r) => r.match_type === 'new');
    } else if (statusFilter === 'duplicate') {
      list = list.filter((r) => r.is_duplicate);
    } else if (statusFilter === 'selected') {
      list = list.filter((r) => r.selected_for_import);
    }

    // Apply pending filter if selected (excludes confirmed, imported, and duplicates)
    if (subTab === 'pending') {
      list = list.filter((r) => !r.is_imported && !r.is_confirmed && !r.is_duplicate);
    }
    return list;
  }, [rows, searchFilter, statusFilter, subTab]);

  useEffect(() => {
    setPage(1);
  }, [searchFilter, statusFilter, subTab, previewData]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Single-pass stats with comprehensive All vs Pending breakdown
  const stats = useMemo(() => {
    let allTotal = rows.length;
    let allExact = 0;
    let allSuggested = 0;
    let allNew = 0;
    let allDuplicate = 0;
    let allConfirmed = 0;
    let selectedCount = 0;

    let pendingTotal = 0;
    let pendingExact = 0;
    let pendingSuggested = 0;
    let pendingNew = 0;
    let pendingDuplicate = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.selected_for_import) selectedCount++;

      const isPending = !r.is_imported && !r.is_confirmed && !r.is_duplicate;

      if (r.match_type === 'exact') {
        allExact++;
        if (isPending) pendingExact++;
      } else if (r.match_type === 'suggested') {
        allSuggested++;
        if (isPending) pendingSuggested++;
      } else if (r.match_type === 'new') {
        allNew++;
        if (isPending) pendingNew++;
      }

      if (r.is_duplicate) {
        allDuplicate++;
      }

      if (r.is_confirmed || r.is_imported) {
        allConfirmed++;
      }

      if (isPending) {
        pendingTotal++;
      }
    }

    return {
      selectedCount,
      allTotal,
      pendingTotal,
      confirmedCount: allConfirmed,
      allExact,
      pendingExact,
      allSuggested,
      pendingSuggested,
      allNew,
      pendingNew,
      allDuplicate,
      pendingDuplicate,
      total: allTotal,
      exactCount: allExact,
      suggestedCount: allSuggested,
      newCount: allNew,
      duplicateCount: allDuplicate,
    };
  }, [rows]);

  // Context-aware counts for the All vs Pending subTab based on currently selected category
  const activeCategoryCounts = useMemo(() => {
    if (statusFilter === 'exact') {
      return { total: stats.allExact, pending: stats.pendingExact };
    }
    if (statusFilter === 'suggested') {
      return { total: stats.allSuggested, pending: stats.pendingSuggested };
    }
    if (statusFilter === 'new') {
      return { total: stats.allNew, pending: stats.pendingNew };
    }
    if (statusFilter === 'duplicate') {
      return { total: stats.allDuplicate, pending: stats.pendingDuplicate };
    }
    return { total: stats.allTotal, pending: stats.pendingTotal };
  }, [statusFilter, stats]);

  // Stable event callbacks for memoized rows
  const handleToggleRow = useCallback((index: number, checked: boolean) => {
    setRows((prev) => prev.map((r) => (r.row_index === index ? { ...r, selected_for_import: checked } : r)));
  }, []);

  const handleAnalystChange = useCallback((index: number, analystId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_index !== index) return r;
        const selectedAnalyst = analysts?.find((a) => a.id === analystId);
        return {
          ...r,
          analyst_id: analystId === 'unassigned' ? null : analystId,
          analyst: (selectedAnalyst?.full_name ?? r.analyst) || undefined
        };
      })
    );
  }, [analysts]);

  const handlePhoneChange = useCallback((index: number, val: string) => {
    setRows((prev) => prev.map((r) => (r.row_index === index ? { ...r, phone_number: val } : r)));
  }, []);

  const handleUnconfirmRow = useCallback((index: number) => {
    setRows((prev) => prev.map((r) => (r.row_index === index ? { ...r, is_confirmed: false } : r)));
  }, []);

  const handleOpenCompanyModal = useCallback((row: CallLogPreviewRow) => {
    setEditingRowForCompany(row);
    setCompanyForm({
      company_name: row.company_name || row.raw_company_name || '',
      industry: row.industry || row.raw_industry || '',
      location: row.location || row.raw_location || '',
      contact_name: row.contact_name || row.raw_contact_name || '',
      email: row.email || '',
      phone_number: row.phone_number || row.raw_phone_number || '',
      state_province: row.state_province || row.raw_state_province || '',
      country: row.country || row.location || row.raw_location || ''
    });
  }, []);

  const handleCompanyChange = useCallback((index: number, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_index !== index) return r;
        let targetCompanyName = r.raw_company_name;
        let matchedCompanyId: number | null = null;
        let matchType: 'exact' | 'suggested' | 'new' = r.match_type;

        let targetIndustry = r.raw_industry || r.industry;
        let targetState = r.raw_state_province || r.state_province;
        let targetLocation = r.raw_location || r.location;
        let targetContact = r.raw_contact_name || r.contact_name;
        let targetPosition = r.raw_position || r.position;
        let targetPhone = r.raw_phone_number || r.phone_number;

        if (value !== '__NEW__') {
          const match = r.suggestions ? r.suggestions.find((s) => String(s.id) === value) : null;
          matchedCompanyId = match ? match.id : Number(value) || null;
          targetCompanyName = match ? match.name : value;
          matchType = 'suggested';

          if (match) {
            targetIndustry = match.industry || targetIndustry;
            targetState = match.state_province || targetState;
            targetLocation = match.location || targetLocation;
            targetContact = match.contact_name || targetContact;
            targetPosition = match.position || targetPosition;
            targetPhone = match.phone_number || targetPhone;
          }
        } else {
          matchedCompanyId = null;
          targetCompanyName = r.raw_company_name;
          matchType = 'new';
          targetIndustry = r.raw_industry;
          targetState = r.raw_state_province;
          targetLocation = r.raw_location;
          targetContact = r.raw_contact_name;
          targetPosition = r.raw_position;
          targetPhone = r.raw_phone_number;
        }

        const { isDup, dupReason } = dupIndex.check(targetCompanyName, targetPhone, r.date_of_call);

        return {
          ...r,
          matched_company_id: matchedCompanyId,
          company_name: targetCompanyName,
          industry: targetIndustry,
          state_province: targetState,
          location: targetLocation,
          contact_name: targetContact,
          position: targetPosition,
          phone_number: targetPhone,
          match_type: matchType,
          is_duplicate: isDup,
          duplicate_reason: dupReason,
          is_confirmed: false,
          has_user_changed: true,
          selected_for_import: !isDup
        };
      })
    );
  }, [dupIndex]);

  const handleConfirmSingleMatch = useCallback((rowIndex: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_index !== rowIndex) return r;
        const targetName = r.company_name || r.raw_company_name;
        const { isDup, dupReason } = dupIndex.check(targetName, r.phone_number, r.date_of_call);
        return {
          ...r,
          is_confirmed: true,
          is_duplicate: isDup,
          duplicate_reason: dupReason,
          selected_for_import: !isDup,
        };
      })
    );
  }, [dupIndex]);

  const handleToggleAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected_for_import: checked })));
  };

  const handleDeselectDuplicates = () => {
    setRows((prev) => prev.map((r) => (r.is_duplicate ? { ...r, selected_for_import: false } : r)));
  };

  const handleConfirmAllSuggested = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.match_type !== 'suggested' && (!r.suggestions || r.suggestions.length === 0)) return r;
        const targetName = r.company_name || r.raw_company_name;
        const { isDup, dupReason } = dupIndex.check(targetName, r.phone_number, r.date_of_call);
        return {
          ...r,
          is_confirmed: true,
          is_duplicate: isDup,
          duplicate_reason: dupReason,
          selected_for_import: !isDup
        };
      })
    );
  };

  const handleExportPreview = () => {
    try {
      const dataToExport = filteredRows.length > 0 ? filteredRows : rows;
      const cols: ExportColumn<CallLogPreviewRow>[] = [
        { header: 'Company Matching', accessor: (r) => r.company_name || r.raw_company_name || '' },
        { header: 'File Company Name', accessor: (r) => r.raw_company_name || '' },
        { header: 'Match Type', accessor: (r) => r.match_type },
        { header: 'Industry', accessor: (r) => r.industry || r.raw_industry || '' },
        { header: 'State/Province', accessor: (r) => r.state_province || r.raw_state_province || '' },
        { header: 'Country', accessor: (r) => r.location || r.raw_location || '' },
        { header: 'Contact', accessor: (r) => r.contact_name || r.raw_contact_name || '' },
        { header: 'Position', accessor: (r) => r.position || r.raw_position || '' },
        { header: 'Phone', accessor: (r) => r.phone_number || r.raw_phone_number || '' },
        { header: 'Date', accessor: (r) => r.date_of_call || '' },
        { header: 'KDM', accessor: (r) => r.kdm || r.raw_kdm || '' },
        { header: 'Picked Up?', accessor: (r) => r.picked_up || '' },
        { header: 'Outcome', accessor: (r) => r.outcome || '' },
        { header: 'Length', accessor: (r) => r.call_length || '' },
        { header: 'Analyst', accessor: (r) => r.analyst || '' },
        { header: 'Notes', accessor: (r) => r.notes || '' },
        { header: 'Duplicate Check', accessor: (r) => (r.is_duplicate ? 'Duplicate' : 'Unique') }
      ];
      exportToCsv(dataToExport, cols, 'call_log_job_preview');
      toast.success('Job preview rows exported successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export job preview');
    }
  };

  const handleSaveCompanyForm = () => {
    if (!editingRowForCompany) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.row_index !== editingRowForCompany.row_index) return r;
        return {
          ...r,
          company_name: companyForm.company_name.trim(),
          industry: companyForm.industry.trim() || undefined,
          location: companyForm.location.trim() || undefined,
          contact_name: companyForm.contact_name.trim() || undefined,
          email: companyForm.email.trim() || undefined,
          phone_number: companyForm.phone_number.trim() || undefined,
          state_province: companyForm.state_province.trim() || undefined,
          country: companyForm.country.trim() || undefined,
          has_user_changed: true
        };
      })
    );
    setEditingRowForCompany(null);
  };

  const handleConfirm = () => {
    const selectedRows = rows.filter((r) => r.selected_for_import);
    confirmImport(selectedRows, {
      onSuccess: () => {
        onSuccess();
        onOpenChange(false);
      }
    });
  };

  if (!previewData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-[98vw] max-w-[98vw] sm:max-w-[98vw] md:max-w-[98vw] lg:max-w-[98vw] h-[94vh] max-h-[94vh] flex flex-col p-5 sm:p-6 gap-4 overflow-hidden"
      >
        <DialogHeader className="pb-1 shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-primary" />
            Call Log Import Preview & Matching
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Review detected companies, smart fuzzy suggestions, and potential duplicate call logs before importing.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar (Clickable Filters) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`border rounded-lg p-1.5 sm:p-2 text-center transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-muted border-primary/50 shadow-xs ring-2 ring-primary/30'
                  : 'bg-muted/30 border-border hover:bg-muted/60'
            }`}
          >
            <div className="text-xs sm:text-sm text-muted-foreground font-medium mb-0.5">Total Rows</div>
            <div className="text-base sm:text-lg font-bold">{stats.allTotal}</div>
            <div className="text-[10px] text-muted-foreground">{stats.pendingTotal} pending</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'exact' ? 'all' : 'exact')}
            className={`border rounded-lg p-1.5 sm:p-2 text-center transition-all cursor-pointer ${
                statusFilter === 'exact'
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-xs ring-2 ring-emerald-500/40'
                  : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
            }`}
          >
            <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">Exact Matches</div>
            <div className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.allExact}</div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">{stats.pendingExact} pending</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'suggested' ? 'all' : 'suggested')}
            className={`border rounded-lg p-1.5 sm:p-2 text-center transition-all cursor-pointer ${
                statusFilter === 'suggested'
                  ? 'bg-amber-500/20 border-amber-500 shadow-xs ring-2 ring-amber-500/40'
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
            }`}
          >
            <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium mb-0.5">Suggested Matches</div>
            <div className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">{stats.allSuggested}</div>
            <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">{stats.pendingSuggested} pending</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}
            className={`border rounded-lg p-1.5 sm:p-2 text-center transition-all cursor-pointer ${
                statusFilter === 'new'
                  ? 'bg-blue-500/20 border-blue-500 shadow-xs ring-2 ring-blue-500/40'
                  : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
            }`}
          >
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mb-0.5">New Companies</div>
            <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">{stats.allNew}</div>
            <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80">{stats.pendingNew} pending</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'duplicate' ? 'all' : 'duplicate')}
            className={`border rounded-lg p-1.5 sm:p-2 text-center transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                statusFilter === 'duplicate'
                  ? 'bg-rose-500/20 border-rose-500 shadow-xs ring-2 ring-rose-500/40'
                  : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15'
            }`}
          >
            <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium mb-0.5">Duplicates</div>
            <div className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300">{stats.allDuplicate}</div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80">{stats.pendingDuplicate} pending</div>
          </button>
        </div>


        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                placeholder="Search across all fields, phone, notes, company..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-9 sm:h-10 text-xs sm:text-sm bg-background/80"
              />
            </div>
            {searchInput && (
              <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => setSearchInput('')}>
                Clear
              </Button>
            )}
          </div>
          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'all'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                {activeCategoryCounts.total}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('pending')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'pending'
                  ? 'bg-background text-foreground shadow-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Pending</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeCategoryCounts.pending > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {activeCategoryCounts.pending}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 sm:h-10 text-xs sm:text-sm px-3 text-muted-foreground hover:text-foreground"
              onClick={handleExportPreview}
              title="Export rows shown in preview to CSV"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>

            {stats.suggestedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 sm:h-10 text-xs sm:text-sm px-3.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-medium"
                onClick={handleConfirmAllSuggested}
              >
                Accept All Suggestions ({stats.suggestedCount})
              </Button>
            )}

            {stats.duplicateCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 sm:h-10 text-xs sm:text-sm px-3.5 bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                onClick={handleDeselectDuplicates}
              >
                Deselect Duplicates
              </Button>
            )}

            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-3" onClick={() => handleToggleAll(true)}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-3" onClick={() => handleToggleAll(false)}>
              Deselect All
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="border rounded-xl flex-1 min-h-0 overflow-x-auto overflow-y-auto bg-card shadow-xs overscroll-contain">
          <Table className="text-xs min-w-[1850px] w-full" containerClassName="none">
            <TableHeader className="sticky top-0 bg-muted/95 z-10 backdrop-blur-xs shadow-xs">
              <TableRow className="h-8">
                <TableHead className="w-12 text-center py-3 px-3">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((r) => r.selected_for_import)}
                    onCheckedChange={(checked) => handleToggleAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="w-[420px] py-1.5 px-3 font-semibold text-xs">Company Matching</TableHead>
                <TableHead className="w-[150px] py-1.5 px-2.5 font-semibold text-xs">Industry</TableHead>
                <TableHead className="w-[100px] py-1.5 px-2.5 font-semibold text-xs">State/Province</TableHead>
                <TableHead className="w-[100px] py-1.5 px-2.5 font-semibold text-xs">Country</TableHead>
                <TableHead className="w-[150px] py-1.5 px-2.5 font-semibold text-xs">Contact</TableHead>
                <TableHead className="w-[140px] py-1.5 px-2.5 font-semibold text-xs">Phone</TableHead>
                <TableHead className="w-[110px] py-1.5 px-2.5 font-semibold text-xs">Date</TableHead>
                <TableHead className="w-[90px] py-1.5 px-2.5 text-center font-semibold text-xs">KDM</TableHead>
                <TableHead className="w-[100px] py-1.5 px-2.5 text-center font-semibold text-xs">Picked Up?</TableHead>
                <TableHead className="w-[150px] py-1.5 px-2.5 font-semibold text-xs">Outcome</TableHead>
                <TableHead className="w-[100px] py-1.5 px-2.5 text-center font-semibold text-xs">Length</TableHead>
                <TableHead className="w-[200px] py-1.5 px-2.5 font-semibold text-xs">Analyst</TableHead>
                <TableHead className="w-[280px] py-1.5 px-3 font-semibold text-xs">Notes</TableHead>
                <TableHead className="w-[140px] py-1.5 px-2.5 font-semibold text-xs">Duplicate Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => (
                <TableRowItem
                  key={row.row_index}
                  row={row}
                  analysts={analysts}
                  isImportingSingle={Boolean(importingRows[row.row_index])}
                  isRemovingSingle={Boolean(removingRows[row.row_index])}
                  onToggleRow={handleToggleRow}
                  onCompanyChange={handleCompanyChange}
                  onPhoneChange={handlePhoneChange}
                  onAnalystChange={handleAnalystChange}
                  onOpenCompanyModal={handleOpenCompanyModal}
                  onUnconfirmRow={handleUnconfirmRow}
                  onConfirmRow={handleConfirmSingleMatch}
                  onImportSingleRow={handleImportSingleRow}
                  onRemoveSingleRow={handleRemoveSingleRow}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border rounded-xl bg-muted/20 text-xs sm:text-sm text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} rows
            </span>
            <div className="flex items-center gap-2 ml-4">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 text-xs sm:text-sm rounded-md border border-border bg-background px-2 focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs sm:text-sm"
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs sm:text-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <div className="flex items-center gap-1.5 px-2 font-medium text-foreground text-xs sm:text-sm">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => {
                  setPageInput(e.target.value);
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setPage(val);
                  }
                }}
                onBlur={() => {
                  const val = parseInt(pageInput, 10);
                  if (isNaN(val) || val < 1) {
                    setPage(1);
                    setPageInput("1");
                  } else if (val > totalPages) {
                    setPage(totalPages);
                    setPageInput(String(totalPages));
                  } else {
                    setPage(val);
                    setPageInput(String(val));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(pageInput, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setPage(val);
                    }
                  }
                }}
                className="h-6 w-9 sm:w-10 rounded border border-input bg-background px-1 py-0 text-center text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>of {totalPages}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs sm:text-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs sm:text-sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              Last
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t shrink-0">
          <div className="text-sm text-muted-foreground">
            Ready to import <span className="font-semibold text-foreground">{stats.selectedCount}</span> of {stats.total} rows.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-sm px-4" onClick={() => onOpenChange(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 sm:h-10 text-sm px-5 font-semibold"
              disabled={stats.selectedCount === 0 || isImporting}
              onClick={handleConfirm}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Confirm & Import (${stats.selectedCount} Rows)`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Set Up Company Details Modal */}
      <Dialog open={!!editingRowForCompany} onOpenChange={(o) => !o && setEditingRowForCompany(null)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Add / Set Up Company Info
            </DialogTitle>
            <DialogDescription>
              Configure company metadata for <strong className="text-foreground font-semibold">"{editingRowForCompany?.raw_company_name}"</strong> before confirming import.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Company Name *</label>
              <Input
                value={companyForm.company_name}
                onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                placeholder="e.g. Acme Corporation"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Country</label>
                <AutocompleteCombobox
                  options={countries?.map((c) => ({ id: c.name, name: c.name })) || []}
                  value={companyForm.country}
                  onChange={(val) => setCompanyForm({ ...companyForm, country: val, state_province: '' })}
                  placeholder="Select country..."
                  
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">State / Province</label>
                <AutocompleteCombobox
                  options={states?.map((s) => ({ id: s.name, name: s.name })) || []}
                  value={companyForm.state_province}
                  onChange={(val) => setCompanyForm({ ...companyForm, state_province: val })}
                  placeholder="Select state..."
                  
                  disabled={!companyForm.country}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Contact Name</label>
                <Input
                  value={companyForm.contact_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, contact_name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                <Input
                  value={companyForm.phone_number}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone_number: e.target.value })}
                  placeholder="e.g. (555) 000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingRowForCompany(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompanyForm} disabled={!companyForm.company_name.trim()}>
              Save & Apply to Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
