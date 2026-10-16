// One wrapper for every call: base URL, token, JSON, and the backend's { "message": "..." } errors.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const BASE = API_URL + '/api/v1';

let token = null;
let onUnauthorized = () => {};
export const setToken = t => { token = t; };
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(method, path, body, { auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    throw new ApiError('تعذّر الاتصال بالخادم · Cannot reach the server', 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    if (res.status === 401 && auth && token) onUnauthorized();
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

// multipart (photos / voice): no Content-Type header, the browser adds it with the boundary
async function upload(path, form, { auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth && token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(BASE + path, { method: 'POST', headers, body: form });
  } catch (e) {
    throw new ApiError('تعذّر الاتصال بالخادم · Cannot reach the server', 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) {
    if (res.status === 401 && auth && token) onUnauthorized();
    // Spring's own size error (MaxUploadSizeExceededException) comes back with "error", not "message"
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

// fields + up to 3 photos (File/Blob) + one voice note (WAV Blob)
const toForm = (fields, photos, audio) => {
  const f = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') f.append(k, v); });
  (photos || []).forEach((p, k) => f.append('photos', p, p.name || `photo_${k + 1}.jpg`));
  if (audio) f.append('audio', audio, 'voice.wav');
  return f;
};

const q = params => {
  const s = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return s ? '?' + s : '';
};

const get = (p, o) => request('GET', p, undefined, o);
const post = (p, b, o) => request('POST', p, b, o);
const patch = (p, b, o) => request('PATCH', p, b, o);
const del = (p, o) => request('DELETE', p, undefined, o);

export const api = {
  // auth & profile
  login: (username, password) => post('/auth/login', { username, password }, { auth: false }),
  me: () => get('/auth/me'),
  updateMe: dto => patch('/auth/me', dto),
  changePassword: (currentPassword, newPassword) => post('/auth/me/password', { currentPassword, newPassword }),

  // reference
  zones: () => get('/zones'),
  events: () => get('/events'),
  playbooks: () => get('/playbooks'),

  // incidents
  incidents: params => get('/incidents' + q(params)),
  incident: id => get(`/incidents/${id}`),
  acknowledge: (id, actorStaffId) => post(`/incidents/${id}/acknowledge` + q({ actorStaffId })),
  setSeverity: (id, severity, reason, actorStaffId) => patch(`/incidents/${id}/severity`, { severity, reason, actorStaffId }),
  setStatus: (id, status, actorStaffId) => patch(`/incidents/${id}/status`, { status, actorStaffId }),
  resolve: (id, resolutionNotes, actualSeverity, actorStaffId) => post(`/incidents/${id}/resolve`, { resolutionNotes, actualSeverity, actorStaffId }),
  falseAlarm: (id, resolutionNotes, actorStaffId) => post(`/incidents/${id}/false-alarm`, { resolutionNotes, actorStaffId }),
  reopen: (id, reason, actorStaffId) => post(`/incidents/${id}/reopen`, { reason, actorStaffId }),
  confirmDuplicate: (id, actorStaffId) => post(`/incidents/${id}/confirm-duplicate` + q({ actorStaffId })),
  notDuplicate: (id, actorStaffId) => post(`/incidents/${id}/not-duplicate` + q({ actorStaffId })),
  incidentActivity: id => get(`/incidents/${id}/activity`),
  incidentRecs: id => get(`/incidents/${id}/recommendations`),
  candidates: id => get(`/incidents/${id}/candidates`),
  incidentTasks: id => get(`/incidents/${id}/tasks`),
  regenerate: (id, actorStaffId) => post(`/incidents/${id}/recommendations/regenerate` + q({ actorStaffId })),

  // recommendations
  acceptRec: (id, actorStaffId) => post(`/recommendations/${id}/accept`, { actorStaffId }),
  rejectRec: (id, reason, actorStaffId) => post(`/recommendations/${id}/reject`, { reason, actorStaffId }),

  // alerts
  alerts: params => get('/alerts' + q(params)),
  alert: id => get(`/alerts/${id}`),
  dismissAlert: (id, reason, actorStaffId) => post(`/alerts/${id}/dismiss`, { reason, actorStaffId }),
  sendAlert: dto => post('/alerts', dto, { auth: false }),
  sendAlertMedia: (dto, photos, audio) => upload('/alerts/media', toForm(dto, photos, audio), { auth: false }),
  // two steps: preview (what we heard + where, nothing sent yet) -> confirm { draftId, transcript, zoneCode }
  alertPreview: (dto, photos, audio) => upload('/alerts/preview', toForm(dto, photos, audio), { auth: false }),
  alertConfirm: dto => post('/alerts/confirm', dto, { auth: false }),
  // binary: fetched with the token, shown through an object URL (<img src> cannot send the token)
  attachmentUrl: async (id, index = 0) => {
    const res = await fetch(`${BASE}/alerts/${id}/attachment?index=${index}`, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    if (!res.ok) throw new ApiError('Attachment unavailable', res.status);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), type: blob.type };
  },

  // tasks
  tasks: params => get('/tasks' + q(params)),
  task: id => get(`/tasks/${id}`),
  assign: (incidentId, staffId, notes, actorStaffId) => post('/tasks', { incidentId, staffId, notes, actorStaffId }),
  acceptTask: (id, actorStaffId) => post(`/tasks/${id}/accept`, { actorStaffId }),
  rejectTask: (id, reason, actorStaffId) => post(`/tasks/${id}/reject`, { reason, actorStaffId }),
  taskStatus: (id, status, notes, actorStaffId) => patch(`/tasks/${id}/status`, { status, notes, actorStaffId }),
  cancelTask: (id, reason, actorStaffId) => post(`/tasks/${id}/cancel`, { reason, actorStaffId }),

  // staff
  staff: params => get('/staff' + q(params)),
  staffById: id => get(`/staff/${id}`),
  staffLocation: (id, x, y) => patch(`/staff/${id}/location`, { x, y }),
  staffStatus: (id, status) => patch(`/staff/${id}/status`, { status }),
  createStaff: dto => post('/staff', dto),
  deleteStaff: id => del(`/staff/${id}`),

  // notifications
  notifications: params => get('/notifications' + q(params)),
  readNotification: id => patch(`/notifications/${id}/read`),

  // accessibility
  assets: () => get('/accessibility/assets'),
  assetStatus: (id, status, actorStaffId) => patch(`/accessibility/assets/${id}/status`, { status, actorStaffId }),
  routes: () => get('/accessibility/routes', { auth: false }),
  alternative: id => get(`/accessibility/routes/${id}/alternative`, { auth: false }),
  publishRoute: (id, actorStaffId) => post(`/accessibility/routes/${id}/publish`, { actorStaffId }),

  // dashboard, log, simulation
  stats: () => get('/dashboard/stats'),
  activity: (limit = 50) => get('/activity' + q({ limit })),
  simStart: (scenario = 'demo', speed = 1) => post('/simulation/start' + q({ scenario, speed })),
  simReset: () => post('/simulation/reset'),
  simStatus: () => get('/simulation/status'),

  // telegram reporters
  reporters: () => get('/telegram/reporters'),
  blockReporter: (id, reason, actorStaffId) => post(`/telegram/reporters/${id}/block`, { reason, actorStaffId }),
  unblockReporter: (id, reason, actorStaffId) => post(`/telegram/reporters/${id}/unblock`, { reason, actorStaffId }),

  // visitors (public)
  publicZones: () => get('/zones', { auth: false }),
  visitorReport: dto => post('/visitor-reports', dto, { auth: false }),
  visitorReportMedia: (dto, photos, audio) => upload('/visitor-reports/media', toForm(dto, photos, audio), { auth: false }),
  visitorPreview: (dto, photos, audio) => upload('/visitor-reports/preview', toForm(dto, photos, audio), { auth: false }),
  visitorConfirm: dto => post('/visitor-reports/confirm', dto, { auth: false }),
  trackReport: code => get(`/visitor-reports/${encodeURIComponent(code)}`, { auth: false }),
};