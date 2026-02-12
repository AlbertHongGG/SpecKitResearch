import { PreviewSurveyClient } from './preview-client';

export default function Page({ params }: { params: { id: string } }) {
  return <PreviewSurveyClient id={params.id} />;
}
