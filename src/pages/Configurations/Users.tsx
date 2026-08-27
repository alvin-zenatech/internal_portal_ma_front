import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, KeyRound, ArrowUpDown, Power, Ban, Search, ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useAuth } from "@/lib/AuthContext";
import type { User } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

export default function Users() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    initials: "",
    is_active: true,
    is_super_admin: false,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/configuration/users"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.post("/api/configuration/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<typeof formData> }) =>
      apiClient.put(`/api/configuration/users/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/configuration/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated/deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmail = formData.email.includes("@") ? formData.email : `${formData.email}@zenatech.com`;
    const payload = { ...formData, email: finalEmail };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      createMutation.mutate(payload as typeof formData);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ email: "", full_name: "", initials: "", is_active: true, is_super_admin: false });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteMutation.mutateAsync(userToDelete.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await updateMutation.mutateAsync({
        id: userToDeactivate.id,
        payload: { is_active: !userToDeactivate.is_active }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeactivateDialogOpen(false);
      setUserToDeactivate(null);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email.replace(/@zenatech\.com$/, ""),
      full_name: user.full_name || "",
      initials: (user as any).initials || "",
      is_active: (user as any).is_active ?? true,
      is_super_admin: user.is_super_admin
    });
    setIsDialogOpen(true);
  };

  const [sorting, setSorting] = useState<SortingState>([{ id: "full_name", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<User>[]>(() => {
    const cols: ColumnDef<User>[] = [
      {
        accessorKey: "full_name",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.full_name || "-"}</span>,
      },
      {
        accessorKey: "initials",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Initials
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{(row.original as any).initials || "-"}</span>,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span>{row.original.email}</span>,
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const isActive = (row.original as any).is_active ?? true;
          return isActive ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">Inactive</Badge>
          );
        },
      },
      {
        id: "roles",
        accessorFn: (row) => row.is_super_admin ? "Super Admin" : ((row as any).assigned_roles?.map((r: any) => r.name).join(", ") || ""),
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Roles
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const user = row.original as any;
          if (user.is_super_admin) {
            return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mb-1 mr-1">Super Admin</Badge>;
          }
          if (user.assigned_roles && user.assigned_roles.length > 0) {
            return (
              <div className="flex flex-wrap gap-1">
                {user.assigned_roles.map((role: any) => (
                  <Badge key={role.id} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                    {role.name}
                  </Badge>
                ))}
              </div>
            );
          }
          return <span className="text-slate-500 text-sm italic">No Roles</span>;
        },
      }
    ];

    if (hasPermission("CONFIG_USER_ROLE_ASSIGNMENT_READ") || hasPermission("CONFIG_USERS_UPDATE")) {
      cols.push({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const user = row.original;
          const isActive = (user as any).is_active ?? true;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasPermission("CONFIG_USER_ROLE_ASSIGNMENT_READ") && (
                    <DropdownMenuItem onClick={() => navigate(`/configurations/user-role-assignment?userId=${user.id}`)}>
                      <KeyRound className="mr-2 h-4 w-4" /> Manage Roles
                    </DropdownMenuItem>
                  )}
                  {hasPermission("CONFIG_USERS_UPDATE") && (
                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit User
                    </DropdownMenuItem>
                  )}
                  {hasPermission("CONFIG_USERS_UPDATE") && (
                    <DropdownMenuItem onClick={() => {
                      setUserToDeactivate(user);
                      setIsDeactivateDialogOpen(true);
                    }}>
                      {isActive ? (
                        <><Ban className="mr-2 h-4 w-4 text-orange-600" /> Deactivate</>
                      ) : (
                        <><Power className="mr-2 h-4 w-4 text-green-600" /> Activate</>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      });
    }
    return cols;
  }, [hasPermission, navigate]);

  const table = useReactTable({
    data: users,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = (row.getValue("full_name") as string)?.toLowerCase() || "";
      const email = (row.getValue("email") as string)?.toLowerCase() || "";
      const roles = (row.getValue("roles") as string)?.toLowerCase() || "";
      return name.includes(search) || email.includes(search) || roles.includes(search);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-500 bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Users</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage system users and their access.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {hasPermission("CONFIG_USERS_CREATE") && (
            <Button size="sm" onClick={openCreateDialog} className="w-full sm:w-auto h-8.5 sm:h-9 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add User
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-3 min-h-0">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center justify-between shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 w-full sm:w-72 bg-card border-border h-8.5 sm:h-9 text-xs sm:text-sm"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-8.5 sm:h-9 text-xs">
                Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="flex-1 min-h-[260px] rounded-lg border bg-card overflow-hidden shadow-xs flex flex-col p-0">
          <div className="overflow-auto flex-1">
            <Table className="m-0 relative" containerClassName="none">
              <TableHeader className="bg-muted/90 backdrop-blur sticky top-0 z-10 shadow-xs border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-t-0 bg-muted/90 hover:bg-muted/90">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="py-2 text-xs font-semibold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-xs sm:text-sm text-muted-foreground">Loading users...</TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/40"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2 sm:py-2.5 px-3 text-xs sm:text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-xs sm:text-sm text-muted-foreground">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* PAGINATION */}
        <div className="border-t bg-card py-2 shrink-0">
          <DataTablePagination table={table} noun="user(s)" />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[92vw] max-w-md p-4 sm:p-6 bg-card">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initials</label>
              <Input
                value={(formData as any).initials}
                onChange={e => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                placeholder="JD"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex rounded-md shadow-sm">
                <Input
                  type="text"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value.replace(/@.*$/, "") })}
                  placeholder="john"
                  className="rounded-r-md rounded-tr-none rounded-br-none focus-visible:ring-0 focus-visible:ring-offset-0 border-r-0"
                />
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  @zenatech.com
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active Account</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_super_admin"
                checked={formData.is_super_admin}
                onChange={e => setFormData({ ...formData, is_super_admin: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_super_admin" className="text-sm font-medium text-purple-700 dark:text-purple-400">Super Admin Privileges</label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDeactivate?.is_active ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDeactivate?.is_active
                ? "This will deactivate the user account. They will no longer be able to log in, but their data will be preserved."
                : "This will reactivate the user account, allowing them to log in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={updateMutation.isPending}
              className={userToDeactivate?.is_active ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {updateMutation.isPending ? "Updating..." : (userToDeactivate?.is_active ? "Deactivate" : "Activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
