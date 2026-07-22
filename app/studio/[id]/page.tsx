import { StudioClient } from "@/components/studio/StudioClient";

type StudioOutfitPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioOutfitPage({ params }: StudioOutfitPageProps) {
  const { id } = await params;
  return <StudioClient outfitId={id} />;
}
