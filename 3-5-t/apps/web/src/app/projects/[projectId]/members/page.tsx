import MembersClient from './MembersClient.tsx';

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <MembersClient projectId={projectId} />;
}
