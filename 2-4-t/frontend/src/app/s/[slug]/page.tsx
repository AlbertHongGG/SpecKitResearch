import { RespondPage } from '@/features/respond/RespondPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RespondPage slug={slug} />;
}
