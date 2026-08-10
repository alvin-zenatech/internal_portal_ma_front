import React, { useState, useDeferredValue } from "react";
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useCountries, type CompanyData } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, Building2, MapPin, User, Mail, Phone, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompaniesListView() {
  const { data: companies, isLoading } = useCompanies();
  const { data: countries } = useCountries();
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredSearchQuery = useDeferredValue(globalFilter);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [countryId, setCountryId] = useState<string>("none");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  const [companyToDelete, setCompanyToDelete] = useState<number | null>(null);

  const { mutate: createCompany, isPending: creating } = useCreateCompany();
  const { mutate: updateCompany, isPending: updating } = useUpdateCompany();
  const { mutate: deleteCompany, isPending: deleting } = useDeleteCompany();

  const handleOpenModal = (company?: CompanyData) => {
    if (company) {
      setEditingCompany(company);
      setCompanyName(company.name);
      setPhone(company.phone || "");
      setLocationStr(company.location || "");
      setCountryId(company.country_id?.toString() || "none");
      setContactName(company.contact_name || "");
      setEmail(company.email || "");
    } else {
      setEditingCompany(null);
      setCompanyName("");
      setPhone("");
      setLocationStr("");
      setCountryId("none");
      setContactName("");
      setEmail("");
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!companyName.trim()) return;
    
    const dataToSave = {
      name: companyName.trim(),
      phone: phone.trim() || null,
      location: locationStr.trim() || null,
      country_id: countryId !== "none" ? parseInt(countryId) : null,
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
    };

    if (editingCompany) {
      updateCompany({ id: editingCompany.id, data: dataToSave }, {
        onSuccess: () => setIsModalOpen(false)
      });
    } else {
      createCompany(dataToSave, {
        onSuccess: () => setIsModalOpen(false)
      });
    }
  };

  const columns = React.useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }: any) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4">
          Company Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }: any) => <span className="font-semibold text-slate-900">{row.original.name}</span>
    },
    {
      accessorKey: "contact_name",
      header: "Contact",
      cell: ({ row }: any) => row.original.contact_name ? (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {row.original.contact_name}
        </div>
      ) : <span className="text-muted-foreground">-</span>
    },
    {
      accessorKey: "contact_info",
      header: "Contact Info",
      cell: ({ row }: any) => (
        <div className="space-y-1 text-sm">
          {row.original.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {row.original.email}
            </div>
          )}
          {row.original.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {row.original.phone}
            </div>
          )}
          {!row.original.email && !row.original.phone && <span className="text-muted-foreground">-</span>}
        </div>
      )
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }: any) => (row.original.location || row.original.country_name) ? (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {[row.original.location, row.original.country_name].filter(Boolean).join(", ")}
        </div>
      ) : <span className="text-muted-foreground">-</span>
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(row.original)}>
            <Edit2 className="h-4 w-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCompanyToDelete(row.original.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    }
  ], []);

  const table = useReactTable({
    data: companies || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      globalFilter: deferredSearchQuery,
    },
    initialState: {
      sorting: [{ id: "name", desc: false }],
    }
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate height for Companies table rows
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0)
    : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50">
      <div className="border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Building2 className="h-6 w-6 text-primary" /> Companies
            </h1>
            <p className="text-muted-foreground text-sm">Manage unique companies and their contact information.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-9 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" /> Add Company
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto relative" ref={parentRef}>
        <div className="w-full">
          <div className="rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading companies...</div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 shadow-sm bg-slate-50/80 dark:bg-zinc-950/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-slate-50/80 dark:bg-zinc-950/50 hover:bg-slate-50/80 dark:hover:bg-zinc-950/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="bg-slate-50/80 dark:bg-zinc-950/50">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {paddingTop > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: `${paddingTop}px`, padding: 0 }} />
                    </TableRow>
                  )}
                  {virtualRows.length ? (
                    virtualRows.map(virtualRow => {
                      const row = allRows[virtualRow.index];
                      return (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No companies found.
                      </TableCell>
                    </TableRow>
                  )}
                  {paddingBottom > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
            <DialogDescription className="sr-only">Company details form</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name <span className="text-red-500">*</span></label>
              <Input 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                placeholder="e.g. Lescure Surveying" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Name</label>
              <Input 
                value={contactName} 
                onChange={e => setContactName(e.target.value)} 
                placeholder="Primary contact name" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="contact@company.com" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Phone number" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input 
                  value={locationStr} 
                  onChange={e => setLocationStr(e.target.value)} 
                  placeholder="City, State" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {countries?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={creating || updating}>Cancel</Button>
            <Button onClick={handleSave} disabled={!companyName.trim() || creating || updating}>
              {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(creating || updating) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={companyToDelete !== null}
        onOpenChange={(o) => !o && setCompanyToDelete(null)}
        title="Delete Company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        isLoading={deleting}
        onConfirm={() => {
          if (companyToDelete) {
            deleteCompany(companyToDelete, {
              onSuccess: () => setCompanyToDelete(null)
            });
          }
        }}
      />
    </div>
  );
}
