import { toast } from "sonner";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import React, { useState, useDeferredValue, useEffect } from "react";
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useCountries, useStates, type CompanyData } from "@/hooks/usePipeline";
import { useSearchParams } from "react-router-dom";
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, ArrowUpDown, Building2, User, Mail, Phone, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";

export default function CompaniesListView() {

  const handleExportCompanies = () => {
    try {
      const dataToExport = table.getFilteredRowModel().rows.map(r => r.original);
      const columnMap: Record<string, ExportColumn<any>> = {
        name: { header: "Company Name", accessor: (r) => r.name || "" },
        contact_name: { header: "Contact Name", accessor: (r) => r.contact_name || "" },
        contact_info: { header: "Email", accessor: (r) => r.email || "" },
        phone: { header: "Phone", accessor: (r) => r.phone || "" },
        state_code: { header: "State/Province", accessor: (r) => r.state_code || r.state_name || "" },
        country_code: { header: "Country", accessor: (r) => r.country_code || r.country_name || r.location || "" },
      };

      const cols: ExportColumn<any>[] = [];
      table.getVisibleLeafColumns().forEach(col => {
        if (col.id === 'contact_info') {
          cols.push({ header: "Email", accessor: (r) => r.email || "" });
          cols.push({ header: "Phone", accessor: (r) => r.phone || "" });
        } else if (columnMap[col.id]) {
          cols.push(columnMap[col.id]);
        }
      });

      exportToCsv(dataToExport.length > 0 ? dataToExport : (companies || []), cols.length > 0 ? cols : [
        { header: "Company Name", accessor: (r) => r.name || "" },
        { header: "Contact Name", accessor: (r) => r.contact_name || "" },
        { header: "Email", accessor: (r) => r.email || "" },
        { header: "Phone", accessor: (r) => r.phone || "" },
        { header: "State/Province", accessor: (r) => r.state_code || r.state_name || "" },
        { header: "Country", accessor: (r) => r.country_code || r.country_name || r.location || "" },
      ], "pipeline_companies");
      toast.success("Companies exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export companies");
    }
  };

  const { data: companies, isLoading } = useCompanies();
  const { data: countries } = useCountries();
  const [countryCode, setCountryCode] = useState<string>("");
  const { data: states } = useStates(countryCode || undefined);
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredSearchQuery = useDeferredValue(globalFilter);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [stateCode, setStateCode] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  const [companyToDelete, setCompanyToDelete] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const companyId = searchParams.get('companyId');
    if (companyId && companies && !isModalOpen) {
      const company = companies.find(c => c.id === parseInt(companyId));
      if (company) {
        handleOpenModal(company);
        searchParams.delete('companyId');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, companies, isModalOpen]);

  const { mutate: createCompany, isPending: creating } = useCreateCompany();
  const { mutate: updateCompany, isPending: updating } = useUpdateCompany();
  const { mutate: deleteCompany, isPending: deleting } = useDeleteCompany();

  const handleOpenModal = (company?: CompanyData) => {
    if (company) {
      setEditingCompany(company);
      setCompanyName(company.name);
      setPhone(company.phone || "");
      setStateCode(company.state_code || company.state_name || "");
      setCountryCode(company.country_code || company.country_name || company.location || "");
      setContactName(company.contact_name || "");
      setEmail(company.email || "");
    } else {
      setEditingCompany(null);
      setCompanyName("");
      setPhone("");
      setStateCode("");
      setCountryCode("");
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
      state_code: stateCode || null,
      country_code: countryCode || null,
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
          {!row.original.email && !row.original.phone && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
    { 
      accessorKey: "state_code", 
      header: "State/Province",
      size: 150,
      cell: ({ row }: any) => <span className="truncate block w-full">{row.original.state_code || row.original.state_name || "-"}</span> 
    },
    { 
      accessorKey: "country_code", 
      header: "Country",
      size: 150,
      cell: ({ row }: any) => <span className="truncate block w-full">{row.original.country_code || row.original.country_name || row.original.location || "-"}</span> 
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(row.original)}>
            <Edit2 className="h-4 w-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCompanyToDelete(row.original.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ], [companies]);

  const table = useReactTable({
    data: companies || [],
    columns,
    state: {
      globalFilter: deferredSearchQuery,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;
  
  const [displayCount, setDisplayCount] = useState(50);
  const observer = React.useRef<IntersectionObserver | null>(null);

  const lastElementRef = React.useCallback((node: HTMLTableRowElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => prev + 50);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading]);

  const visibleRows = allRows.slice(0, displayCount);

  return (
    <div className="h-full flex flex-col w-full min-h-0 bg-background">
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-card border-b shrink-0 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Companies
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage unique companies and their contact information.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCompanies} className="whitespace-nowrap gap-1.5 h-8.5 sm:h-9 text-xs">
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => handleOpenModal()} className="whitespace-nowrap h-8.5 sm:h-9 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Company
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-2.5 sm:p-4 md:p-5 space-y-3 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <Input 
                placeholder="Search companies..." 
                value={globalFilter} 
                onChange={(e) => setGlobalFilter(e.target.value)} 
                className="w-48 sm:w-64 max-w-sm h-8.5 sm:h-9 text-xs sm:text-sm" 
              />
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 flex flex-col shadow-xs overflow-hidden min-h-[260px]">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">Loading companies...</div>
            ) : (
              <div className="flex-1 overflow-auto relative" ref={parentRef}>
                <Table containerClassName="none" className="w-full min-w-[750px]">
                  <TableHeader className="sticky top-0 z-10 shadow-xs bg-muted/90 backdrop-blur">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/90 hover:bg-muted/90">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="bg-muted/90 whitespace-nowrap py-2 text-xs font-semibold">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {visibleRows.length ? (
                      visibleRows.map((row, index) => {
                        const isLast = index === visibleRows.length - 1;
                        return (
                          <TableRow key={row.id} ref={isLast ? lastElementRef : null} className="hover:bg-muted/50 transition-colors">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="py-2 sm:py-2.5 px-3 text-xs sm:text-sm">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-xs sm:text-sm text-muted-foreground">
                          No companies found.
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleRows.length < allRows.length && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-12 text-center text-muted-foreground text-xs">
                          Loading more...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="bg-muted/20 border-t px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-muted-foreground font-medium shrink-0">
              Total rows: {allRows.length}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="w-[92vw] max-w-md p-4 sm:p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
            <DialogDescription className="sr-only">Company details form</DialogDescription>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium">Company Name <span className="text-red-500">*</span></label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Lescure Surveying"
                autoFocus
                className="h-8.5 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium">Contact Name</label>
              <Input 
                value={contactName} 
                onChange={e => setContactName(e.target.value)} 
                placeholder="Primary contact name" 
                className="h-8.5 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs sm:text-sm font-medium">Email</label>
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="contact@company.com" 
                  className="h-8.5 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs sm:text-sm font-medium">Phone</label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Phone number" 
                  className="h-8.5 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-1.5 min-w-0">
                <label className="text-xs sm:text-sm font-medium">State/Province</label>
                <AutocompleteCombobox
                  value={stateCode}
                  onChange={(v) => setStateCode(v?.toString() || "")}
                  options={(states || []).map(s => ({ id: s.name, name: s.name }))}
                  placeholder="Select state/province..."
                  disabled={!countryCode}
                />
              </div>

              <div className="grid gap-1.5 min-w-0">
                <label className="text-xs sm:text-sm font-medium">Country</label>
                <AutocompleteCombobox
                  value={countryCode}
                  onChange={(v) => {
                    setCountryCode(v?.toString() || "");
                    setStateCode("");
                  }}
                  options={(countries || []).map(c => ({ id: c.name, name: c.name }))}
                  placeholder="Select country..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={creating || updating}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!companyName.trim() || creating || updating}>
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
