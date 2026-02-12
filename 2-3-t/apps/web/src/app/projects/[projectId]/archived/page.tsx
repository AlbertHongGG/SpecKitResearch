import ArchivedClient from './ArchivedClient.tsx';

export default async function ArchivedPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ArchivedClient projectId={projectId} />;
}
