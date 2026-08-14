import { useStates, useCreateState, useDeleteState, useUpdateState } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataState({ countryId }: { countryId?: number }) {
  const { data, isLoading } = useStates(countryId?.toString());
  const { mutateAsync: create } = useCreateState();
  const { mutateAsync: remove } = useDeleteState();
  const { mutateAsync: update } = useUpdateState();
  
  const handleCreate = async (data: any) => {
    return create({ ...data, country_id: countryId });
  };
  
  const handleUpdate = async ({ id, data }: any) => {
    return update({ id, data: { ...data, country_id: countryId } });
  };
  
  return <MasterDataTemplate title="State/Province" data={data} isLoading={isLoading} onCreate={handleCreate} onDelete={remove} onUpdate={handleUpdate} />;
}
