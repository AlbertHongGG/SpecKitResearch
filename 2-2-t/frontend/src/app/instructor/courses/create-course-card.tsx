'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { createInstructorCourse } from '../../../services/instructor';
import { isApiError } from '../../../services/api-client';

export function CreateCourseCard() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="text-sm font-semibold">建立新課程（draft）</div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            const created = await createInstructorCourse({
              title,
              description,
              price: Number(price),
            });
            router.push(`/instructor/courses/${created.id}`);
          } catch (err) {
            if (isApiError(err)) setError(err.message);
            else setError('建立失敗');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Input label="標題" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="簡介" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <Input label="價格" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
        <Button type="submit" disabled={submitting}>
          {submitting ? '建立中…' : '建立'}
        </Button>
      </form>
    </div>
  );
}
