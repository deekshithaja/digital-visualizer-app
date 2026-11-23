import {
  AuditLog,
  DashboardOverview,
  DemoBreachCheckResult,
  DemoBreachDatasetInfo,
  DemoBreachListResponse,
  Finding,
  FindingStatus,
  FootprintTarget,
  RemediationTask,
  ScanReport,
  TargetType,
  TaskStatus,
  TaskStep,
  User,
  UserPreferences,
} from '../types';

const TOKEN_KEY = 'dfv-auth-token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage restriction
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) message = body.error;
    }
    throw new ApiError(message, res.status);
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError(
      'API server returned an unexpected non-JSON response. Please ensure the backend server is running.',
      502
    );
  }

  return (await res.json()) as T;
}

export const api = {
  auth: {
    register: (payload: { fullName: string; email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User }>('/auth/me'),
    updateProfile: (payload: { fullName?: string; preferences?: Partial<UserPreferences> }) =>
      request<{ user: User }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteAccount: () => request<{ message: string }>('/auth/account', { method: 'DELETE' }),
  },
  dashboard: {
    overview: () => request<DashboardOverview>('/dashboard/overview'),
    auditLogs: () => request<{ logs: AuditLog[] }>('/dashboard/audit-logs'),
  },
  targets: {
    list: () => request<{ targets: FootprintTarget[] }>('/targets'),
    create: (payload: { type: TargetType; value: string; label: string; scanNow?: boolean }) =>
      request<{ target: FootprintTarget; report?: ScanReport; findings?: Finding[]; overallScore?: number }>(
        '/targets',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    update: (id: string, payload: { label?: string; status?: 'active' | 'paused' }) =>
      request<{ target: FootprintTarget }>(`/targets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) => request<{ message: string }>(`/targets/${id}`, { method: 'DELETE' }),
    scan: (id: string) =>
      request<{ target: FootprintTarget; report: ScanReport; findings: Finding[]; overallScore: number }>(
        `/targets/${id}/scan`,
        { method: 'POST' }
      ),
    sweep: () =>
      request<{ report: ScanReport; overallScore: number }>('/targets/sweep', {
        method: 'POST',
      }),
  },
  findings: {
    list: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<{ findings: Finding[] }>(`/findings${qs ? `?${qs}` : ''}`);
    },
    updateStatus: (id: string, status: FindingStatus) =>
      request<{ finding: Finding; overallScore: number }>(`/findings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  actions: {
    list: () => request<{ actions: RemediationTask[] }>('/actions'),
    create: (payload: {
      title: string;
      description: string;
      category: string;
      severity: string;
      estimatedMinutes: number;
      steps: string[];
    }) =>
      request<{ action: RemediationTask }>('/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { status?: TaskStatus; steps?: TaskStep[] }) =>
      request<{ action: RemediationTask; overallScore: number }>(`/actions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },
  reports: {
    list: () => request<{ reports: ScanReport[] }>('/reports'),
    get: (id: string) => request<{ report: ScanReport; findings: Finding[] }>(`/reports/${id}`),
    exportUrl: (id: string, format: 'json' | 'markdown') => `/api/reports/${id}/export?format=${format}`,
  },
  breaches: {
    check: (email: string) =>
      request<DemoBreachCheckResult>('/v1/breaches/check', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    list: () => request<DemoBreachListResponse>('/v1/breaches'),
    datasetInfo: () => request<DemoBreachDatasetInfo>('/v1/breaches/dataset-info'),
  },
};
