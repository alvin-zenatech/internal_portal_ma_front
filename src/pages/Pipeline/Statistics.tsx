import { useState, useMemo } from "react";
import { usePipelineStatistics } from "@/hooks/usePipeline";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";

type DateRange = {
  from?: Date;
  to?: Date;
};

export default function Statistics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  const currentStartDate = period === 'weekly' 
    ? (dateRange?.from || startOfWeek(new Date(), { weekStartsOn: 1 }))
    : startOfMonth(selectedMonth);
    
  const currentEndDate = period === 'weekly'
    ? (dateRange?.to || endOfWeek(currentStartDate, { weekStartsOn: 1 }))
    : endOfMonth(selectedMonth);

  const { data, isLoading } = usePipelineStatistics(currentStartDate, currentEndDate);

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      options.push(startOfMonth(subMonths(now, i)));
    }
    return options;
  }, []);

  const prioritiesData = useMemo(() => {
    if (!data) return {};
    const grouped: Record<string, { items: any[], color: string }> = {};
    data.forEach(item => {
      const pName = item.priority_name || 'Unassigned';
      if (!grouped[pName]) {
        grouped[pName] = {
          items: [],
          color: item.priority_color || '#64748b'
        };
      }
      grouped[pName].items.push({
        name: item.analyst_name || 'Unassigned',
        count: item.task_count,
        color: grouped[pName].color
      });
    });
    Object.keys(grouped).forEach(k => {
      grouped[k].items.sort((a, b) => b.count - a.count);
    });
    return grouped;
  }, [data]);

  const priorityNames = Object.keys(prioritiesData);

  return (
    <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline Statistics</h1>
          <p className="text-muted-foreground mt-2">View task distribution across analysts for each priority.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
            <span className={`text-sm font-medium ${period === 'weekly' ? 'text-primary' : 'text-muted-foreground'}`}>Weekly</span>
            <Switch 
              checked={period === 'monthly'} 
              onCheckedChange={(c) => setPeriod(c ? 'monthly' : 'weekly')}
            />
            <span className={`text-sm font-medium ${period === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Monthly</span>
          </div>
          
          <div className="h-10 flex items-center">
            {period === 'weekly' ? (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[260px] justify-start text-left font-normal bg-card">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                  <div className="p-3 border-t flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDateRange({
                        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
                        to: endOfWeek(new Date(), { weekStartsOn: 1 })
                      })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => setIsCalendarOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Select value={selectedMonth.toISOString()} onValueChange={(val) => setSelectedMonth(new Date(val))}>
                <SelectTrigger className="w-[260px] bg-card">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent align="end">
                  {monthOptions.map(m => (
                    <SelectItem key={m.toISOString()} value={m.toISOString()}>
                      {format(m, "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading statistics...</div>
      ) : priorityNames.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 border rounded-xl border-dashed">
          No tasks found for this selected period.
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={priorityNames} className="w-full space-y-4">
          {priorityNames.map((priorityName) => (
            <AccordionItem key={priorityName} value={priorityName} className="border bg-card rounded-xl shadow-sm px-4 overflow-hidden">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg text-white"
                      style={{ backgroundColor: prioritiesData[priorityName].color }}
                    >
                      {priorityName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{priorityName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {prioritiesData[priorityName].items.reduce((sum: number, item: any) => sum + item.count, 0)} Total Tasks
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prioritiesData[priorityName].items}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                        width={100}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                        {prioritiesData[priorityName].items.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
