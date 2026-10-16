import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Dropdown, CopyBtn, ReasonForm, Logo } from '../components/ui.jsx';
import { LangSeg } from '../components/Shell.jsx';
import { MapView, MapLegend } from '../map/MapView.jsx';
import { api } from '../lib/api.js';
import { ROLES, LEVEL, STAFF_ROLE, SRC, SRC_KEYS, TRUST, CATEGORY, hm, agoText, initials, fmt } from '../lib/labels.js';
import { ZONE_AR } from '../map/geometry.js';

const SHIFTS = {
  all: [['طوال اليوم', 'All day'], null, null],
  am: [['صباحية · 08:00 – 16:00', 'Morning · 08:00 – 16:00'], '08:00:00', '16:00:00'],
  pm: [['مسائية · 16:00 – 00:00', 'Evening · 16:00 – 00:00'], '16:00:00', '23:59:59'],
  night: [['ليلية · 00:00 – 08:00', 'Night · 00:00 – 08:00'], '00:00:00', '08:00:00'],
};
const zoneOpts = (zones, lang) => zones.map(z => [z.code, `${z.code} · ${lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name}`]);

// ---------------- staff management (supervisor) ----------------
export function StaffAdmin() {
  const { data, T, L, lang, setModal, run, refreshStaff, me } = useApp();
  const [d, setD] = useState({});
  const [err, setErr] = useState([]);
  const [pending, setPending] = useState(null);
  useEffect(() => { refreshStaff(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => { setD(o => ({ ...o, [k]: v })); setErr(e => e.filter(x => x !== k)); };
  const field = (k, label, input, req, wide) => (
    <div className={'field' + (err.includes(k) ? ' bad' : '') + (wide ? ' wide' : '')}><label htmlFor={'ef-' + k}>{label}{req ? <> <i className="req">*</i></> : null}</label>{input}</div>);
  const text = (k, ph, type = 'text', dir) => <input id={'ef-' + k} type={type} value={d[k] || ''} placeholder={ph} dir={dir} onChange={e => set(k, e.target.value)} />;
  const isFieldAcc = d.role === 'FIELD';
  const submit = async e => {
    e.preventDefault();
    const need = ['name', 'role', 'zone'].concat(isFieldAcc ? ['specialty', 'level'] : []);
    const missing = need.filter(k => !d[k]);
    if (missing.length) { setErr(missing); return; }
    const sh = SHIFTS[d.shift || 'all'];
    const r = await run(() => api.createStaff({ name: d.name, phone: d.phone || null, email: d.email || null, role: d.role,
      specialty: isFieldAcc ? d.specialty : null, level: isFieldAcc ? d.level : null, homeZoneCode: d.zone, shiftStart: sh[1], shiftEnd: sh[2] }));
    if (r) { setModal({ kind: 'account', data: r }); setD({}); refreshStaff(); }
  };
  const del = async s => {
    if (pending !== s.id) { setPending(s.id); return; }
    setPending(null);
    // run() gives undefined only on failure (an empty 204 body is null)
    const r = await run(() => api.deleteStaff(s.id), T('حُذف الحساب', 'Account deleted'));
    if (r !== undefined) refreshStaff();
  };
  const list = data.staff.slice().sort((a, b) => b.id - a.id);
  return (
    <>
      <div className="ph"><div><h1>{T('إدارة الموظفين', 'Staff management')}</h1></div></div>
      <section className="panel"><div className="panel-h"><h2>{T('إضافة موظف جديد', 'Add a new employee')}</h2></div>
        <form className="panel-b emp-form" autoComplete="off" noValidate onSubmit={submit}>
          <div className="form-grid">
            {field('name', T('اسم الموظف', 'Full name'), text('name', T('محمد العنزي', 'Mohammed Al-Anazi')), true)}
            {field('role', T('نوع الحساب', 'Account type'), <Dropdown id="ef-role" value={d.role} onChange={v => set('role', v)} placeholder={T('اختر نوع الحساب', 'Choose account type')} options={Object.entries(STAFF_ROLE).map(([k, n]) => [k, L(n)])} />, true)}
            {isFieldAcc && field('specialty', T('التخصص', 'Specialty'), <Dropdown id="ef-specialty" value={d.specialty} onChange={v => set('specialty', v)} placeholder={T('اختر التخصص', 'Choose specialty')} options={Object.entries(ROLES).map(([k, n]) => [k, L(n)])} />, true)}
            {isFieldAcc && field('level', T('المستوى', 'Level'), <Dropdown id="ef-level" value={d.level} onChange={v => set('level', v)} placeholder={T('معتمد أو مساعد', 'Certified or assistant')} options={Object.entries(LEVEL).map(([k, n]) => [k, L(n)])} />, true)}
            {field('zone', T('المنطقة', 'Zone'), <Dropdown id="ef-zone" value={d.zone} onChange={v => set('zone', v)} placeholder={T('اختر المنطقة', 'Choose zone')} options={zoneOpts(data.zones, lang)} />, true)}
            {field('shift', T('المناوبة', 'Shift'), <Dropdown id="ef-shift" value={d.shift || 'all'} onChange={v => set('shift', v)} options={Object.entries(SHIFTS).map(([k, s]) => [k, L(s[0])])} />)}
            {field('phone', T('رقم الجوال', 'Mobile'), text('phone', '05XXXXXXXX', 'tel', 'ltr'))}
            {field('email', T('البريد الإلكتروني', 'Email'), text('email', 'name@expo2030.sa', 'email', 'ltr'))}
          </div>
          {err.length ? <p className="form-err">{T('أكمل الحقول المطلوبة', 'Complete the required fields')}</p> : null}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary"><Icon n="userplus" s={17} />{T('إنشاء حساب', 'Create account')}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setD({}); setErr([]); }}><Icon n="reset" s={16} />{T('مسح الحقول', 'Clear')}</button>
          </div>
        </form></section>
      <section className="panel">
        <div className="panel-h"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2>{T('الحسابات', 'Accounts')}</h2><span className="q-count neutral">{list.length}</span></div></div>
        <div className="tbl-wrap"><table className="tbl tbl-strong">
          <thead><tr><th>{T('الموظف', 'Employee')}</th><th>{T('التخصص', 'Specialty')}</th><th>{T('المنطقة', 'Zone')}</th><th>{T('نوع الحساب', 'Type')}</th><th>{T('اسم المستخدم', 'Username')}</th><th /></tr></thead>
          <tbody>{list.map(s => {
            const z = data.zones.find(o => o.id === s.homeZoneId);
            return (
              <tr key={s.id}>
                <td><span className="who"><span className="av">{initials(s.name)}</span><span><b>{s.name}</b><small className="mono" dir="ltr">{s.employeeNumber}</small></span></span></td>
                <td>{s.specialty ? `${L(ROLES[s.specialty])} · ${L(LEVEL[s.level] || ['', ''])}` : <span className="faint">—</span>}</td>
                <td>{z ? (lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name) : '—'}</td>
                <td><span className="pill s-mute">{L(STAFF_ROLE[s.role])}</span></td>
                <td><span className="cred-cell"><code dir="ltr">{s.username}</code><CopyBtn text={s.username || ''} /></span></td>
                <td><span className="row-acts">{s.id !== me && (
                  <button className={'btn btn-ghost btn-sm' + (pending === s.id ? ' danger' : '')} onClick={() => del(s)} aria-label={T('حذف الحساب', 'Delete account')}>
                    <Icon n="trash" s={14} />{pending === s.id ? T('تأكيد الحذف', 'Confirm') : ''}</button>)}</span></td>
              </tr>);
          })}</tbody></table></div>
      </section>
    </>
  );
}

// what the visitor app shows right now (published route changes only)
function Phone() {
  const { data, T, lang } = useApp();
  const live = data.routes.filter(r => r.status === 'DISRUPTED' && r.publishedAt);
  const draft = data.routes.filter(r => r.status === 'DISRUPTED' && !r.publishedAt);
  return (
    <div className="phone" aria-label={T('معاينة تطبيق الزائر', 'Visitor app preview')}><div className="screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bar"><span>{hm(new Date())}</span><span>Expo 2030</span></div>
      <h4>{T('مساري المهيأ', 'My accessible route')}</h4>
      {!live.length && !draft.length && <div className="card okc"><b>{T('جميع المسارات المهيأة تعمل', 'All accessible routes are open')}</b><p>{T('لا توجد تغييرات على المسارات الآن.', 'No route changes right now.')}</p></div>}
      {live.map(r => <div className="card alertc" key={r.id}><b>{T('تغيير مؤقت في مسارك', 'Temporary route change')}</b><p>{lang === 'ar' ? r.publicMessageAr : r.publicMessageEn}</p></div>)}
      {draft.map(r => <div key={r.id}><span className="draft">{T('معاينة — لم يُنشر بعد', 'PREVIEW — not published')}</span>
        <div className="card alertc"><b>{T('تغيير مؤقت في مسارك', 'Temporary route change')}</b><p>{lang === 'ar' ? r.publicMessageAr : r.publicMessageEn}</p></div></div>)}
    </div></div>
  );
}

// ---------------- accessibility ----------------
export function Access() {
  const { data, vm, T, L, me, run, isSup, openInc, lang } = useApp();
  const [assetsOpen, setAssetsOpen] = useState(true);
  const elev = data.assets.filter(a => a.type === 'ELEVATOR'), ramps = data.assets.filter(a => a.type !== 'ELEVATOR');
  const ok = list => list.filter(a => a.status === 'OPERATIONAL').length;
  const disrupted = data.routes.filter(r => r.status === 'DISRUPTED');
  const team = data.staff.filter(s => s.specialty === 'ACCESSIBILITY' && s.status !== 'OFF_DUTY').length;
  const ASSET_ST = { OPERATIONAL: ['يعمل', 'Working'], OUT_OF_SERVICE: ['متوقف', 'Out of service'], MAINTENANCE: ['صيانة', 'Maintenance'] };
  return (
    <>
      <div className="ph"><div><h1>{T('إمكانية الوصول', 'Accessibility')}</h1></div></div>
      <div className="sumrow">
        <div className={'sum' + (ok(elev) < elev.length ? ' warn' : '')}><label>{T('المصاعد العاملة', 'Elevators working')}</label><b>{ok(elev)}<span> / {elev.length}</span></b></div>
        <div className={'sum' + (ok(ramps) < ramps.length ? ' warn' : '')}><label>{T('المنحدرات والأصول الأخرى', 'Ramps & other assets')}</label><b>{ok(ramps)}<span> / {ramps.length}</span></b></div>
        <div className={'sum' + (disrupted.length ? ' warn' : '')}><label>{T('مسارات مهيأة سالكة', 'Accessible routes open')}</label><b>{data.routes.length - disrupted.length}<span> / {data.routes.length}</span></b></div>
        <div className="sum"><label>{T('فريق ذوي الإعاقة في المناوبة', 'Accessibility team on shift')}</label><b>{team}</b></div>
      </div>
      <div className="accg">
        <div className="col">
          <section className="panel" style={{ overflow: 'hidden' }}><div className="panel-h"><h2>{T('المسارات المهيأة على الخريطة', 'Accessible routes on the map')}</h2><MapLegend /></div><MapView mode="access" /></section>
          {disrupted.map(r => {
            const alt = data.alts[r.id];
            const down = data.assets.filter(a => (r.assetIds || []).includes(a.id) && a.status !== 'OPERATIONAL');
            const inc = vm.incidents.find(i => i.active && down.some(a => a.id === i.raw.accessibilityAssetId));
            return (
              <section className="acc-card" key={r.id}>
                <h3>{r.name}<span style={{ marginInlineStart: 'auto' }}>{alt && alt.found ? <span className="pill s-acc"><i className="d" />{T('يوجد بديل', 'Alternative ready')}</span> : <span className="pill s-crit"><i className="d" />{T('بدون بديل', 'No alternative')}</span>}</span></h3>
                <div className="acc-route">
                  <div><small>{T('السبب', 'Cause')}</small>{down.map(a => a.name).join('، ') || '—'}</div>
                  <Icon n="arrow" s={18} flip style={{ color: 'var(--access)' }} />
                  <div><small>{T('البديل', 'Alternative')}</small>{alt && alt.found ? <><b>{alt.segments.map(s => s.name).join(' ← ')}</b> · ~{alt.estimatedMinutes} {T('د', 'min')}</> : T('مكتب خدمة الزوار', 'Visitor services desk')}</div>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>{lang === 'ar' ? r.publicMessageAr : r.publicMessageEn}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {r.publishedAt ? <span className="muted" style={{ fontSize: 13 }}>{T('منشور على تطبيق الزوار', 'Live on the visitor app')} · {hm(r.publishedAt)}</span>
                    : <button className="btn btn-primary btn-sm" onClick={() => run(() => api.publishRoute(r.id, me), T('نُشر التحديث للزوار', 'Update published to visitors'))}>{T('نشر التحديث للزوار', 'Publish update to visitors')}</button>}
                  {inc ? <button className="btn btn-ghost btn-sm" onClick={() => openInc(inc.id)}>{T('فتح الحادثة', 'Open incident')} {inc.code}</button> : null}
                </div>
              </section>);
          })}
          <section className={'panel q-panel' + (assetsOpen ? ' open' : '')}>
            <button className="q-toggle" aria-expanded={assetsOpen} onClick={() => setAssetsOpen(o => !o)}>
              <h2>{T('المصاعد والمنحدرات', 'Elevators & ramps')}</h2><span className="q-count neutral">{data.assets.length}</span><span className="q-chev"><Icon n="chev" s={18} /></span></button>
            <div className="tbl-wrap" hidden={!assetsOpen}><table className="tbl tbl-strong">
              <thead><tr><th>{T('الأصل', 'Asset')}</th><th>{T('النوع', 'Type')}</th><th>{T('المنطقة', 'Zone')}</th><th>{T('المسار', 'Route')}</th><th>{T('الحالة', 'Status')}</th></tr></thead>
              <tbody>{[...elev, ...ramps].map(a => {
                const r = data.routes.find(o => (o.assetIds || []).includes(a.id));
                return (
                  <tr key={a.id}><td>{a.name}</td><td>{a.type === 'ELEVATOR' ? T('مصعد', 'Elevator') : a.type === 'RAMP' ? T('منحدر', 'Ramp') : a.type}</td>
                    <td>{L(vm.zoneName(a.zoneId))}</td><td>{r ? r.name : '—'}</td>
                    <td>{isSup ? <Dropdown value={a.status} options={Object.entries(ASSET_ST).map(([k, n]) => [k, L(n)])}
                      onChange={v => { if (v !== a.status) run(() => api.assetStatus(a.id, v, me), T('تم تحديث حالة الأصل', 'Asset updated')); }} />
                      : a.status === 'OPERATIONAL' ? <span className="pill s-ok"><i className="d" />{T('يعمل', 'Working')}</span> : <span className="pill s-crit"><i className="d" />{L(ASSET_ST[a.status])}</span>}</td></tr>);
              })}</tbody></table></div></section>
        </div>
        <div className="col"><section className="panel"><div className="panel-h"><div><h2>{T('ما يراه الزائر الآن', 'What visitors see now')}</h2></div></div><div className="panel-b"><Phone /></div></section></div>
      </div>
    </>
  );
}

// ---------------- analytics (real numbers from the backend) ----------------
function Bars({ labels, values, top }) {
  const W = 640, H = 250, pl = 40, pr = 12, pt = 26, pb = 30;
  const mx = Math.max(4, ...values) * 1.15;
  const bw = (W - pl - pr) / Math.max(1, labels.length);
  const yy = v => pt + (H - pt - pb) * (1 - v / mx);
  const ticks = [0, Math.round(mx / 3), Math.round(2 * mx / 3)];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ direction: 'ltr' }} role="img">
      {ticks.map(t => <g key={t}><line className="ch-grid" x1={pl} x2={W - pr} y1={yy(t)} y2={yy(t)} /><text className="ch-ax" x={pl - 8} y={yy(t) + 4} textAnchor="end">{t}</text></g>)}
      {labels.map((h, k) => {
        const bx = pl + k * bw + bw * .18, w = bw * .64, tp = yy(values[k]);
        return (<g key={k}><rect className={'ch-bar' + (k >= labels.length - 2 ? ' pk' : '')} x={bx} y={tp} width={w} height={yy(0) - tp} rx="4" />
          {top ? <text className="ch-lbl" x={bx + w / 2} y={tp - 7} textAnchor="middle">{top[k]}</text> : null}
          <text className="ch-ax" x={bx + w / 2} y={H - 10} textAnchor="middle">{h}</text></g>);
      })}
    </svg>
  );
}

