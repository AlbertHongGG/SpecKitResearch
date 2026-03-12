import { redirect } from 'next/navigation';

export default function ProjectHomePage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${encodeURIComponent(params.projectId)}/board`);
}
