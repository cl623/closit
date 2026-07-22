import { OutfitDetailClient } from "@/components/feed/OutfitDetailClient";

type OutfitPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OutfitPage({ params }: OutfitPageProps) {
  const { id } = await params;
  return <OutfitDetailClient outfitId={id} />;
}
