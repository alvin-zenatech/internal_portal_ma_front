import { usePriorities, useCreatePriority, useDeletePriority, useUpdatePriority } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataPriority() {
  const { data, isLoading } = usePriorities();
  const { mutateAsync: create } = useCreatePriority();
  const { mutateAsync: remove } = useDeletePriority();
  const { mutateAsync: update } = useUpdatePriority();
  return <MasterDataTemplate title="Priority" data={data} isLoading={isLoading} onCreate={create} onDelete={remove} onUpdate={update} hasSortOrder hasColor />;
}
