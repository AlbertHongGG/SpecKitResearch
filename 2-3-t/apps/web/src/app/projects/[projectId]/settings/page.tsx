import SettingsClient from './SettingsClient.tsx';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SettingsClient projectId={projectId} />;
}
