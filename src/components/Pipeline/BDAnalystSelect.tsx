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
import { useAnalysts } from '@/hooks/usePipeline';
import { getUserInitials } from '@/lib/utils';
import ManageAnalystsDialog from './ManageAnalystsDialog';

interface BDAnalystSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export default function BDAnalystSelect({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select BD analyst...",
  required = false,
}: BDAnalystSelectProps) {
  const { data: analysts = [], isLoading } = useAnalysts();
  const [isManageOpen, setIsManageOpen] = useState(false);

  const selectedValue = value && value !== "unassigned" ? value : "unassigned";
  const matchedAnalyst = analysts.find(a => a.id === selectedValue);

  return (
    <>
      <Select
        value={selectedValue}
        onValueChange={(val) => {
          onChange(val);
        }}
        disabled={disabled || isLoading}
        required={required}
      >
        <SelectTrigger className={className || "h-8.5 sm:h-9 text-xs sm:text-sm"}>
          <SelectValue placeholder={placeholder}>
            {selectedValue === "unassigned" ? (
              <span className="text-muted-foreground">Unassigned</span>
            ) : matchedAnalyst ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                    {getUserInitials(matchedAnalyst.full_name || matchedAnalyst.email || '')}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{matchedAnalyst.full_name || matchedAnalyst.email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="unassigned">
            <span className="text-muted-foreground">Unassigned</span>
          </SelectItem>
          {analysts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                    {getUserInitials(a.full_name || a.email || '')}
                  </AvatarFallback>
                </Avatar>
                <span>{a.full_name || a.email}</span>
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
                setIsManageOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Manage Analysts...
            </Button>
          </div>
        </SelectContent>
      </Select>

      <ManageAnalystsDialog
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        defaultTab="bd"
      />
    </>
  );
}
