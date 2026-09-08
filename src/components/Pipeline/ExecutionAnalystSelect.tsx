import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { useExecutionAnalystOptions, type ExecutionAnalystOption } from '@/hooks/useExecutionAnalyst';
import ManageAnalystsDialog from './ManageAnalystsDialog';

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
  placeholder = "Select execution analyst...",
}: ExecutionAnalystSelectProps) {
  const { options } = useExecutionAnalystOptions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentInitials = (value || "").toUpperCase().trim();

  return (
    <>
      <Select
        value={currentInitials || "none"}
        onValueChange={(val) => {
          onChange(val === "none" ? "" : val);
        }}
        disabled={disabled}
      >
        <SelectTrigger className={className || "h-8.5 sm:h-9 text-xs sm:text-sm"}>
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

      <ManageAnalystsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        defaultTab="execution"
      />
    </>
  );
}
