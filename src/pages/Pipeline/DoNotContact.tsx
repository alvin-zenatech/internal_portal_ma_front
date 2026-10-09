import { toast } from "sonner";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { 
  Download, 
  AlertTriangle, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  FileText,
  Clock
} from "lucide-react";
import { useState, useMemo } from "react";
import { 
  useDoNotContactList, 
  useCreateDoNotContact, 
  useUpdateDoNotContact, 
  useDeleteDoNotContact,
  useCompanies,
  type DoNotContactRecord
} from "@/hooks/usePipeline";
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import MultiPhoneInput from "@/components/Pipeline/MultiPhoneInput";
import PhoneDisplay from "@/components/Pipeline/PhoneDisplay";

export default function DoNotContact() {
  const { data: dncList, isLoading } = useDoNotContactList();
  const createDnc = useCreateDoNotContact();
  const updateDnc = useUpdateDoNotContact();
  const deleteDnc = useDeleteDoNotContact();
  const { data: companies } = useCompanies();

  const companyOptions = useMemo(() => {
    return (companies || []).map((c) => ({
      id: c.name,
      name: c.name,
      contact_name: c.contact_name || "",
      email: c.email || "",
      phone: c.phone || "",
      location: c.location || [c.state_name || c.state_code, c.country_name || c.country_code].filter(Boolean).join(", ") || "",
    }));
  }, [companies]);

  const [searchTerm, setSearchTerm] = useState("");

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newReason, setNewReason] = useState("");

  // Edit modal state
  const [editRecord, setEditRecord] = useState<{
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    location: string;
    reason: string;
  } | null>(null);

  // View Details Sheet state
  const [viewRecord, setViewRecord] = useState<DoNotContactRecord | null>(null);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredList = useMemo(() => {
    if (!dncList) return [];
    if (!searchTerm.trim()) return dncList;
    const term = searchTerm.toLowerCase().trim();
    return dncList.filter((record) =>
      record.company_name?.toLowerCase().includes(term) ||
      record.contact_name?.toLowerCase().includes(term) ||
      record.email?.toLowerCase().includes(term) ||
      record.phone?.toLowerCase().includes(term) ||
      record.location?.toLowerCase().includes(term) ||
      record.reason?.toLowerCase().includes(term)
    );
  }, [dncList, searchTerm]);

  const handleExportDnc = () => {
    try {
      const dataToExport = filteredList || [];
      const cols: ExportColumn<DoNotContactRecord>[] = [
        { header: "Company Name", accessor: (r) => r.company_name || "" },
        { header: "Contact Name", accessor: (r) => r.contact_name || "" },
        { header: "Email", accessor: (r) => r.email || "" },
        { header: "Phone Number", accessor: (r) => r.phone || "" },
        { header: "Location", accessor: (r) => r.location || "" },
        { header: "Reason / Notes", accessor: (r) => r.reason || "" },
        { header: "Date Added", accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
      ];
      exportToCsv(dataToExport.length > 0 ? dataToExport : (dncList || []), cols, "do_not_contact_list");
      toast.success("Do Not Contact list exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export Do Not Contact list");
    }
  };

  const handleCompanySelect = (companyNameValue: string) => {
    setNewCompanyName(companyNameValue);
    const matched = companyOptions.find((c) => c.name.toLowerCase() === companyNameValue.toLowerCase());
    if (matched) {
      if (matched.contact_name && !newContactName) setNewContactName(matched.contact_name);
      if (matched.email && !newEmail) setNewEmail(matched.email);
      if (matched.phone && !newPhone) setNewPhone(matched.phone);
      if (matched.location && !newLocation) setNewLocation(matched.location);
    }
  };

  const handleEditCompanySelect = (companyNameValue: string) => {
    if (!editRecord) return;
    const matched = companyOptions.find((c) => c.name.toLowerCase() === companyNameValue.toLowerCase());
    setEditRecord({
      ...editRecord,
      company_name: companyNameValue,
      contact_name: matched?.contact_name || editRecord.contact_name,
      email: matched?.email || editRecord.email,
      phone: matched?.phone || editRecord.phone,
      location: matched?.location || editRecord.location,
    });
  };

  const handleCreate = () => {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    createDnc.mutate({
      company_name: newCompanyName.trim(),
      contact_name: newContactName.trim() || null,
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      location: newLocation.trim() || null,
      reason: newReason.trim() || null,
    }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setNewCompanyName("");
        setNewContactName("");
        setNewEmail("");
        setNewPhone("");
        setNewLocation("");
        setNewReason("");
      }
    });
  };

  const handleUpdate = () => {
    if (!editRecord || !editRecord.company_name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    updateDnc.mutate({
      id: editRecord.id,
      data: {
        company_name: editRecord.company_name.trim(),
        contact_name: editRecord.contact_name.trim() || null,
        email: editRecord.email.trim() || null,
        phone: editRecord.phone.trim() || null,
        location: editRecord.location.trim() || null,
        reason: editRecord.reason.trim() || null,
      }
    }, {
      onSuccess: () => {
        if (viewRecord && viewRecord.id === editRecord.id) {
          setViewRecord({
            ...viewRecord,
            company_name: editRecord.company_name.trim(),
            contact_name: editRecord.contact_name.trim() || null,
            email: editRecord.email.trim() || null,
            phone: editRecord.phone.trim() || null,
            location: editRecord.location.trim() || null,
            reason: editRecord.reason.trim() || null,
          });
        }
        setEditRecord(null);
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDnc.mutate(deleteId, {
      onSuccess: () => {
        if (viewRecord && viewRecord.id === deleteId) {
          setViewRecord(null);
        }
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="h-full flex flex-col w-full min-h-0 bg-background">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b bg-card shrink-0">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-red-600 dark:text-red-500 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Do Not Contact List
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Companies explicitly marked as 'Do Not Contact'. These companies are flagged across the entire pipeline.
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-2.5 sm:p-4 md:p-5 space-y-3 min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative w-full sm:w-72 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search company, contact, phone, location..."
                className="pl-8 h-8.5 sm:h-9 text-xs sm:text-sm bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto sm:ml-0">
              <Button variant="outline" size="sm" onClick={handleExportDnc} className="gap-1.5 h-8.5 sm:h-9 text-xs">
                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 h-8.5 sm:h-9 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Record
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 shadow-xs overflow-hidden flex flex-col min-h-[260px]">
            <div className="overflow-auto flex-1">
              <Table containerClassName="none">
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-[220px] py-2.5 text-xs font-semibold">Company Name</TableHead>
                    <TableHead className="w-[160px] py-2.5 text-xs font-semibold">Contact</TableHead>
                    <TableHead className="w-[240px] py-2.5 text-xs font-semibold">Contact Info</TableHead>
                    <TableHead className="w-[160px] py-2.5 text-xs font-semibold">Location</TableHead>
                    <TableHead className="min-w-[180px] py-2.5 text-xs font-semibold">Reason / Notes</TableHead>
                    <TableHead className="w-[120px] py-2.5 text-xs font-semibold">Date Added</TableHead>
                    <TableHead className="w-[100px] text-right py-2.5 text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredList?.length ? (
                    filteredList.map((record) => (
                      <TableRow 
                        key={record.id} 
                        className="hover:bg-muted/50 transition-colors group cursor-pointer"
                        onClick={() => setViewRecord(record)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{record.company_name}</span>
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold shrink-0">DNC</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.contact_name ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{record.contact_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs" onClick={(e) => e.stopPropagation()}>
                            {record.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                <a href={`mailto:${record.email}`} className="text-primary hover:underline truncate">
                                  {record.email}
                                </a>
                              </div>
                            )}
                            {record.phone && (
                              <div className="flex items-start gap-1">
                                <PhoneDisplay phone={record.phone} mode="badges" />
                              </div>
                            )}
                            {!record.email && !record.phone && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.location ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{record.location}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {record.reason ? (
                            <span className="line-clamp-2" title={record.reason}>{record.reason}</span>
                          ) : (
                            <span className="italic opacity-50">No reason provided</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View Record Details"
                              onClick={() => setViewRecord(record)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit Record"
                              onClick={() => setEditRecord({
                                id: record.id,
                                company_name: record.company_name,
                                contact_name: record.contact_name || "",
                                email: record.email || "",
                                phone: record.phone || "",
                                location: record.location || "",
                                reason: record.reason || ""
                              })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Remove from DNC"
                              onClick={() => setDeleteId(record.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        {searchTerm ? "No matching Do Not Contact records found." : "The Do Not Contact list is empty."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-[94vw] sm:max-w-xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-card">
          <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-card shrink-0">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Add Do Not Contact Record
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a company to the Do Not Contact list along with their details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Company Name *</Label>
              <AutocompleteCombobox
                value={newCompanyName}
                onChange={(v) => handleCompanySelect(v as string)}
                options={companyOptions}
                onCreate={async (name) => name}
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs sm:text-sm">Contact Name</Label>
                <Input 
                  value={newContactName} 
                  onChange={(e) => setNewContactName(e.target.value)} 
                  placeholder="Primary contact name"
                  className="h-8.5 sm:h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs sm:text-sm">Email</Label>
                <Input 
                  type="email"
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  placeholder="contact@company.com"
                  className="h-8.5 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm">Phone Number(s)</Label>
              <MultiPhoneInput
                value={newPhone}
                onChange={setNewPhone}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm">Location</Label>
              <Input 
                value={newLocation} 
                onChange={(e) => setNewLocation(e.target.value)} 
                placeholder="e.g. Texas, USA"
                className="h-8.5 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm">Reason / Notes</Label>
              <Textarea 
                value={newReason} 
                onChange={(e) => setNewReason(e.target.value)} 
                placeholder="e.g. Requested removal on 10/05, not interested in selling"
                rows={3}
                className="text-xs sm:text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-card gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newCompanyName.trim() || createDnc.isPending}>
              {createDnc.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Modal */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="w-[94vw] sm:max-w-xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-card">
          <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b bg-card shrink-0">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit Do Not Contact Record
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update company, contact, location, and reason details.
            </DialogDescription>
          </DialogHeader>

          {editRecord && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Company Name *</Label>
                <AutocompleteCombobox
                  value={editRecord.company_name || ""}
                  onChange={(v) => handleEditCompanySelect(v as string)}
                  options={companyOptions}
                  onCreate={async (name) => name}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Contact Name</Label>
                  <Input 
                    value={editRecord.contact_name} 
                    onChange={(e) => setEditRecord({ ...editRecord, contact_name: e.target.value })} 
                    placeholder="Primary contact name"
                    className="h-8.5 sm:h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input 
                    type="email"
                    value={editRecord.email} 
                    onChange={(e) => setEditRecord({ ...editRecord, email: e.target.value })} 
                    placeholder="contact@company.com"
                    className="h-8.5 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs sm:text-sm">Phone Number(s)</Label>
                <MultiPhoneInput
                  value={editRecord.phone}
                  onChange={(val) => setEditRecord({ ...editRecord, phone: val })}
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs sm:text-sm">Location</Label>
                <Input 
                  value={editRecord.location} 
                  onChange={(e) => setEditRecord({ ...editRecord, location: e.target.value })} 
                  placeholder="e.g. Texas, USA"
                  className="h-8.5 sm:h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs sm:text-sm">Reason / Notes</Label>
                <Textarea 
                  value={editRecord.reason} 
                  onChange={(e) => setEditRecord({ ...editRecord, reason: e.target.value })} 
                  placeholder="Reason for DNC..."
                  rows={3}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-card gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdate} disabled={!editRecord?.company_name.trim() || updateDnc.isPending}>
              {updateDnc.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Details Slide-Over Sheet */}
      <Sheet open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <SheetContent aria-describedby={undefined} className="w-[94vw] sm:max-w-md p-0 flex flex-col h-full overflow-hidden bg-card">
          {viewRecord && (
            <>
              <div className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg sm:text-xl font-bold truncate">
                      {viewRecord.company_name}
                    </SheetTitle>
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold shrink-0">
                      DNC
                    </Badge>
                  </div>
                  <SheetDescription className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Added on {viewRecord.created_at ? new Date(viewRecord.created_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "-"}
                  </SheetDescription>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="space-y-3 bg-muted/30 p-3.5 rounded-lg border border-border/60 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs font-medium block mb-0.5">Contact Name</span>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {viewRecord.contact_name || <span className="text-muted-foreground font-normal italic">Not specified</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-xs font-medium block mb-0.5">Email</span>
                    {viewRecord.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${viewRecord.email}`} className="text-primary hover:underline font-medium">
                          {viewRecord.email}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-normal italic">Not specified</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground text-xs font-medium block mb-0.5">Location</span>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{viewRecord.location || <span className="text-muted-foreground font-normal italic">Not specified</span>}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Phone Number(s)
                  </span>
                  <div className="bg-muted/20 p-2.5 rounded-lg border border-border/60">
                    <PhoneDisplay phone={viewRecord.phone} mode="list" emptyText="No phone numbers added." />
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Reason / Notes
                  </span>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/60 text-xs sm:text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {viewRecord.reason || <span className="text-muted-foreground italic">No reason or notes provided.</span>}
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 border-t bg-muted/20 flex items-center justify-between gap-2 shrink-0">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-1.5 text-xs h-8.5"
                  onClick={() => {
                    setDeleteId(viewRecord.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove DNC
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 text-xs h-8.5"
                  onClick={() => {
                    setEditRecord({
                      id: viewRecord.id,
                      company_name: viewRecord.company_name,
                      contact_name: viewRecord.contact_name || "",
                      email: viewRecord.email || "",
                      phone: viewRecord.phone || "",
                      location: viewRecord.location || "",
                      reason: viewRecord.reason || "",
                    });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Record
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove from Do Not Contact"
        description="Are you sure you want to remove this company from the Do Not Contact list? They will no longer be flagged as DNC."
        isLoading={deleteDnc.isPending}
      />
    </div>
  );
}
