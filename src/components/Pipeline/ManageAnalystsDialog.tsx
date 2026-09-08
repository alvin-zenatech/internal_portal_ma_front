import { useState, useMemo, useEffect } from 'react';
import { getUserInitials } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Save, Loader2, Users, Briefcase, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useExecutionAnalystOptions } from '@/hooks/useExecutionAnalyst';
import { useAnalysts, usePipelineUsers, useBatchUpdateAnalysts, useBatchUpdateExecutionAnalysts } from '@/hooks/usePipeline';

interface ManageAnalystsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'bd' | 'execution';
}

export default function ManageAnalystsDialog({
  open,
  onOpenChange,
  defaultTab = 'bd',
}: ManageAnalystsDialogProps) {
  const [activeTab, setActiveTab] = useState<'bd' | 'execution'>(defaultTab);

  // Sync defaultTab when dialog opens
  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // --- Common User & Analyst Data ---
  const { data: bdAnalysts = [], isLoading: isLoadingBD } = useAnalysts();
  const { data: allUsers = [], isLoading: isLoadingUsers } = usePipelineUsers();
  const batchUpdateBD = useBatchUpdateAnalysts();
  const batchUpdateExec = useBatchUpdateExecutionAnalysts();

  // --- BD Analysts State ---
  const [bdSearch, setBdSearch] = useState('');
  const [selectedBdIds, setSelectedBdIds] = useState<Set<string>>(new Set());
  const [isSavingBD, setIsSavingBD] = useState(false);

  // --- Execution Analysts State ---
  const {
    options: execOptions,
    isLoading: isLoadingExec,
  } = useExecutionAnalystOptions();

  const [execSearch, setExecSearch] = useState('');
  const [selectedExecInitials, setSelectedExecInitials] = useState<Set<string>>(new Set());
  const [isSavingExec, setIsSavingExec] = useState(false);

  // Reset selections when dialog opens or master data updates
  useEffect(() => {
    if (open) {
      setSelectedBdIds(new Set(bdAnalysts.map((a) => a.id)));
      setSelectedExecInitials(new Set(execOptions.map((o) => o.initials.toUpperCase())));
    }
  }, [open, bdAnalysts, execOptions]);

  const isSuperAdmin = (u: any) => {
    if ((u as any).is_super_admin === true || (u as any).isSuperAdmin === true) return true;
    const name = (u.full_name || u.name || '').toLowerCase();
    if (name === 'super admin' || name.includes('super admin')) return true;
    const email = (u.email || '').toLowerCase();
    if (email.includes('superadmin') || email.includes('super_admin')) return true;
    return false;
  };

  const isInactive = (u: any) => {
    if ((u as any).is_active === false || (u as any).isActive === false) return true;
    if ((u as any).status === 'inactive') return true;
    return false;
  };

  // Build candidate system users for BD Analysts (all active system users)
  const allCandidateBDUsers = useMemo(() => {
    const existingBDIds = new Set(bdAnalysts.map((a) => a.id));
    const map = new Map<string, { id: string; name: string; email?: string; initials: string; isAdded: boolean }>();

    for (const u of allUsers) {
      if (!u.id || !u.full_name) continue;
      if (isSuperAdmin(u) || isInactive(u)) continue;
      map.set(u.id, {
        id: u.id,
        name: u.full_name,
        email: u.email || undefined,
        initials: getUserInitials(u.full_name).toUpperCase(),
        isAdded: existingBDIds.has(u.id),
      });
    }

    for (const a of bdAnalysts) {
      if (!a.id || !a.full_name) continue;
      if (isSuperAdmin(a) || isInactive(a)) continue;
      if (!map.has(a.id)) {
        map.set(a.id, {
          id: a.id,
          name: a.full_name,
          email: a.email || undefined,
          initials: getUserInitials(a.full_name).toUpperCase(),
          isAdded: true,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, bdAnalysts]);

  const filteredCandidateBDUsers = useMemo(() => {
    if (!bdSearch.trim()) return allCandidateBDUsers;
    const q = bdSearch.toLowerCase();
    return allCandidateBDUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [allCandidateBDUsers, bdSearch]);

  const toggleBDUser = (u: { id: string }) => {
    setSelectedBdIds((prev) => {
      const next = new Set(prev);
      if (next.has(u.id)) {
        next.delete(u.id);
      } else {
        next.add(u.id);
      }
      return next;
    });
  };

  // Save BD Analysts changes in 1 single bulk/batch transaction
  const handleSaveBDAnalysts = async () => {
    try {
      setIsSavingBD(true);
      await batchUpdateBD.mutateAsync(Array.from(selectedBdIds));
      toast.success('BD analysts updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save BD analysts');
    } finally {
      setIsSavingBD(false);
    }
  };

  // Build candidate system users for Execution Analysts (all active system users)
  const allCandidateExecUsers = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; email?: string; initials: string; isAdded: boolean }>();
    const existingInitials = new Set(execOptions.map((o) => o.initials.toUpperCase()));

    for (const u of allUsers) {
      if (!u.full_name) continue;
      if (isSuperAdmin(u) || isInactive(u)) continue;
      const initials = getUserInitials(u.full_name).toUpperCase();
      map.set(u.id || u.full_name, {
        id: u.id,
        name: u.full_name,
        email: u.email || undefined,
        initials,
        isAdded: existingInitials.has(initials),
      });
    }

    for (const a of bdAnalysts) {
      if (!a.full_name) continue;
      if (isSuperAdmin(a) || isInactive(a)) continue;
      const initials = getUserInitials(a.full_name).toUpperCase();
      const key = a.id || a.full_name;
      if (!map.has(key)) {
        map.set(key, {
          id: a.id,
          name: a.full_name,
          email: a.email || undefined,
          initials,
          isAdded: existingInitials.has(initials),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, bdAnalysts, execOptions]);

  const filteredCandidateExecUsers = useMemo(() => {
    if (!execSearch.trim()) return allCandidateExecUsers;
    const q = execSearch.toLowerCase();
    return allCandidateExecUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [allCandidateExecUsers, execSearch]);

  const toggleExecUser = (u: { initials: string }) => {
    const init = u.initials.toUpperCase();
    setSelectedExecInitials((prev) => {
      const next = new Set(prev);
      if (next.has(init)) {
        next.delete(init);
      } else {
        next.add(init);
      }
      return next;
    });
  };

  // Save Execution Analyst changes in 1 single bulk/batch transaction
  const handleSaveExecutionAnalysts = async () => {
    try {
      setIsSavingExec(true);
      const selectedItems = allCandidateExecUsers
        .filter((u) => selectedExecInitials.has(u.initials.toUpperCase()))
        .map((u) => ({
          name: u.name,
          initials: u.initials.toUpperCase(),
          email: u.email,
        }));
      await batchUpdateExec.mutateAsync(selectedItems);
      toast.success('Execution analysts updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save execution analysts');
    } finally {
      setIsSavingExec(false);
    }
  };

  const isLoading = isLoadingBD || isLoadingUsers || isLoadingExec;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-lg p-6 max-h-[90vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5 text-primary" />
            Manage Analysts
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Select system users to assign as BD Analysts or Execution Analysts across pipeline tasks.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'bd' | 'execution')}
          className="flex-1 flex flex-col min-h-0 mt-2"
        >
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="bd" className="flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
              <Briefcase className="h-3.5 w-3.5" />
              BD Analysts ({selectedBdIds.size})
            </TabsTrigger>
            <TabsTrigger value="execution" className="flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
              <UserPlus className="h-3.5 w-3.5" />
              Execution Analysts ({selectedExecInitials.size})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BD ANALYSTS */}
          <TabsContent value="bd" className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            {/* Search system users */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search system users..."
                value={bdSearch}
                onChange={(e) => setBdSearch(e.target.value)}
                className="pl-8 h-8.5 text-xs"
              />
            </div>

            {/* User Checkbox Selection List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/10 min-h-[220px] max-h-[340px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading users...
                </div>
              ) : filteredCandidateBDUsers.length > 0 ? (
                filteredCandidateBDUsers.map((u) => {
                  const isSelected = selectedBdIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleBDUser(u)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors border ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                          : 'border-transparent hover:bg-accent/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleBDUser(u)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-xs">{u.name}</div>
                          {u.email && (
                            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.isAdded && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No users found matching "{bdSearch}"
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={isSavingBD}
                onClick={handleSaveBDAnalysts}
                className="h-8.5 px-4 text-xs gap-1.5 cursor-pointer"
              >
                {isSavingBD ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save BD Analysts
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: EXECUTION ANALYSTS */}
          <TabsContent value="execution" className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
            {/* Search system users */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search system users..."
                value={execSearch}
                onChange={(e) => setExecSearch(e.target.value)}
                className="pl-8 h-8.5 text-xs"
              />
            </div>

            {/* User Checkbox Selection List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/10 min-h-[220px] max-h-[340px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading users...
                </div>
              ) : filteredCandidateExecUsers.length > 0 ? (
                filteredCandidateExecUsers.map((u) => {
                  const isSelected = selectedExecInitials.has(u.initials.toUpperCase());
                  return (
                    <div
                      key={u.id || u.name}
                      onClick={() => toggleExecUser(u)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors border ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                          : 'border-transparent hover:bg-accent/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleExecUser(u)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-xs">{u.name}</div>
                          {u.email && (
                            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.isAdded && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No users found matching "{execSearch}"
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={isSavingExec}
                onClick={handleSaveExecutionAnalysts}
                className="h-8.5 px-4 text-xs gap-1.5 cursor-pointer"
              >
                {isSavingExec ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Execution Analysts
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-3 border-t mt-3 flex justify-between items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8.5 cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
