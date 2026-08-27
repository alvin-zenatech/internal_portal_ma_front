import { useExecutionAnalysts, useCreateExecutionAnalyst, useDeleteExecutionAnalyst, useUpdateExecutionAnalyst } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataExecutionAnalyst() {
  const { data, isLoading } = useExecutionAnalysts(false);
  const { mutateAsync: create } = useCreateExecutionAnalyst();
  const { mutateAsync: remove } = useDeleteExecutionAnalyst();
  const { mutateAsync: update } = useUpdateExecutionAnalyst();

  const handleCreate = async ({ name, code, color }: { name: string; code?: string; color?: string }) => {
    const initials = code?.trim() || name.split(' ').map(n => n[0]).join('').toUpperCase();
    return create({ name, initials, color });
  };

  const handleUpdate = async ({ id, data }: { id: number; data: { name: string; code?: string; color?: string } }) => {
    return update({ id, data: { name: data.name, initials: data.code, color: data.color } });
  };

  return (
    <MasterDataTemplate
      title="Execution Analyst"
      data={data?.map(d => ({ ...d, code: d.initials }))}
      isLoading={isLoading}
      hasCode={true}
      hasColor={true}
      onCreate={handleCreate}
      onDelete={remove}
      onUpdate={handleUpdate}
    />
  );
}
