import { RespondPage } from '@/features/respond/RespondPage';

export default function Page({ params }: { params: { slug: string } }) {
  return <RespondPage slug={params.slug} />;
}
