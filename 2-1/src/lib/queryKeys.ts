export const queryKeys = {
  me: () => ['me'] as const,
  courses: (params: Record<string, unknown>) => ['courses', params] as const,
  courseDetail: (courseId: string) => ['course', courseId] as const,
  myCourses: () => ['myCourses'] as const,
  reader: (courseId: string, lessonId?: string) => ['reader', courseId, lessonId ?? null] as const,
  reviewQueue: () => ['admin', 'reviewQueue'] as const,
  adminUsers: () => ['admin', 'users'] as const,
  taxonomy: () => ['taxonomy'] as const,
  stats: () => ['admin', 'stats'] as const,
  instructorCourses: () => ['instructor', 'courses'] as const,
  instructorCourse: (courseId: string) => ['instructor', 'course', courseId] as const,
  adminCourse: (courseId: string) => ['admin', 'course', courseId] as const,
};
