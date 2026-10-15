// Words shown on screen ([arabic, english]) and how backend enums map onto the design's keys.

// backend has 3 severities; the design's colors: HIGH = red "immediate action"
export const SEV_KEY = { HIGH: 'crit', MEDIUM: 'high', LOW: 'low' };
export const SEV = { crit: ['عالية', 'High'], high: ['متوسطة', 'Medium'], med: ['قيد المعالجة', 'Being handled'], low: ['منخفضة', 'Low'] };
export const SEV_BACK = { crit: 'HIGH', high: 'MEDIUM', low: 'LOW' };
export const ZST = { crit: ['تدخل فوري', 'Immediate action'], high: ['تحتاج متابعة', 'Needs attention'], med: ['تحت المعالجة', 'Being handled'], ok: ['مستقرة', 'Stable'] };

// incident progress as the design shows it (detailed steps come from the tasks)
export const STATUS = {
  open: ['بانتظار القرار', 'Awaiting decision'], assigned: ['تم الإسناد', 'Assigned'], accepted: ['قبل المهمة', 'Accepted'],
  enroute: ['في الطريق', 'En route'], onsite: ['في الموقع', 'On site'], resolved: ['مغلقة', 'Resolved'], false: ['إنذار كاذب', 'False alarm'],
};
export const STEPS = ['assigned', 'accepted', 'enroute', 'onsite', 'resolved'];

export const TASK_KEY = { PENDING: 'assigned', ACCEPTED: 'accepted', EN_ROUTE: 'enroute', ON_SITE: 'onsite', DONE: 'resolved', REJECTED: 'rejected', CANCELLED: 'cancelled' };
export const TASK_ST = {
  PENDING: ['بانتظار القبول', 'Waiting to accept'], ACCEPTED: ['قبل المهمة', 'Accepted'], EN_ROUTE: ['في الطريق', 'En route'],
  ON_SITE: ['في الموقع', 'On site'], DONE: ['أنجزت', 'Done'], REJECTED: ['رُفضت', 'Rejected'], CANCELLED: ['أُلغيت', 'Cancelled'],
};
export const ACTIVE_TASK = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE'];
// next button for the field app
export const NEXT_TASK = {
  PENDING: ['ACCEPTED', ['قبول المهمة', 'Accept task']], ACCEPTED: ['EN_ROUTE', ['بدء التوجه للموقع', 'Head to the site']],
  EN_ROUTE: ['ON_SITE', ['وصلت للموقع', 'I have arrived']], ON_SITE: ['DONE', ['تم إنجاز المهمة', 'Mark as done']],
};

export const SRC = {
  RADIO: { n: ['اللاسلكي', 'Radio'], i: 'walkie' },
  CCTV: { n: ['الكاميرات', 'CCTV'], i: 'cctv' },
  IOT_SENSOR: { n: ['الحساسات وأنظمة المباني', 'Sensors & building systems'], i: 'bms' },
  VISITOR_APP: { n: ['تطبيق الزوار', 'Visitor app'], i: 'phone' },
  SERVICE_REQUEST: { n: ['طلبات الخدمة', 'Service requests'], i: 'service' },
  TELEGRAM: { n: ['بوت تيليجرام', 'Telegram bot'], i: 'chat' },
  STAFF_APP: { n: ['تطبيق الموظفين', 'Staff app'], i: 'badge' },
};
export const SRC_KEYS = Object.keys(SRC);

export const ROLES = {
  MEDICAL: ['مسعف', 'Paramedic'], CROWD_MANAGEMENT: ['إدارة حشود', 'Crowd management'], SECURITY: ['أمن', 'Security'],
  FIRE_SAFETY: ['سلامة وحريق', 'Fire safety'], ACCESSIBILITY: ['فريق ذوي الإعاقة', 'Accessibility team'],
  TECHNICAL: ['فني', 'Technician'], VISITOR_SERVICES: ['خدمة الزوار', 'Visitor services'],
};
export const ROLE_S = {
  MEDICAL: ['مسعف', 'Medic'], CROWD_MANAGEMENT: ['حشود', 'Crowd'], SECURITY: ['أمن', 'Security'], FIRE_SAFETY: ['سلامة', 'Safety'],
  ACCESSIBILITY: ['ذوو الإعاقة', 'Accessibility'], TECHNICAL: ['فني', 'Technical'], VISITOR_SERVICES: ['خدمة زوار', 'Visitor care'],
};
export const LEVEL = { CERTIFIED: ['معتمد', 'Certified'], ASSISTANT: ['مساعد', 'Assistant'] };
export const STAFF_ROLE = { FIELD: ['موظف ميداني', 'Field staff'], OPERATOR: ['مشغّل مركز العمليات', 'Operations operator'], SUPERVISOR: ['مشرف مناوبة', 'Shift supervisor'] };

export const CATEGORY = {
  CROWD: ['ازدحام', 'Crowding'], MEDICAL: ['حالة طبية', 'Medical'], FIRE: ['حريق', 'Fire'], SECURITY: ['أمن', 'Security'],
  LOST_PERSON: ['شخص مفقود', 'Lost person'], ACCESSIBILITY: ['إمكانية الوصول', 'Accessibility'], TECHNICAL_FAILURE: ['عطل فني', 'Technical fault'],
  CLEANLINESS: ['نظافة', 'Cleanliness'], OTHER: ['أخرى', 'Other'],
};

export const TRUST = { NEW: ['جديد', 'New'], TRUSTED: ['موثوق', 'Trusted'], VERIFIED: ['موثّق بالجوال', 'Verified'], FLAGGED: ['عليه بلاغ كاذب', 'Flagged'] };

// field staff "report an issue" types -> a short prefix that helps the classifier
export const REPORT_TYPES = {
  fault: ['عطل فني', 'Technical fault'], crowd: ['ازدحام', 'Crowding'], medical: ['حالة طبية', 'Medical'],
  clean: ['نظافة', 'Cleaning'], security: ['أمن', 'Security'], fire: ['حريق أو دخان', 'Fire or smoke'], other: ['أخرى', 'Other'],
};

// ---------------- time ----------------
export const ts = v => (v ? new Date(v).getTime() : 0);
export const hm = v => { if (!v) return '--:--'; const d = new Date(v); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
export const agoText = (v, lang) => {
  const m = Math.max(0, Math.round((Date.now() - ts(v)) / 60000));
  if (lang === 'ar') return m < 1 ? 'الآن' : m < 60 ? `منذ ${m} د` : `منذ ${Math.round(m / 60)} س`;
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};
export const initials = name => String(name || '').trim().split(/\s+/).map(w => (w.replace(/^ال/, '')[0] || '')).slice(0, 2).join('').toUpperCase();
export const fmt = n => Number(n || 0).toLocaleString('en-US');
