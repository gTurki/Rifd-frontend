import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setToken, setUnauthorizedHandler } from '../lib/api.js';
import { connectLive } from '../lib/ws.js';
import { makeTransform, ZONE_MAP, ZONE_AR, ZK } from '../map/geometry.js';
import { SEV_KEY, ROLES, ROLE_S, STAFF_ROLE, LEVEL, ACTIVE_TASK, ts } from '../lib/labels.js';
import { rank as zrank } from '../map/geometry.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const CONTROL_PAGES = ['overview', 'map', 'incidents', 'incident', 'inbox', 'dispatch', 'staffadmin', 'access', 'analytics', 'sources', 'settings', 'profile'];
const STAFF_PAGES = ['mytasks', 'map', 'report', 'settings', 'profile'];
const AUTH_KEY = 'rifd-auth';

const EMPTY = {
  zones: [], incidents: [], alerts: [], staff: [], tasks: [], recs: {}, routes: [], alts: {}, assets: [],
  notifications: [], activity: [], stats: null, events: [], reporters: [], sim: null,
};

const loadAuth = () => { try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } };
const saveAuth = (a, remember) => {
  try {
    sessionStorage.removeItem(AUTH_KEY); localStorage.removeItem(AUTH_KEY);
    if (a) (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(a));
  } catch (e) { /* private mode */ }
};
const upsert = (list, item) => {
  if (!item || item.id == null) return list;
  const i = list.findIndex(o => o.id === item.id);
  if (i < 0) return [item, ...list];
  const copy = list.slice(); copy[i] = item; return copy;
};

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('rifd-lang') || 'ar'; } catch (e) { return 'ar'; } });
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('rifd-theme') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } });
  const [auth, setAuth] = useState(loadAuth);
  const [page, setPage] = useState(() => (loadAuth() ? (loadAuth().role === 'FIELD' ? 'mytasks' : 'overview') : 'welcome'));
  const [incId, setIncId] = useState(null);
  const [sel, setSel] = useState(null);
  const [mapFull, setMapFull] = useState(false);
  const [layers, setLayers] = useState({ incidents: true, staff: true, access: true, assets: true, gates: true });
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState(null);
  const [bell, setBell] = useState([]);       // session items for the bell (new incidents)
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const role = auth?.role || null;
  const isField = role === 'FIELD';
  const isSup = role === 'SUPERVISOR';
  const me = auth?.staffId || null;
  const T = useCallback((ar, en) => (lang === 'ar' ? ar : en), [lang]);
  const L = useCallback(a => (Array.isArray(a) ? (lang === 'ar' ? a[0] : a[1]) : a), [lang]);

  // ---------------- html attributes ----------------
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = theme;
  }, [lang, theme]);
  useEffect(() => { document.body.style.overflow = mapFull ? 'hidden' : ''; }, [mapFull]);
  const setLang = v => { setLangState(v); try { localStorage.setItem('rifd-lang', v); } catch (e) { /* */ } };
  const setTheme = v => { setThemeState(v); try { localStorage.setItem('rifd-theme', v); } catch (e) { /* */ } };

  // ---------------- toasts ----------------
  const toast = useCallback((kind, title, body, act) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [{ id, kind, title, body, act }, ...t].slice(0, 5));
    setTimeout(() => setToasts(t => t.map(o => (o.id === id ? { ...o, out: true } : o))), kind === 'crit' ? 15000 : 6500);
    setTimeout(() => setToasts(t => t.filter(o => o.id !== id)), kind === 'crit' ? 15300 : 6800);
  }, []);
  const closeToast = id => setToasts(t => t.filter(o => o.id !== id));
  const fail = useCallback(e => toast('crit', T('تعذّر تنفيذ الطلب', 'Request failed'), e?.message || String(e)), [toast, T]);

  // ---------------- auth ----------------
  useEffect(() => { setToken(auth?.token || null); }, [auth]);
  const logout = useCallback(() => {
    saveAuth(null); setAuth(null); setToken(null); setData(EMPTY); setLoaded(false);
    setBell([]); setUnread(0); setSel(null); setPage('welcome');
  }, []);
  useEffect(() => { setUnauthorizedHandler(() => { logout(); }); }, [logout]);

  const login = async (username, password, remember) => {
    const r = await api.login(username.trim(), password);
    const a = { token: r.token, staffId: r.staffId, name: r.name, role: r.role };
    setToken(r.token); saveAuth(a, remember); setAuth(a);
    setPage(r.role === 'FIELD' ? 'mytasks' : 'overview');
    return a;
  };

  // ---------------- navigation ----------------
  const go = useCallback(p => {
    if (role === 'FIELD' && !STAFF_PAGES.includes(p)) p = 'mytasks';
    if (role && role !== 'FIELD' && !CONTROL_PAGES.includes(p)) p = 'overview';
    setPage(p); setSel(null); setMapFull(false);
    window.scrollTo(0, 0);
  }, [role]);
  const openInc = id => { setIncId(String(id)); setPage('incident'); setSel(null); setMapFull(false); window.scrollTo(0, 0); };
  const showOnMap = id => { setPage('map'); setSel({ k: 'inc', v: String(id) }); window.scrollTo(0, 0); };
  const toggleSel = (k, v) => setSel(s => (s && s.k === k && s.v === String(v) ? null : { k, v: String(v) }));

  // ---------------- loading ----------------
  const loadAll = useCallback(async () => {
    if (!auth) return;
    const safe = p => p.catch(() => null);
    if (auth.role === 'FIELD') {
      const [zones, tasks, mine, notifications, routes] = await Promise.all([
        safe(api.zones()), safe(api.tasks({ staffId: auth.staffId })), safe(api.staffById(auth.staffId)),
        safe(api.notifications({ staffId: auth.staffId })), safe(api.routes()),
      ]);
      setData(d => ({ ...d, zones: zones || [], tasks: tasks || [], staff: mine ? [mine] : [], notifications: notifications || [], routes: routes || [] }));
    } else {
      const [zones, incidents, alerts, staff, tasks, routes, assets, notifications, activity, stats, events, sim] = await Promise.all([
        safe(api.zones()), safe(api.incidents()), safe(api.alerts()), safe(api.staff()), safe(api.tasks()), safe(api.routes()),
        safe(api.assets()), safe(api.notifications({ staffId: auth.staffId })), safe(api.activity(60)), safe(api.stats()),
        safe(api.events()), safe(api.simStatus()),
      ]);
      const open = (incidents || []).filter(i => i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM');
      const recLists = await Promise.all(open.map(i => safe(api.incidentRecs(i.id))));
      const recs = {}; open.forEach((i, k) => { recs[i.id] = recLists[k] || []; });
      setData(d => ({
        ...d, zones: zones || [], incidents: incidents || [], alerts: alerts || [], staff: staff || [], tasks: tasks || [],
        routes: routes || [], assets: assets || [], notifications: notifications || [], activity: activity || [],
        stats, events: events || [], recs, sim,
      }));
    }
    setLoaded(true);
  }, [auth]);
  useEffect(() => { if (auth) loadAll(); }, [auth, loadAll]);

  // alternatives of disrupted routes (needed for the map and the accessibility page)
  useEffect(() => {
    const bad = data.routes.filter(r => r.status === 'DISRUPTED');
    if (!bad.length) { if (Object.keys(data.alts).length) setData(d => ({ ...d, alts: {} })); return; }
    let stop = false;
    Promise.all(bad.map(r => api.alternative(r.id).catch(() => null))).then(list => {
      if (stop) return;
      const alts = {}; bad.forEach((r, k) => { if (list[k]) alts[r.id] = list[k]; });
      setData(d => ({ ...d, alts }));
    });
    return () => { stop = true; };
  }, [data.routes]);

  // activity log: no topic of its own -> refreshed shortly after related events
  const actTimer = useRef(null);
  const refreshActivity = useCallback(() => {
    if (!auth || auth.role === 'FIELD') return;
    clearTimeout(actTimer.current);
    actTimer.current = setTimeout(() => { api.activity(60).then(a => setData(d => ({ ...d, activity: a || [] }))).catch(() => {}); }, 700);
  }, [auth]);

  // ---------------- live ----------------
  const pageRef = useRef(page); pageRef.current = page;
  const langRef = useRef(lang); langRef.current = lang;
  // my team: notifications sent to a whole specialty (e.g. the accessibility team) are mine too
  const specRef = useRef(null); specRef.current = ((data.staff.find(s => s.id === me)) || {}).specialty || null;
  useEffect(() => {
    if (!auth) return undefined;
    const field = auth.role === 'FIELD';
    const tt = (ar, en) => (langRef.current === 'ar' ? ar : en);
    return connectLive((topic, type, p) => {
      if (topic === '/topic/incidents' && !field) {
        setData(d => ({ ...d, incidents: upsert(d.incidents, p) }));
        if (type === 'INCIDENT_CREATED') {
          setFlash(String(p.id)); setTimeout(() => setFlash(null), 4000);
          setBell(b => [{ id: 'i' + p.id, incidentId: p.id, sev: SEV_KEY[p.severity], text: p.title, at: p.createdAt }, ...b].slice(0, 20));
          setUnread(u => u + 1);
          if (p.severity !== 'LOW') {
            toast('crit', tt('حادثة جديدة', 'New incident') + ' · ' + p.code, p.title, { kind: 'inc', v: p.id, l: tt('عرض الحادثة', 'View incident') });
          }
        }
        refreshActivity();
      } else if (topic === '/topic/alerts' && !field) {
        setData(d => ({ ...d, alerts: upsert(d.alerts, p) }));
      } else if (topic === '/topic/stats' && field) {
        // the reset deletes every task without a task message: reload, or the field app keeps ghost tasks
        if (type === 'SIMULATION_RESET') { setUnread(0); loadAll(); }
      } else if (topic === '/topic/stats') {
        if (type === 'STATS_UPDATED') setData(d => ({ ...d, stats: p }));
        if (type === 'SIMULATION_RESET') { setBell([]); setUnread(0); setSel(null); loadAll(); toast('info', tt('أُعيد ضبط المحاكاة', 'Simulation reset'), ''); }
        if (type === 'SIMULATION_STARTED') { api.simStatus().then(s => setData(d => ({ ...d, sim: s }))).catch(() => {}); toast('info', tt('بدأت المحاكاة', 'Simulation started'), ''); }
      } else if (topic === '/topic/recommendations' && !field) {
        setData(d => ({ ...d, recs: { ...d.recs, [p.incidentId]: upsert(d.recs[p.incidentId] || [], p) } }));
        refreshActivity();
      } else if (topic === '/topic/tasks') {
        if (field && p.staffId !== auth.staffId) return;
        setData(d => ({ ...d, tasks: upsert(d.tasks, p) }));
        if (field && type === 'TASK_CREATED') {
          toast('info', tt('طلب جديد من مركز العمليات', 'New request from the operations center'), p.incidentTitle, { kind: 'page', v: 'mytasks', l: tt('عرض المهمة', 'View task') });
        }
        refreshActivity();
      } else if (topic === '/topic/staff') {
        if (type === 'STAFF_DELETED') { setData(d => ({ ...d, staff: d.staff.filter(s => s.id !== p.id) })); return; }
        if (field && p.id !== auth.staffId) return;
        setData(d => ({ ...d, staff: upsert(d.staff, p) }));
      } else if (topic === '/topic/routes') {
        if (type === 'ASSET_UPDATED') { if (!field) setData(d => ({ ...d, assets: upsert(d.assets, p) })); }
        else setData(d => ({ ...d, routes: upsert(d.routes, p) }));
        refreshActivity();
      } else if (topic === '/topic/notifications') {
        const mine = p.recipientStaffId === auth.staffId || (p.recipientSpecialty != null && p.recipientSpecialty === specRef.current);
        if (!mine) return;
        setData(d => ({ ...d, notifications: upsert(d.notifications, p) }));
        setUnread(u => u + 1);
      }
    }, setLive);
  }, [auth, loadAll, refreshActivity, toast]);

  // the field app keeps the staff member's own record fresh (position moves on the server)
  useEffect(() => {
    if (!auth || auth.role !== 'FIELD') return undefined;
    const h = setInterval(() => { api.staffById(auth.staffId).then(s => setData(d => ({ ...d, staff: [s] }))).catch(() => {}); }, 5000);
    return () => clearInterval(h);
  }, [auth]);

  // ---------------- view models ----------------
  const vm = useMemo(() => {
    const tf = makeTransform(data.zones);
    const zoneById = {}; data.zones.forEach(z => { zoneById[z.id] = z; });
    const letterOf = zoneId => { const z = zoneById[zoneId]; return z ? ZONE_MAP[z.code] || null : null; };
    const zoneName = zoneId => { const z = zoneById[zoneId]; return z ? [ZONE_AR[z.code] || z.name, z.name] : ['—', '—']; };
    const nearestZoneId = (x, y) => {
      let best = null, bd = Infinity;
      data.zones.forEach(z => { const d = (z.centerX - x) ** 2 + (z.centerY - y) ** 2; if (d < bd) { bd = d; best = z.id; } });
      return best;
    };

    const tasksByInc = {};
    data.tasks.forEach(t => { (tasksByInc[t.incidentId] = tasksByInc[t.incidentId] || []).push(t); });
    const alertsByInc = {};
    data.alerts.forEach(a => { if (a.incidentId != null) (alertsByInc[a.incidentId] = alertsByInc[a.incidentId] || []).push(a); });

    const progress = (inc, tasks) => {
      if (inc.status === 'OPEN') return 'open';
      if (inc.status === 'RESOLVED') return 'resolved';
      if (inc.status === 'FALSE_ALARM') return 'false';
      const act = tasks.filter(t => ACTIVE_TASK.includes(t.status));
      if (act.some(t => t.status === 'ON_SITE')) return 'onsite';
      if (act.some(t => t.status === 'EN_ROUTE')) return 'enroute';
      if (act.some(t => t.status === 'ACCEPTED')) return 'accepted';
      if (act.length) return 'assigned';
      return inc.status === 'IN_PROGRESS' ? 'onsite' : 'assigned';
    };

    // field staff cannot read incidents: their map shows the incidents of their own tasks
    const fromTasks = auth && auth.role === 'FIELD'
      ? Object.values(data.tasks.filter(t => ACTIVE_TASK.includes(t.status)).reduce((m, t) => { m[t.incidentId] = t; return m; }, {})).map(t => {
        const p = tf(t.incidentX, t.incidentY) || [500, 330];
        const st = { PENDING: 'assigned', ACCEPTED: 'accepted', EN_ROUTE: 'enroute', ON_SITE: 'onsite' }[t.status];
        return { id: String(t.incidentId), raw: { id: t.incidentId, createdAt: t.assignedAt }, code: t.incidentCode, title: t.incidentTitle, sev: SEV_KEY[t.incidentSeverity] || 'low',
          status: st, zone: null, zoneName: [t.zoneName || '—', t.zoneName || '—'], x: p[0], y: p[1], total: 1, sources: [], team: [t.staffName],
          tasks: [t], alerts: [], rec: null, recs: [], active: true, inProg: true, t: ts(t.assignedAt) };
      })
      : null;
    const incidents = fromTasks || data.incidents.map(inc => {
      const tasks = tasksByInc[inc.id] || [];
      const alerts = alertsByInc[inc.id] || [];
      const st = progress(inc, tasks);
      const p = tf(inc.x, inc.y) || [500, 330];
      const recs = data.recs[inc.id] || [];
      const rec = recs.find(r => r.status === 'PENDING') || null;
      return {
        id: String(inc.id), raw: inc, code: inc.code, title: inc.title, sev: SEV_KEY[inc.severity] || 'low', status: st,
        zone: letterOf(inc.zoneId), zoneName: zoneName(inc.zoneId), x: p[0], y: p[1],
        total: inc.alertCount || 0, sources: [...new Set(alerts.map(a => a.source))],
        team: tasks.filter(t => ACTIVE_TASK.includes(t.status)).map(t => t.staffName),
        tasks, alerts, rec, recs,
        active: st !== 'resolved' && st !== 'false', inProg: ['assigned', 'accepted', 'enroute', 'onsite'].includes(st),
        t: ts(inc.createdAt),
      };
    });
    const sortQ = (a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || zrank[a.sev] - zrank[b.sev] || b.t - a.t;

    const staffVM = data.staff.filter(s => s.role === 'FIELD').map(s => {
      const p = tf(s.currentX, s.currentY) || [500, 330];
      const zid = s.currentX != null ? nearestZoneId(s.currentX, s.currentY) : s.homeZoneId;
      const task = data.tasks.find(t => t.staffId === s.id && ACTIVE_TASK.includes(t.status));
      return {
        id: String(s.id), raw: s, n: s.name, roleL: ROLES[s.specialty] || STAFF_ROLE[s.role], roleS: ROLE_S[s.specialty] || STAFF_ROLE[s.role],
        status: s.status === 'AVAILABLE' ? 'available' : s.status === 'BUSY' ? 'busy' : 'off',
        x: p[0], y: p[1], zone: letterOf(zid), zoneId: zid, zoneName: zoneName(zid), task,
        certs: [s.specialty ? ROLES[s.specialty] : STAFF_ROLE[s.role], s.level ? LEVEL[s.level] : null].filter(Boolean),
      };
    });

    const routeOf = assetId => data.routes.find(r => (r.assetIds || []).includes(assetId));
    const assetVM = data.assets.map(a => {
      const p = tf(a.x, a.y) || [500, 330];
      const r = routeOf(a.id);
      return { id: String(a.id), raw: a, t: a.type === 'ELEVATOR' ? 'elev' : 'ramp', x: p[0], y: p[1], n: a.name, zone: letterOf(a.zoneId), zoneName: zoneName(a.zoneId), route: r ? r.name : null, ok: a.status === 'OPERATIONAL' };
    });

    const routePath = r => { try { return JSON.parse(r.pathCoordinates || '[]').map(([x, y]) => tf(x, y)).filter(Boolean); } catch (e) { return []; } };
    const routeState = r => (r.status !== 'DISRUPTED' ? 'ok' : (data.alts[r.id] && data.alts[r.id].found ? 'rerouted' : 'affected'));
    const altPath = r => {
      const alt = data.alts[r.id];
      if (!alt || !alt.found || r.status !== 'DISRUPTED') return null;
      const pts = [];
      alt.segments.forEach(sg => { try { JSON.parse(sg.pathCoordinates || '[]').forEach(([x, y]) => { const q = tf(x, y); if (q) pts.push(q); }); } catch (e) { /* */ } });
      return pts.length > 1 ? pts : null;
    };

    const zoneState = z => {
      let s = 'ok';
      incidents.filter(i => i.zone === z && i.active).forEach(i => {
        const st = i.inProg ? 'med' : (i.sev === 'low' ? 'ok' : i.sev);
        if (zrank[st] < zrank[s]) s = st;
      });
      return s;
    };
    const zoneByLetter = {}; data.zones.forEach(z => { const l = ZONE_MAP[z.code]; if (l) zoneByLetter[l] = z; });
    const zoneNames = {}; const zoneCodes = {};
    ZK.forEach(l => { const z = zoneByLetter[l]; zoneNames[l] = z ? [ZONE_AR[z.code] || z.name, z.name] : ['', '']; zoneCodes[l] = z ? z.code : l; });

    return { tf, zoneById, zoneName, letterOf, zoneByLetter, zoneNames, zoneCodes, incidents, sortQ, staff: staffVM, assets: assetVM, routePath, routeState, altPath, zoneState, tasksByInc };
  }, [data, auth]);

  const getInc = id => vm.incidents.find(i => i.id === String(id));

  // ---------------- actions (each refreshes what it touched; live updates do the rest) ----------------
  const run = async (fn, okTitle, okBody) => {
    try { const r = await fn(); if (okTitle) toast('ok', okTitle, okBody || ''); return r; } catch (e) { fail(e); return undefined; }
  };
  const refreshIncident = async id => {
    const [inc, recs, tasks] = await Promise.all([api.incident(id).catch(() => null), api.incidentRecs(id).catch(() => null), api.incidentTasks(id).catch(() => null)]);
    setData(d => {
      let tasksAll = d.tasks; (tasks || []).forEach(t => { tasksAll = upsert(tasksAll, t); });
      return { ...d, incidents: inc ? upsert(d.incidents, inc) : d.incidents, recs: recs ? { ...d.recs, [id]: recs } : d.recs, tasks: tasksAll };
    });
    refreshActivity();
  };
  const refreshTasks = async () => {
    const tasks = await api.tasks(isField ? { staffId: me } : undefined).catch(() => null);
    if (tasks) setData(d => ({ ...d, tasks }));
  };
  const refreshStaff = async () => {
    if (isField) return;
    const staff = await api.staff().catch(() => null);
    if (staff) setData(d => ({ ...d, staff }));
  };
  const refreshReporters = async () => {
    const r = await api.reporters().catch(() => null);
    if (r) setData(d => ({ ...d, reporters: r }));
  };
  const markBellRead = () => setUnread(0);

  const value = {
    lang, setLang, theme, setTheme, T, L, auth, role, isField, isSup, me, login, logout,
    page, go, setPage, incId, openInc, showOnMap, sel, setSel, toggleSel, mapFull, setMapFull, layers, setLayers,
    data, setData, loaded, live, flash, bell, unread, markBellRead, vm, getInc,
    toasts, toast, closeToast, modal, setModal, fail, run,
    loadAll, refreshIncident, refreshTasks, refreshStaff, refreshReporters, refreshActivity,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
