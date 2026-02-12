import { ResultsClient } from './results-client';

export default function Page({ params }: { params: { id: string } }) {
  return <ResultsClient id={params.id} />;
}
