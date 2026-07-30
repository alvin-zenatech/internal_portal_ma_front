import { useIndustries, useCreateIndustry, useDeleteIndustry, useUpdateIndustry } from "@/hooks/usePipeline";
import { MasterDataTemplate } from "./MasterDataTemplate";

export default function MasterDataIndustry() {
  const { data, isLoading } = useIndustries();
  const { mutateAsync: create } = useCreateIndustry();
  const { mutateAsync: remove } = useDeleteIndustry();
  const { mutateAsync: update } = useUpdateIndustry();
  return <MasterDataTemplate title="Industry" data={data} isLoading={isLoading} onCreate={create} onDelete={remove} onUpdate={update} />;
}
