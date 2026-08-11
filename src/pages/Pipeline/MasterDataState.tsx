import { useStates, useCreateState, useDeleteState, useUpdateState } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataState() {
  const { data, isLoading } = useStates();
  const { mutateAsync: create } = useCreateState();
  const { mutateAsync: remove } = useDeleteState();
  const { mutateAsync: update } = useUpdateState();
  return <MasterDataTemplate title="State/Province" data={data} isLoading={isLoading} onCreate={create} onDelete={remove} onUpdate={update} />;
}
