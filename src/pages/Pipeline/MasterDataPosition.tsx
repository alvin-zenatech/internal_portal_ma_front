import { usePositions, useCreatePosition, useDeletePosition, useUpdatePosition } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataPosition() {
  const { data, isLoading } = usePositions();
  const { mutateAsync: create } = useCreatePosition();
  const { mutateAsync: remove } = useDeletePosition();
  const { mutateAsync: update } = useUpdatePosition();
  return <MasterDataTemplate title="Position" data={data} isLoading={isLoading} onCreate={create} onDelete={remove} onUpdate={update} />;
}
