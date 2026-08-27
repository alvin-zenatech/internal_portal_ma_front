import { useMemo } from 'react';
import { 
  useExecutionAnalysts, 
  useCreateExecutionAnalyst, 
  useUpdateExecutionAnalyst, 
  useDeleteExecutionAnalyst,
  useAnalysts, 
  useUsers
} from '@/hooks/usePipeline';

export interface ExecutionAnalystOption {
  id?: number | string;
  name: string;
  initials: string;
  email?: string;
  color?: string;
  is_active?: boolean;
}

export function useExecutionAnalystOptions() {
  const { data: dbAnalysts, isLoading: isLoadingDb } = useExecutionAnalysts(true);
  const { data: analysts } = useAnalysts();
  const { data: users } = useUsers();

  const createMutation = useCreateExecutionAnalyst();
  const updateMutation = useUpdateExecutionAnalyst();
  const deleteMutation = useDeleteExecutionAnalyst();

  // Options strictly contain only the active execution analysts from the database
  const options = useMemo<ExecutionAnalystOption[]>(() => {
    if (dbAnalysts && Array.isArray(dbAnalysts)) {
      return dbAnalysts
        .filter((a) => a.is_active !== false)
        .map((a) => ({
          id: a.id,
          name: a.name,
          initials: a.initials.toUpperCase(),
          email: a.email || undefined,
          color: a.color || undefined,
          is_active: a.is_active,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [dbAnalysts]);

  const addAnalyst = async (data: { name: string; initials: string; email?: string; color?: string }) => {
    return await createMutation.mutateAsync(data);
  };

  const removeAnalyst = async (id: number) => {
    return await deleteMutation.mutateAsync(id);
  };

  const updateAnalyst = async (id: number, data: { name?: string; initials?: string; email?: string; color?: string; is_active?: boolean }) => {
    return await updateMutation.mutateAsync({ id, data });
  };

  return {
    options,
    isLoading: isLoadingDb,
    dbAnalysts: dbAnalysts || [],
    addAnalyst,
    removeAnalyst,
    updateAnalyst,
    allUsers: users || [],
    allAnalysts: analysts || [],
  };
}
