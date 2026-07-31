import { useCountries, useCreateCountry, useDeleteCountry, useUpdateCountry } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataCountry() {
  const { data, isLoading } = useCountries();
  const { mutateAsync: create } = useCreateCountry();
  const { mutateAsync: remove } = useDeleteCountry();
  const { mutateAsync: update } = useUpdateCountry();
  return <MasterDataTemplate title="Country" data={data} isLoading={isLoading} onCreate={create} onDelete={remove} onUpdate={update} />;
}
