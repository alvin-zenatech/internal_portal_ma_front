import { useState, useEffect, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Building2, HelpCircle, PlusCircle, Search, Loader2, Check } from 'lucide-react';
import { type CallLogPreviewResponse, type CallLogPreviewRow, type ExistingCallLogItem, useConfirmImportCallLog } from '@/hooks/usePipeline';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: CallLogPreviewResponse | null;
  onSuccess: () => void;
}

export default function CallLogImportPreviewModal({
  open,
  onOpenChange,
  previewData,
  onSuccess
}: Props) {
  const [rows, setRows] = useState<CallLogPreviewRow[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  const { mutate: confirmImport, isPending: isImporting } = useConfirmImportCallLog();

  useEffect(() => {
    if (previewData?.rows) {
      setRows(previewData.rows);
    }
  }, [previewData]);

  const filteredRows = useMemo(() => {
    if (!searchFilter.trim()) return rows;
    const term = searchFilter.toLowerCase();
    return rows.filter(r =>
      r.raw_company_name.toLowerCase().includes(term) ||
      r.company_name.toLowerCase().includes(term) ||
      (r.contact_name && r.contact_name.toLowerCase().includes(term)) ||
      (r.analyst && r.analyst.toLowerCase().includes(term)) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  }, [rows, searchFilter]);

  const stats = useMemo(() => {
    const selectedCount = rows.filter(r => r.selected_for_import).length;
    const exactCount = rows.filter(r => r.match_type === 'exact').length;
    const suggestedCount = rows.filter(r => r.match_type === 'suggested').length;
    const newCount = rows.filter(r => r.match_type === 'new').length;
    const duplicateCount = rows.filter(r => r.is_duplicate).length;
    const confirmedCount = rows.filter(r => r.is_confirmed).length;
    return { selectedCount, exactCount, suggestedCount, newCount, duplicateCount, confirmedCount, total: rows.length };
  }, [rows]);

  const handleToggleRow = (index: number, checked: boolean) => {
    setRows(prev => prev.map(r => r.row_index === index ? { ...r, selected_for_import: checked } : r));
  };

  const handleToggleAll = (checked: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected_for_import: checked })));
  };

  const handleDeselectDuplicates = () => {
    setRows(prev => prev.map(r => r.is_duplicate ? { ...r, selected_for_import: false } : r));
  };

  const normalizeForDupCheck = (str?: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const normalizePhoneDigits = (str?: string) => {
    if (!str) return '';
    return str.replace(/\D/g, '');
  };

  const checkDuplicateRow = (
    targetName: string,
    phoneStr?: string,
    dateStr?: string,
    existingLogs: ExistingCallLogItem[] = [],
    otherRows: CallLogPreviewRow[] = [],
    currentRowIndex?: number
  ): { isDup: boolean; dupReason: string } => {
    const normTarget = normalizeForDupCheck(targetName);
    const normPhone = normalizePhoneDigits(phoneStr);

    if (!normTarget) return { isDup: false, dupReason: '' };

    // 1. Check DB existing logs
    for (const ex of existingLogs) {
      const exComp = normalizeForDupCheck(ex.company_name);
      const exPhone = normalizePhoneDigits(ex.phone_number);

      // Company name MUST match target company
      if (exComp === normTarget) {
        // A. Company match + Date match
        if (dateStr && ex.date_of_call === dateStr) {
          let reason = `Call log already exists for '${targetName}' on ${dateStr}`;
          if (ex.analyst) reason += ` by ${ex.analyst.toUpperCase()}`;
          return { isDup: true, dupReason: reason };
        }

        // B. Company match + Phone match
        if (normPhone && normPhone.length >= 7 && exPhone === normPhone) {
          let reason = `Call log already exists for '${targetName}' (phone ${phoneStr || normPhone})`;
          if (ex.date_of_call) reason += ` on ${ex.date_of_call}`;
          if (ex.analyst) reason += ` by ${ex.analyst.toUpperCase()}`;
          return { isDup: true, dupReason: reason };
        }
      }
    }

    // 2. Check other rows in current file
    for (const other of otherRows) {
      if (other.row_index === currentRowIndex || !other.selected_for_import) continue;

      const otherComp = normalizeForDupCheck(other.company_name);
      const otherPhone = normalizePhoneDigits(other.phone_number);

      if (otherComp === normTarget) {
        if (dateStr && other.date_of_call === dateStr) {
          return {
            isDup: true,
            dupReason: `Duplicate call log in file for '${targetName}' on ${dateStr}`
          };
        }

        if (normPhone && normPhone.length >= 7 && otherPhone === normPhone) {
          return {
            isDup: true,
            dupReason: `Duplicate call log in file for '${targetName}' (phone ${phoneStr || normPhone})`
          };
        }
      }
    }

    return { isDup: false, dupReason: '' };
  };

  const handleCompanyChange = (index: number, value: string) => {
    setRows(prev => prev.map(r => {
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
        const match = r.suggestions ? r.suggestions.find(s => String(s.id) === value) : null;
        matchedCompanyId = match ? match.id : Number(value) || null;
        targetCompanyName = match ? match.name : value;

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
        targetIndustry = r.raw_industry;
        targetState = r.raw_state_province;
        targetLocation = r.raw_location;
        targetContact = r.raw_contact_name;
        targetPosition = r.raw_position;
        targetPhone = r.raw_phone_number;
      }

      const existingLogs = previewData?.existing_logs || [];
      const { isDup, dupReason } = checkDuplicateRow(
        targetCompanyName,
        targetPhone,
        r.date_of_call,
        existingLogs,
        prev,
        r.row_index
      );

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
    }));
  };

  const handleConfirmSingleMatch = (index: number) => {
    setRows(prev => {
      const targetRow = prev.find(r => r.row_index === index);
      if (!targetRow) return prev;

      const targetName = targetRow.company_name || targetRow.raw_company_name;
      const existingLogs = previewData?.existing_logs || [];

      const { isDup, dupReason } = checkDuplicateRow(
        targetName,
        targetRow.phone_number,
        targetRow.date_of_call,
        existingLogs,
        prev,
        index
      );

      return prev.map(r => {
        if (r.row_index !== index) return r;
        return {
          ...r,
          is_confirmed: true,
          is_duplicate: isDup,
          duplicate_reason: dupReason,
          selected_for_import: !isDup
        };
      });
    });
  };

  const handleConfirmAllSuggested = () => {
    setRows(prev => {
      const existingLogs = previewData?.existing_logs || [];

      return prev.map((r, _idx, arr) => {
        if (r.match_type !== 'suggested' && (!r.suggestions || r.suggestions.length === 0)) return r;

        const targetName = r.company_name || r.raw_company_name;
        const { isDup, dupReason } = checkDuplicateRow(
          targetName,
          r.phone_number,
          r.date_of_call,
          existingLogs,
          arr,
          r.row_index
        );

        return {
          ...r,
          is_confirmed: true,
          is_duplicate: isDup,
          duplicate_reason: dupReason,
          selected_for_import: !isDup
        };
      });
    });
  };

  const handleConfirm = () => {
    const selectedRows = rows.filter(r => r.selected_for_import);
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
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] lg:max-w-[92vw] max-h-[92vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Call Log Import Preview & Matching
          </DialogTitle>
          <DialogDescription>
            Review detected companies, smart fuzzy suggestions, and potential duplicate call logs before importing.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-2">
          <div className="bg-muted/40 border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground font-medium">Total Rows</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Exact Matches</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.exactCount}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Suggested Matches</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.suggestedCount}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">New Companies</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.newCount}</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Duplicates</div>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{stats.duplicateCount}</div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 my-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact, analyst..."
              className="pl-9 h-9 text-sm"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {stats.suggestedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-medium"
                onClick={handleConfirmAllSuggested}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Confirm All Suggested ({stats.suggestedCount})
              </Button>
            )}
            {stats.duplicateCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                onClick={handleDeselectDuplicates}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Deselect Duplicates ({stats.duplicateCount})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleToggleAll(true)}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleToggleAll(false)}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="border rounded-md overflow-hidden flex-1 max-h-[58vh] overflow-y-auto">
          <Table className="text-sm min-w-[1700px] w-full">
            <TableHeader className="sticky top-0 bg-muted/90 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={rows.length > 0 && rows.every(r => r.selected_for_import)}
                    onCheckedChange={(checked) => handleToggleAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="w-[340px]">Company Matching</TableHead>
                <TableHead className="w-[140px]">Industry</TableHead>
                <TableHead className="w-[80px]">State</TableHead>
                <TableHead className="w-[80px]">Location</TableHead>
                <TableHead className="w-[140px]">Contact</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px]">Emailed?</TableHead>
                <TableHead className="w-[90px]">Picked Up?</TableHead>
                <TableHead className="w-[140px]">Outcome</TableHead>
                <TableHead className="w-[90px]">Length</TableHead>
                <TableHead className="w-[80px]">Analyst</TableHead>
                <TableHead className="w-[260px]">Notes</TableHead>
                <TableHead className="w-[140px]">Duplicate Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.row_index}
                  className={`hover:bg-muted/50 ${!row.selected_for_import ? 'opacity-50 bg-muted/20' : row.is_duplicate ? 'bg-rose-500/5' : ''}`}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.selected_for_import}
                      onCheckedChange={(checked) => handleToggleRow(row.row_index, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-xs text-muted-foreground truncate max-w-[140px]" title={row.raw_company_name}>
                        File: "{row.raw_company_name}"
                      </span>
                      {row.match_type === 'exact' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Exact
                        </Badge>
                      )}
                      {row.match_type === 'suggested' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0">
                          <HelpCircle className="h-2.5 w-2.5 mr-1" /> Suggested
                        </Badge>
                      )}
                      {row.match_type === 'new' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] py-0">
                          <PlusCircle className="h-2.5 w-2.5 mr-1" /> New Company
                        </Badge>
                      )}
                    </div>

                    {/* Company Dropdown / Candidate Selector + Confirm Button */}
                    {row.is_confirmed ? (
                      <div className="flex items-center justify-between gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate" title={row.company_name}>
                          ✓ Confirmed: {row.company_name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setRows(prev => prev.map(r => r.row_index === row.row_index ? { ...r, is_confirmed: false } : r))}
                        >
                          Edit
                        </Button>
                      </div>
                    ) : row.suggestions && row.suggestions.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={row.matched_company_id ? String(row.matched_company_id) : '__NEW__'}
                          onValueChange={(val) => handleCompanyChange(row.row_index, val)}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                            <SelectValue placeholder="Select matched company..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            <SelectItem value="__NEW__" className="text-xs text-blue-600 font-medium">
                              + Create as New Company: "{row.raw_company_name}"
                            </SelectItem>
                            {row.suggestions.map(s => (
                              <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                                {s.name} {s.score < 1 ? `(${Math.round(s.score * 100)}% match)` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(row.match_type === 'suggested' || row.has_user_changed) && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium flex items-center gap-1 shadow-sm"
                            onClick={() => handleConfirmSingleMatch(row.row_index)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirm Match
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="font-semibold text-xs truncate" title={row.company_name}>
                        {row.company_name}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-xs truncate" title={row.industry}>{row.industry || '-'}</TableCell>
                  <TableCell className="text-xs">{row.state_province || '-'}</TableCell>
                  <TableCell className="text-xs">{row.location || '-'}</TableCell>
                  <TableCell className="text-xs truncate" title={`${row.contact_name || ''} ${row.position ? `(${row.position})` : ''}`}>
                    {row.contact_name || '-'}
                    {row.position && <span className="text-[10px] text-muted-foreground block truncate">{row.position}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.phone_number || '-'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{row.date_of_call || '-'}</TableCell>
                  <TableCell className="text-xs font-medium">{row.emailed || '-'}</TableCell>
                  <TableCell className="text-xs font-medium">{row.picked_up || '-'}</TableCell>
                  <TableCell className="text-xs">{row.outcome || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{row.call_length || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{row.analyst || '-'}</TableCell>

                  <TableCell className="text-xs text-muted-foreground truncate max-w-[250px]" title={row.notes}>
                    {row.notes || '-'}
                  </TableCell>

                  <TableCell>
                    {row.is_duplicate ? (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[11px]" title={row.duplicate_reason}>
                        <AlertTriangle className="h-3 w-3 mr-1" /> Duplicate Call
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">Clear</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-2">
          <div className="text-xs text-muted-foreground">
            Ready to import <span className="font-semibold text-foreground">{stats.selectedCount}</span> of {stats.total} rows.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              size="sm"
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
    </Dialog>
  );
}
