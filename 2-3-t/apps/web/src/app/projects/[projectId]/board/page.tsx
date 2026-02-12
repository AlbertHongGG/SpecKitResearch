import BoardClient from './BoardClient.tsx';

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <BoardClient projectId={projectId} />;
}
