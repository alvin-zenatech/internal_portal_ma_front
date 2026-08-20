import { useState, useMemo, useEffect } from 'react';
import { useAnalysts, useUsers } from '@/hooks/usePipeline';
import { getUserInitials } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, UserPlus, Save } from 'lucide-react';
import { toast } from 'sonner';

export interface ExecutionAnalystOption {
  id?: string;
  name: string;
  initials: string;
  email?: string;
}

export const DEFAULT_EXECUTION_ANALYSTS = ['JH', 'EH', 'AM', 'NS'];

const STORAGE_KEY = 'pipeline_execution_analysts_custom_list_v1';

export function useExecutionAnalystOptions() {
  const { data: analysts } = useAnalysts();
  const { data: users } = useUsers();

  const [customList, setCustomList] = useState<ExecutionAnalystOption[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveSelectedAnalysts = (selectedList: ExecutionAnalystOption[]) => {
    // Keep custom additions beyond defaults
    const customOnly = selectedList.filter(
      (item) => !DEFAULT_EXECUTION_ANALYSTS.includes(item.initials.toUpperCase())
    );
    setCustomList(customOnly);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch {}
  };

  const options = useMemo(() => {
    const map = new Map<string, ExecutionAnalystOption>();

    // Helper to find name for an initials string from existing users/analysts
    const findUserByInitials = (init: string) => {
      const upper = init.toUpperCase();
      const all = [...(analysts || []), ...(users || [])];
      for (const u of all) {
        if (!u.full_name) continue;
        if (getUserInitials(u.full_name).toUpperCase() === upper) {
          return { id: u.id, name: u.full_name, email: u.email || undefined };
        }
      }
      return null;
    };

    // 1. Always include default execution analysts: JH, EH, AM, NS
    for (const init of DEFAULT_EXECUTION_ANALYSTS) {
      const matched = findUserByInitials(init);
      map.set(init, {
        id: matched?.id,
        name: matched ? matched.name : init,
        initials: init,
        email: matched?.email,
      });
    }

    // 2. Add custom added from storage
    for (const c of customList) {
      const upper = c.initials.toUpperCase();
      if (!map.has(upper)) {
        map.set(upper, c);
      }
    }

    return Array.from(map.values());
  }, [analysts, users, customList]);

  return { options, saveSelectedAnalysts, allUsers: users || [], allAnalysts: analysts || [] };
}

interface ExecutionAnalystSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function ExecutionAnalystSelect({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select execution analyst",
}: ExecutionAnalystSelectProps) {
  const { options, saveSelectedAnalysts, allUsers, allAnalysts } = useExecutionAnalystOptions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInitials, setSelectedInitials] = useState<Set<string>>(new Set());

  const currentInitials = (value || "").toUpperCase().trim();

  // Initialize selectedInitials whenever the dialog is opened
  useEffect(() => {
    if (isDialogOpen) {
      setSelectedInitials(new Set(options.map((o) => o.initials.toUpperCase())));
    }
  }, [isDialogOpen, options]);

  // Combine all active, non-super-admin users for the "Add User" dialog
  const candidateUsers = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; email?: string; initials: string; isAdded: boolean }>();

    const existingInitials = new Set(options.map((o) => o.initials.toUpperCase()));

    const isSuperAdmin = (u: any) => {
      if (u.is_super_admin === true) return true;
      const name = (u.full_name || u.name || '').toLowerCase();
      if (name === 'super admin' || name.includes('super admin')) return true;
      const email = (u.email || '').toLowerCase();
      if (email.includes('superadmin') || email.includes('super_admin')) return true;
      return false;
    };

    const isInactive = (u: any) => {
      if (u.is_active === false) return true;
      if (u.status === 'inactive') return true;
      return false;
    };

    // From allUsers
    for (const u of allUsers) {
      if (!u.full_name) continue;
      if (isSuperAdmin(u) || isInactive(u)) continue;

      const initials = getUserInitials(u.full_name).toUpperCase();
      map.set(u.id || u.full_name, {
        id: u.id,
        name: u.full_name,
        email: u.email,
        initials,
        isAdded: existingInitials.has(initials),
      });
    }

    // From allAnalysts
    for (const a of allAnalysts) {
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

    let list = Array.from(map.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allUsers, allAnalysts, options, searchQuery]);

  const toggleUser = (u: { initials: string }) => {
    const init = u.initials.toUpperCase();
    setSelectedInitials((prev) => {
      const next = new Set(prev);
      if (next.has(init)) {
        next.delete(init);
      } else {
        next.add(init);
      }
      return next;
    });
  };

  const handleSave = () => {
    const allCandidatesMap = new Map<string, ExecutionAnalystOption>();
    for (const u of candidateUsers) {
      allCandidatesMap.set(u.initials.toUpperCase(), {
        id: u.id,
        name: u.name,
        initials: u.initials,
        email: u.email,
      });
    }
    for (const opt of options) {
      if (!allCandidatesMap.has(opt.initials.toUpperCase())) {
        allCandidatesMap.set(opt.initials.toUpperCase(), opt);
      }
    }

    const selectedList: ExecutionAnalystOption[] = [];
    for (const init of selectedInitials) {
      const item = allCandidatesMap.get(init);
      if (item) {
        selectedList.push(item);
      }
    }

    saveSelectedAnalysts(selectedList);
    toast.success("Execution analysts updated");
    setIsDialogOpen(false);
  };

  return (
    <>
      <Select
        value={currentInitials || "none"}
        onValueChange={(val) => {
          if (val === "__ADD_MORE__") {
            setIsDialogOpen(true);
          } else if (val === "none") {
            onChange("");
          } else {
            onChange(val);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder}>
            {(() => {
              if (!currentInitials || currentInitials === "none") {
                return <span className="text-muted-foreground">{placeholder}</span>;
              }
              const opt = options.find((o) => o.initials.toUpperCase() === currentInitials);
              if (opt) {
                return (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                        {opt.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{opt.name}</span>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                      {currentInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{currentInitials}</span>
                </div>
              );
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="none">
            <span className="text-muted-foreground">None (Unassigned)</span>
          </SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.initials} value={opt.initials}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                    {opt.initials}
                  </AvatarFallback>
                </Avatar>
                <span>{opt.name}</span>
              </div>
            </SelectItem>
          ))}
          <div className="p-1 border-t mt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 h-8 px-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add more user...
            </Button>
          </div>
        </SelectContent>
      </Select>

      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-md p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add User to Execution Analysts
            </DialogTitle>
            <DialogDescription>
              Select system users to include in the Execution Analysts dropdown options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search system users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
              {candidateUsers.length > 0 ? (
                candidateUsers.map((u) => {
                  const isSelected = selectedInitials.has(u.initials.toUpperCase());
                  return (
                    <div
                      key={u.id || u.name}
                      onClick={() => toggleUser(u)}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors border ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "border-transparent hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(u)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.name}</div>
                          {u.email && <div className="text-xs text-muted-foreground truncate">{u.email}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.isAdded && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            In list
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
