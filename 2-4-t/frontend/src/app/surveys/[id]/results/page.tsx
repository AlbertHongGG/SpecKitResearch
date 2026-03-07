import { ResultsClient } from './results-client';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsClient id={id} />;
}