export function Analytics() {
  const { data, vm, T, L } = useApp();
  const s = data.stats || {};
  const noise = s.totalAlerts ? Math.max(0, Math.round((1 - (s.totalIncidents || 0) / s.totalAlerts) * 100)) : 0;
  const closed = vm.incidents.filter(i => !i.active).length;
  // average minutes from assignment to arrival on site
  const arrivals = data.tasks.filter(t => t.assignedAt && t.arrivedAt).map(t => (new Date(t.arrivedAt) - new Date(t.assignedAt)) / 60000);
  const avgArrive = arrivals.length ? (arrivals.reduce((a, b) => a + b, 0) / arrivals.length).toFixed(1) : '—';
  const acks = vm.incidents.filter(i => i.raw.acknowledgedAt).map(i => (new Date(i.raw.acknowledgedAt) - new Date(i.raw.createdAt)) / 60000);
  const avgAck = acks.length ? (acks.reduce((a, b) => a + b, 0) / acks.length).toFixed(1) : '—';
  // alerts per 5-minute bucket (last 12) with incidents opened in the same bucket on top
  const buckets = useMemo(() => {
    const now = Date.now(), size = 5 * 60000, n = 12;
    const lab = [], al = new Array(n).fill(0), inc = new Array(n).fill(0);
    for (let k = 0; k < n; k++) { const d = new Date(now - (n - 1 - k) * size); lab.push(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')); }
    const idx = t => n - 1 - Math.floor((now - new Date(t).getTime()) / size);
    data.alerts.forEach(a => { const k = idx(a.receivedAt); if (k >= 0 && k < n) al[k] += 1; });
    vm.incidents.forEach(i => { const k = idx(i.raw.createdAt); if (k >= 0 && k < n) inc[k] += 1; });
    return { lab, al, inc };
  }, [data.alerts, vm.incidents]);
  const perZone = Object.entries(vm.incidents.reduce((m, i) => { const k = L(i.zoneName); m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const perCat = Object.entries(vm.incidents.reduce((m, i) => { m[i.raw.category] = (m[i.raw.category] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const zmax = Math.max(1, ...perZone.map(z => z[1]));
  return (
    <>
      <div className="ph"><div><h1>{T('التحليلات', 'Analytics')}</h1></div></div>
      <section className="kv4">
        <div className="kpi"><label>{T('تقليل الضوضاء', 'Noise reduction')}</label><b>{noise}%</b><small>{T(`${fmt(s.totalAlerts)} بلاغ ← ${fmt(s.totalIncidents)} حادثة`, `${fmt(s.totalAlerts)} signals → ${fmt(s.totalIncidents)} incidents`)}</small></div>
        <div className="kpi"><label>{T('الحوادث', 'Incidents')}</label><b><span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{closed}<span style={{ fontSize: 18, color: 'var(--muted)' }}>/{vm.incidents.length}</span></span> <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--f-body)' }}>{T('أُغلقت', 'closed')}</span></b></div>
        <div className="kpi"><label>{T('متوسط زمن الوصول', 'Avg time to arrive')}</label><b>{avgArrive} <span style={{ fontSize: 15, color: 'var(--muted)' }}>{T('د', 'min')}</span></b></div>
        <div className="kpi"><label>{T('متوسط زمن الاطلاع', 'Avg time to acknowledge')}</label><b>{avgAck} <span style={{ fontSize: 15, color: 'var(--muted)' }}>{T('د', 'min')}</span></b></div>
      </section>
      <div className="an">
        <section className="panel"><div className="panel-h"><h2>{T('البلاغات لكل 5 دقائق (والحوادث فوقها)', 'Signals per 5 minutes (incidents on top)')}</h2></div><div className="panel-b"><Bars labels={buckets.lab} values={buckets.al} top={buckets.inc} /></div></section>
        <section className="panel"><div className="panel-h"><h2>{T('من قرر؟', 'Who decided?')}</h2></div><div className="panel-b"><div className="hb">
          {[[T('تصنيف بالذكاء الاصطناعي', 'AI classification'), s.aiDecisions], [T('تصنيف بالقواعد', 'Rules classification'), s.fallbackDecisions],
            [T('دمج بالذكاء الاصطناعي', 'AI merges'), s.aiMerges], [T('دمج بالقواعد', 'Rules merges'), s.fallbackMerges]].map(([n, v]) => (
            <div className="hb-r" key={n}><span>{n}</span><span className="t"><i style={{ width: `${(v || 0) / Math.max(1, s.totalAlerts || 1) * 100}%` }} /></span><span>{v || 0}</span></div>))}
        </div></div></section>
      </div>
      <div className="an">
        <section className="panel"><div className="panel-h"><h2>{T('الحوادث لكل منطقة', 'Incidents per zone')}</h2></div><div className="panel-b"><div className="hb">
          {perZone.map(([z, n]) => <div className="hb-r" key={z}><span>{z}</span><span className="t"><i style={{ width: `${n / zmax * 100}%` }} /></span><span>{n}</span></div>)}
          {!perZone.length && <div className="empty">{T('لا توجد حوادث بعد', 'No incidents yet')}</div>}</div></div></section>
        <section className="panel"><div className="panel-h"><h2>{T('الحوادث حسب النوع', 'Incidents by type')}</h2></div><div className="panel-b"><div className="hb">
          {perCat.map(([c, n]) => <div className="hb-r" key={c}><span>{L(CATEGORY[c] || [c, c])}</span><span className="t"><i style={{ width: `${n / Math.max(1, perCat[0][1]) * 100}%` }} /></span><span>{n}</span></div>)}
          {!perCat.length && <div className="empty">{T('لا توجد حوادث بعد', 'No incidents yet')}</div>}</div></div></section>
      </div>
    </>
  );
}

// ---------------- sources ----------------
export function Sources() {
  const { data, T, L, lang, me, run, refreshReporters } = useApp();
  const [blocking, setBlocking] = useState(null);
  useEffect(() => { refreshReporters(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = SRC_KEYS.map(k => {
    const list = data.alerts.filter(a => a.source === k);
    const last = list.reduce((m, a) => (!m || new Date(a.receivedAt) > new Date(m) ? a.receivedAt : m), null);
    return [k, list.length, last];
  });
  const mx = Math.max(1, ...rows.map(r => r[1]));
  const active = rows.filter(r => r[1] > 0).length;
  return (
    <>
      <div className="ph"><div><h1>{T('المصادر', 'Sources')}</h1></div></div>
      <section className="flow">
        <div className="flow-n"><b>{active || SRC_KEYS.length}</b><span>{T('مصادر منفصلة', 'separate sources')}</span></div>
        <span className="flow-a"><Icon n="arrow" s={26} flip /></span>
        <div className="flow-c"><b><Logo s={26} /> {T('رِفد', 'RIFD')}</b><ol><li>{T('فرز حسب الخطورة', 'Triage by severity')}</li><li>{T('دمج المكرر في حادثة واحدة', 'Merge duplicates into one incident')}</li><li>{T('اقتراح الإجراء والموظف المناسب', 'Recommend the action and the right person')}</li></ol></div>
        <span className="flow-a"><Icon n="arrow" s={26} flip /></span>
        <div className="flow-o"><div><Icon n="pin" s={16} />{T('حادثة على الخريطة', 'Incident on the map')}</div><div><Icon n="users" s={16} />{T('مهمة لموظف معتمد', 'Task to certified staff')}</div><div><Icon n="access" s={16} />{T('تحديث مسار ذوي الإعاقة', 'Accessible route update')}</div></div>
      </section>
      <section className="panel"><div className="tbl-wrap"><table className="tbl tbl-strong">
        <thead><tr><th>{T('المصدر', 'Source')}</th><th>{T('البلاغات', 'Signals')}</th><th>{T('الحالة', 'Status')}</th><th>{T('آخر بلاغ', 'Last signal')}</th></tr></thead>
        <tbody>{rows.map(([k, n, last]) => (
          <tr key={k}><td><span className="src" style={{ fontWeight: 500 }}>{L(SRC[k].n)}</span></td>
            <td><span className="share"><span className="t"><i style={{ width: `${n / mx * 100}%` }} /></span><span className="mono">{n}</span></span></td>
            <td>{last && Date.now() - new Date(last) < 15 * 60000 ? <span className="conn"><i />{T('نشط', 'Active')}</span> : <span className="conn warn"><i />{T('لا بلاغات حديثة', 'No recent signals')}</span>}</td>
            <td className="mono muted">{last ? agoText(last, lang) : '—'}</td></tr>))}</tbody></table></div></section>
      <section className="panel"><div className="panel-h"><h2>{T('مبلّغو تيليجرام', 'Telegram reporters')}</h2><span className="q-count neutral">{data.reporters.length}</span></div>
        <div className="tbl-wrap"><table className="tbl tbl-strong">
          <thead><tr><th>{T('المبلّغ', 'Reporter')}</th><th>{T('الثقة', 'Trust')}</th><th>{T('البلاغات', 'Reports')}</th><th>{T('مؤكدة', 'Confirmed')}</th><th>{T('كاذبة', 'False')}</th><th>{T('الحالة', 'Status')}</th></tr></thead>
          <tbody>{data.reporters.map(r => (
            <tr key={r.id}><td><b style={{ fontWeight: 500 }}>{r.firstName || '—'}</b>{r.username ? <div className="mono muted" style={{ fontSize: 11 }} dir="ltr">@{r.username}</div> : null}
              {r.maskedPhone ? <div className="mono muted" style={{ fontSize: 11 }} dir="ltr">{r.maskedPhone}</div> : null}</td>
              <td>{L(TRUST[r.trust] || [r.trust, r.trust])}</td><td className="mono">{r.reportCount}</td><td className="mono">{r.confirmedCount}</td><td className="mono">{r.falseReportCount}</td>
              <td>{blocking === r.id ? <ReasonForm placeholder={T('السبب', 'Reason')} confirm={r.blocked ? T('فك الحظر', 'Unblock') : T('حظر', 'Block')} onCancel={() => setBlocking(null)}
                onSubmit={reason => run(() => (r.blocked ? api.unblockReporter(r.id, reason, me) : api.blockReporter(r.id, reason, me)), r.blocked ? T('فُك الحظر', 'Unblocked') : T('حُظر المبلّغ', 'Reporter blocked')).then(() => { setBlocking(null); refreshReporters(); })} />
                : <>{r.blocked ? <span className="pill s-crit"><i className="d" />{T('محظور', 'Blocked')}</span> : <span className="pill s-ok"><i className="d" />{T('نشط', 'Active')}</span>}
                  <button className="link" style={{ fontSize: 12, marginInlineStart: 8 }} onClick={() => setBlocking(r.id)}>{r.blocked ? T('فك الحظر', 'Unblock') : T('حظر', 'Block')}</button></>}</td></tr>))}
            {!data.reporters.length && <tr><td colSpan={6} className="empty">{T('لا يوجد مبلّغون بعد', 'No reporters yet')}</td></tr>}</tbody></table></div></section>
    </>
  );
}

// ---------------- settings ----------------
export function Settings() {
  const { T, theme, setTheme, go, logout, isField, isSup, data, run, setData } = useApp();
  const sim = data.sim;
  const refreshSim = () => api.simStatus().then(s => setData(d => ({ ...d, sim: s }))).catch(() => {});
  return (
    <>
      <div className="ph"><div><h1>{T('الإعدادات', 'Settings')}</h1></div></div>
      <section className="panel set">
        <div className="set-r"><div><b>{T('اللغة', 'Language')}</b></div><LangSeg full /></div>
        <div className="set-r"><div><b>{T('المظهر', 'Appearance')}</b></div>
          <div className="theme-sw" role="group" aria-label={T('المظهر', 'Appearance')}>
            <button className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Icon n="moon" s={16} />{T('داكن', 'Dark')}</button>
            <button className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Icon n="sun" s={16} />{T('فاتح', 'Light')}</button>
          </div></div>
      </section>
      {!isField && (
        <section className="panel set">
          <div className="set-r"><div><b>{T('المحاكاة', 'Simulation')}</b>
            <div className="muted" style={{ fontSize: 12 }}>{sim ? (sim.running ? T(`تعمل: ${sim.sentAlerts} / ${sim.totalAlerts} بلاغ`, `Running: ${sim.sentAlerts} / ${sim.totalAlerts} signals`) : T('متوقفة', 'Stopped')) : '—'}</div></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => run(() => api.simStart('demo'), T('بدأ السيناريو الأساسي', 'Main scenario started')).then(refreshSim)}>{T('السيناريو الأساسي', 'Main scenario')}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.simStart('fire'), T('بدأ سيناريو الحريق', 'Fire scenario started')).then(refreshSim)}><Icon n="fire" s={15} />{T('سيناريو الحريق', 'Fire scenario')}</button>
              {isSup && <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.simReset()).then(refreshSim)}><Icon n="reset" s={15} />{T('إعادة الضبط', 'Reset')}</button>}
            </div></div>
        </section>)}
      <section className="panel set">
        <a className="set-r set-link" tabIndex={0} role="link" onClick={() => go('profile')}><div><b>{T('بياناتي', 'My profile')}</b></div><Icon n="chev" s={18} flip /></a>
        <div className="set-r"><div><b>{T('تسجيل الخروج', 'Sign out')}</b></div>
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon n="logout" s={15} style={{ color: 'var(--crit)' }} />{T('خروج', 'Sign out')}</button></div>
      </section>
    </>
  );
}

// ---------------- profile ----------------
export function Profile() {
  const { T, L, go, me, run, lang, data } = useApp();
  const [p, setP] = useState(null);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});
  const [pw, setPw] = useState({ cur: '', next: '' });
  useEffect(() => { api.staffById(me).then(setP).catch(() => {}); }, [me]);
  if (!p) return <p className="muted">{T('جاري التحميل…', 'Loading…')}</p>;
  const zone = data.zones.find(z => z.id === p.homeZoneId);
  const rows = [
    [T('الاسم', 'Name'), p.name], [T('الرقم الوظيفي', 'Employee ID'), <span className="mono" dir="ltr">{p.employeeNumber}</span>],
    [T('اسم المستخدم', 'Username'), <span className="mono" dir="ltr">{p.username}</span>], [T('نوع الحساب', 'Account type'), L(STAFF_ROLE[p.role])],
    ...(p.specialty ? [[T('التخصص', 'Specialty'), `${L(ROLES[p.specialty])} · ${L(LEVEL[p.level] || ['', ''])}`]] : []),
    [T('منطقة العمل', 'Work zone'), zone ? (lang === 'ar' ? ZONE_AR[zone.code] || zone.name : zone.name) : '—'],
    [T('المناوبة', 'Shift'), <span className="mono" dir="ltr">{(p.shiftStart || '').slice(0, 5)} – {(p.shiftEnd || '').slice(0, 5)}</span>],
  ];
  const save = async () => { const r = await run(() => api.updateMe({ phone: f.phone, email: f.email }), T('تم حفظ بياناتك', 'Your details were saved')); if (r) { setP(r); setEdit(false); } };
  const contact = (k, label, type) => (edit
    ? <div className="set-r" key={k}><span className="muted">{label}</span><input className="prof-in" type={type} dir="ltr" value={f[k] || ''} onChange={e => setF(o => ({ ...o, [k]: e.target.value }))} /></div>
    : <div className="set-r" key={k}><span className="muted">{label}</span><b><span className="mono" dir="ltr">{p[k] || '—'}</span></b></div>);
  return (
    <>
      <div className="ph prof-ph"><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><button className="btn btn-ghost btn-sm" aria-label={T('رجوع', 'Back')} onClick={() => go('settings')}><Icon n="arrow" s={16} /></button><h1>{T('بياناتي', 'My profile')}</h1></div>
        {!edit && <button className="prof-edit" aria-label={T('تعديل البيانات', 'Edit details')} onClick={() => { setF({ phone: p.phone || '', email: p.email || '' }); setEdit(true); }}><Icon n="edit" s={20} /></button>}</div>
      <section className="panel set prof-card"><span className="prof-av">{initials(p.name)}</span><div><b>{p.name}</b><small>{L(STAFF_ROLE[p.role])}</small></div></section>
      <section className="panel set">{rows.map(([k, v]) => <div className="set-r" key={k}><span className="muted">{k}</span><b>{v}</b></div>)}
        {contact('phone', T('رقم الجوال', 'Mobile'), 'tel')}{contact('email', T('البريد الإلكتروني', 'Email'), 'email')}
        {edit && <div className="set-r prof-acts"><button className="btn btn-primary" onClick={save}><Icon n="check" s={16} />{T('حفظ', 'Save')}</button><button className="btn btn-ghost" onClick={() => setEdit(false)}>{T('إلغاء', 'Cancel')}</button></div>}
      </section>
      <section className="panel set">
        <form className="set-r" style={{ flexWrap: 'wrap', gap: 10 }} onSubmit={async e => {
          e.preventDefault();
          const r = await run(() => api.changePassword(pw.cur, pw.next), T('تم تغيير كلمة المرور', 'Password changed'));
          if (r !== undefined) setPw({ cur: '', next: '' });
        }}>
          <b>{T('تغيير كلمة المرور', 'Change password')}</b>
          <input className="prof-in" type="password" dir="ltr" placeholder={T('الحالية', 'Current')} value={pw.cur} onChange={e => setPw(o => ({ ...o, cur: e.target.value }))} />
          <input className="prof-in" type="password" dir="ltr" placeholder={T('الجديدة (8 أحرف على الأقل)', 'New (8+ characters)')} value={pw.next} onChange={e => setPw(o => ({ ...o, next: e.target.value }))} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!pw.cur || pw.next.length < 8}>{T('تغيير', 'Change')}</button>
        </form>
      </section>
    </>
  );
}
