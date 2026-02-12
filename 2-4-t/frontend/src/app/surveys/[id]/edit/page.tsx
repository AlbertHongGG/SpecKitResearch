import { EditSurveyClient } from './edit-client';

export default function Page({ params }: { params: { id: string } }) {
  return <EditSurveyClient id={params.id} />;
}
