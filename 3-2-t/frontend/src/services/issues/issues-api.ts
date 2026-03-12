import { mapApiError } from '@/lib/api/error-mapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export interface IssueRecord {
  id: string;
  projectId: string;
  project: {
    id: string;
    key: string;
    name: string;
    status: 'active' | 'archived';
    organizationStatus: 'active' | 'suspended';
  };
  issueKey: string;
  type: 'story' | 'task' | 'bug' | 'epic';
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: {
    id: string;
    key: string;
    name: string;
    workflowVersion: number;
    isDeprecated: boolean;
  };
  reporterUserId: string;
  assigneeUserId: string | null;
  dueDate: string | null;
  estimate: number | null;
  sprint: {
    id: string;
    name: string;
    status: string;
  } | null;
  labels: string[];
  epicIssueKey: string | null;
  comments: Array<{
    id: string;
    authorUserId: string;
    body: string;
    createdAt: string;
  }>;
  updatedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardData {
  project: {
    id: string;
    key: string;
    name: string;
    type: string;
  };
  activeSprint: {
    id: string;
    name: string;
    status: string;
  } | null;
  columns: Array<{
    key: string;
    name: string;
    issues: IssueRecord[];
  }>;
}

export interface BacklogData {
  project: {
    id: string;
    key: string;
    name: string;
    type: string;
  };
  backlogIssues: IssueRecord[];
  sprints: Array<{
    id: string;
    name: string;
    goal: string | null;
    status: string;
    issues: IssueRecord[];
  }>;
}

export interface IssueMutationPayload {
  expectedVersion?: number;
  type?: 'story' | 'task' | 'bug' | 'epic';
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimate?: number | null;
  labels?: string[];
  sprintId?: string | null;
  epicIssueKey?: string | null;
}

export interface IssueTimelineEntry {
  kind: 'audit' | 'comment';
  id: string;
  createdAt: string;
  action: string;
  actorEmail: string;
  entityType: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
}

export interface IssueTimelineResponse {
  issue: IssueRecord;
  timeline: IssueTimelineEntry[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await mapApiError(response);
  }

  return (await response.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
  });

  return handleResponse<T>(response);
}

export function listIssues(projectId: string): Promise<IssueRecord[]> {
  return request<IssueRecord[]>(`/projects/${projectId}/issues`);
}

export function getIssue(projectId: string, issueKey: string): Promise<IssueRecord> {
  return request<IssueRecord>(`/projects/${projectId}/issues/${issueKey}`);
}

export function getIssueTimeline(projectId: string, issueKey: string): Promise<IssueTimelineResponse> {
  return request<IssueTimelineResponse>(`/projects/${projectId}/issues/${issueKey}/timeline`);
}

export function getBoard(projectId: string): Promise<BoardData> {
  return request<BoardData>(`/projects/${projectId}/board`);
}

export function getBacklog(projectId: string): Promise<BacklogData> {
  return request<BacklogData>(`/projects/${projectId}/backlog`);
}

export function createIssue(projectId: string, payload: IssueMutationPayload, csrfToken?: string | null): Promise<IssueRecord> {
  return request<IssueRecord>(`/projects/${projectId}/issues/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });
}

export function updateIssue(projectId: string, issueKey: string, payload: IssueMutationPayload, csrfToken?: string | null): Promise<IssueRecord> {
  return request<IssueRecord>(`/projects/${projectId}/issues/${issueKey}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });
}

export function transitionIssue(
  projectId: string,
  issueKey: string,
  payload: { expectedVersion: number; toStatusKey: string },
  csrfToken?: string | null,
): Promise<IssueRecord> {
  return request<IssueRecord>(`/projects/${projectId}/issues/${issueKey}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify(payload),
  });
}

export function addComment(
  projectId: string,
  issueKey: string,
  body: string,
  csrfToken?: string | null,
): Promise<{ id: string; authorUserId: string; body: string; createdAt: string }> {
  return request(`/projects/${projectId}/issues/${issueKey}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken ?? '',
    },
    body: JSON.stringify({ body }),
  });
}
