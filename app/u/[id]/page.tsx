import { PublicProfileClient } from "@/components/profile/PublicProfileClient";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  return <PublicProfileClient userId={id} />;
}
