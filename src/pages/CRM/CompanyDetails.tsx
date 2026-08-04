import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePipelineTasks, useActivities } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Building2, User, ArrowLeft, Clock, CalendarIcon, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import LogCallModal from "./LogCallModal";

export default function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const companyId = parseInt(id || "0");
  const company = tasks?.find(t => t.id === companyId);
  const location = useLocation();

  useEffect(() => {
    if (company?.company_name) {
      document.dispatchEvent(new CustomEvent("set-breadcrumb-title", {
        detail: { path: location.pathname, title: company.company_name }
      }));
    }
  }, [company?.company_name, location.pathname]);
  
  const { data: activities, isLoading: activitiesLoading } = useActivities(companyId);

  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (tasksLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!company) {
    return <div className="p-8 text-center text-muted-foreground">Company not found.</div>;
  }

  return (
    <div className="flex h-full flex-col bg-slate-50/50">
      <div className="p-4 sm:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Panel: Company Information */}
        <div className="lg:col-span-1 space-y-6">
          <Button variant="ghost" onClick={() => navigate('/pipeline/crm')} className="mb-2 -ml-4 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to CRM
          </Button>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{company.company_name}</h1>
                <Badge variant="outline" style={{ backgroundColor: company.priority_color + '20', color: company.priority_color, borderColor: company.priority_color + '40' }}>
                  {company.priority_name || 'New Lead'}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2 mt-2">
                <Building2 className="h-4 w-4" /> {company.industry_name || 'No Industry'}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Primary Contact</p>
                <div className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {company.name}
                  {company.position_name && <span className="text-muted-foreground font-normal">({company.position_name})</span>}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {company.phone || 'Not provided'}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {company.email || 'Not provided'}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {company.location ? `${company.location}, ${company.country_name || ''}` : 'Not provided'}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Assigned Analyst</p>
                <p className="font-medium">{company.analyst_name || 'Unassigned'}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Next Follow-up</p>
                <div className="flex items-center gap-2 font-medium text-amber-600">
                  <CalendarIcon className="h-4 w-4" />
                  {company.follow_up_date ? new Date(company.follow_up_date + 'T00:00:00').toLocaleDateString() : 'None Scheduled'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold">Activity Timeline</h2>
                <p className="text-sm text-muted-foreground">View and log interactions with this company.</p>
              </div>
              <Button onClick={() => setIsLogCallOpen(true)} size="lg" className="shadow-sm">
                <Phone className="mr-2 h-4 w-4" /> Log New Call
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {activitiesLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : activities?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No activities logged</h3>
                  <p>Click the "Log New Call" button to record your first interaction.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activities?.map((activity, idx) => (
                    <div key={activity.id} className="hover:bg-slate-50 transition-colors">
                      <div 
                        className="p-4 px-6 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === activity.id ? null : activity.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-xs">
                            #{activities.length - idx}
                          </div>
                          <div className="w-32 text-sm text-muted-foreground">
                            {new Date(activity.activity_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="w-48 font-medium">
                            {activity.outcome || 'Logged Call'}
                          </div>
                          <div className="w-24 text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {activity.duration || '-'}
                          </div>
                          <div className="flex-1 text-sm text-muted-foreground">
                            {activity.analyst_name || 'Unknown'}
                          </div>
                        </div>
                        <div>
                          {expandedRow === activity.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </div>
                      
                      {expandedRow === activity.id && (
                        <div className="p-6 pt-2 bg-slate-50/50 border-t border-b text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                            <div>
                              <p className="text-muted-foreground mb-1">Contact Used</p>
                              <p className="font-medium">{activity.contact_name || '-'}</p>
                              {activity.position && <p className="text-muted-foreground text-xs">{activity.position}</p>}
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Phone Number</p>
                              <p className="font-medium">{activity.phone_number || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Picked Up?</p>
                              <Badge variant={activity.picked_up ? "default" : "secondary"}>{activity.picked_up ? 'Yes' : 'No'}</Badge>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Emailed?</p>
                              <Badge variant={activity.emailed ? "default" : "secondary"}>{activity.emailed ? 'Yes' : 'No'}</Badge>
                            </div>
                          </div>
                          <div className="pt-4 border-t">
                            <p className="text-muted-foreground mb-2">Notes</p>
                            <p className="whitespace-pre-wrap">{activity.notes || 'No notes provided.'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <LogCallModal 
        open={isLogCallOpen} 
        onOpenChange={setIsLogCallOpen} 
        taskId={companyId} 
        defaultContactName={company.name}
        defaultPosition={company.position_name ?? undefined}
        defaultPhone={company.phone ?? undefined}
      />
    </div>
  );
}
