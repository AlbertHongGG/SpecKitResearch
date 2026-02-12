'use client';

import { useState } from 'react';
import { RoleGuard } from '../../../../../components/role-guard';
import { useCreateSection, useCreateLesson } from '../../../../../features/instructor/api';

export default function CurriculumPage({ params }: { params: { courseId: string } }) {
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionOrder, setSectionOrder] = useState(0);
  const [lesson, setLesson] = useState({
    sectionId: '',
    title: '',
    order: 0,
    contentType: 'text',
    contentText: '',
    contentImageUrl: '',
    contentFileUrl: '',
    contentFileName: '',
  });
  const createSection = useCreateSection(params.courseId);
  const createLesson = useCreateLesson(params.courseId, lesson.sectionId);

  return (
    <RoleGuard roles={['instructor', 'admin']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">課綱管理</h1>
        <div className="rounded border bg-white p-4 space-y-2">
          <h2 className="font-medium">新增章節</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="章節標題"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
          />
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="排序"
            value={sectionOrder}
            onChange={(e) => setSectionOrder(Number(e.target.value))}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() =>
              createSection.mutate({ title: sectionTitle, order: sectionOrder })
            }
          >
            新增章節
          </button>
        </div>
        <div className="rounded border bg-white p-4 space-y-2">
          <h2 className="font-medium">新增單元</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="章節 ID"
            value={lesson.sectionId}
            onChange={(e) => setLesson({ ...lesson, sectionId: e.target.value })}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="單元標題"
            value={lesson.title}
            onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
          />
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="排序"
            value={lesson.order}
            onChange={(e) => setLesson({ ...lesson, order: Number(e.target.value) })}
          />
          <select
            className="w-full rounded border px-3 py-2"
            value={lesson.contentType}
            onChange={(e) => setLesson({ ...lesson, contentType: e.target.value })}
          >
            <option value="text">文字</option>
            <option value="image">圖片</option>
            <option value="pdf">PDF</option>
          </select>
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="文字內容"
            value={lesson.contentText}
            onChange={(e) => setLesson({ ...lesson, contentText: e.target.value })}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="圖片 URL"
            value={lesson.contentImageUrl}
            onChange={(e) => setLesson({ ...lesson, contentImageUrl: e.target.value })}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="PDF URL"
            value={lesson.contentFileUrl}
            onChange={(e) => setLesson({ ...lesson, contentFileUrl: e.target.value })}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="PDF 名稱"
            value={lesson.contentFileName}
            onChange={(e) => setLesson({ ...lesson, contentFileName: e.target.value })}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => createLesson.mutate(lesson)}
          >
            新增單元
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}
