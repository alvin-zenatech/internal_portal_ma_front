import { useState, useMemo, useEffect } from 'react';
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
import { Plus, Search, UserPlus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useExecutionAnalystOptions, type ExecutionAnalystOption } from '@/hooks/useExecutionAnalyst';

export type { ExecutionAnalystOption };

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
  const { options, dbAnalysts, addAnalyst, removeAnalyst, allUsers, allAnalysts } = useExecutionAnalystOptions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInitials, setSelectedInitials] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Custom analyst form state
  const [customName, setCustomName] = useState("");
  const [customInitials, setCustomInitials] = useState("");

  const currentInitials = (value || "").toUpperCase().trim();

  // Initialize selectedInitials whenever the dialog is opened
  useEffect(() => {
    if (isDialogOpen) {
      setSelectedInitials(new Set(options.map((o) => o.initials.toUpperCase())));
    }
  }, [isDialogOpen, options]);

  // Auto-fill initials when typing custom name
  const handleCustomNameChange = (val: string) => {
    setCustomName(val);
    if (!customInitials || customInitials === getUserInitials(customName).toUpperCase()) {
      setCustomInitials(getUserInitials(val).toUpperCase());
    }
  };

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

  const handleAddCustomAnalyst = async () => {
    if (!customName.trim() || !customInitials.trim()) {
      toast.error("Please provide both name and initials");
      return;
    }
    try {
      setIsSaving(true);
      await addAnalyst({
        name: customName.trim(),
        initials: customInitials.trim().toUpperCase(),
      });
      toast.success(`Execution analyst "${customName}" added to database`);
      setCustomName("");
      setCustomInitials("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to add execution analyst");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const existingInitialsMap = new Map(dbAnalysts.map(a => [a.initials.toUpperCase(), a]));

      // 1. Add newly selected candidates
      for (const u of candidateUsers) {
        const init = u.initials.toUpperCase();
        if (selectedInitials.has(init) && !existingInitialsMap.has(init)) {
          try {
            await addAnalyst({
              name: u.name,
              initials: init,
              email: u.email,
            });
          } catch {}
        }
      }

      // 2. Remove unselected db items
      for (const [init, analyst] of existingInitialsMap.entries()) {
        if (!selectedInitials.has(init)) {
          try {
            await removeAnalyst(analyst.id);
          } catch {}
        }
      }

      toast.success("Execution analysts updated");
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save execution analysts");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Select
        value={currentInitials || "none"}
        onValueChange={(val) => {
          onChange(val === "none" ? "" : val);
        }}
        disabled={disabled}
      >
        <SelectTrigger className={className || "h-9 text-xs sm:text-sm"}>
          <SelectValue placeholder={placeholder}>
            {(() => {
              if (!currentInitials || currentInitials === "NONE") {
                return <span className="text-muted-foreground">{placeholder}</span>;
              }
              const matched = options.find((o) => o.initials === currentInitials);
              if (matched) {
                return (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                        {matched.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{matched.name}</span>
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
              className="w-full justify-start text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 h-8 px-2 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Manage Analysts...
            </Button>
          </div>
        </SelectContent>
      </Select>

      {/* Add / Manage Execution Analysts Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-md p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Manage Execution Analysts
            </DialogTitle>
            <DialogDescription>
              Select system users or add custom analysts to include in the database and pipeline views.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Add Custom Analyst */}
            <div className="p-3 border rounded-md bg-muted/30 space-y-2">
              <div className="text-xs font-semibold text-foreground">Add Custom Analyst</div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Full Name (e.g. Jane Doe)"
                  value={customName}
                  onChange={(e) => handleCustomNameChange(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  placeholder="Initials"
                  value={customInitials}
                  onChange={(e) => setCustomInitials(e.target.value.toUpperCase())}
                  className="h-8 text-xs w-20 uppercase font-mono"
                  maxLength={5}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || !customName.trim()}
                  onClick={handleAddCustomAnalyst}
                  className="h-8 px-3 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search system users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
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
                          <div className="truncate font-medium text-xs">{u.name}</div>
                          {u.email && <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.isAdded && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            In DB
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setIsDialogOpen(false);
                setSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
