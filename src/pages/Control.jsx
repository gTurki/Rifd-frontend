import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Pill, StChip, SrcIcons, Who, ReasonForm } from '../components/ui.jsx';
import { MapView, MapLegend, ZoneList } from '../map/MapView.jsx';
import { sevColor } from '../map/geometry.js';
import { SRC, SRC_KEYS, ROLES, LEVEL, TRUST, CATEGORY, SEV_KEY, hm, agoText, fmt } from '../lib/labels.js';
import { api } from '../lib/api.js';
import { AttachmentButton } from '../components/Attachment.jsx';
import { LogI } from '../components/Log.jsx';

function QItem({ i }) {
  const { openInc, T, L, lang, flash } = useApp();
  return (
    <button className={'q-item' + (flash === i.id ? ' is-new' : '')} onClick={() => openInc(i.id)}>
      <span className="sev-bar" style={{ background: sevColor(i.sev) }} />
      <span><b>{i.title}</b><small>{L(i.zoneName)} · {T(`${i.total} بلاغ مدموج`, `${i.total} merged`)} · {agoText(i.raw.createdAt, lang)}</small>
        {i.status === 'open' && i.rec ? <div className="q-next"><Icon n="spark" s={14} />{i.rec.playbookTitle}</div> : null}</span>
      <span><StChip st={i.status} /></span>
    </button>
  );
}

// ---------------- overview ----------------
export function Overview() {
  const { vm, data, T, openInc } = useApp();
  const [qOpen, setQOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const list = vm.incidents, act = list.filter(i => i.active);
  const crit = act.filter(i => i.sev === 'crit').length, prog = act.filter(i => i.inProg).length;
  const affected = data.routes.filter(r => r.status === 'DISRUPTED').length;
  const queue = act.filter(i => i.sev !== 'low').sort(vm.sortQ);
  const low = act.filter(i => i.sev === 'low');
  return (
    <>
      <div className="ph"><div><h1>{T('ماذا يحدث الآن', 'What is happening now')}</h1></div></div>
      <section className="kpis" aria-label="KPIs">
        <div className="kpi"><label>{T('حوادث نشطة', 'Active incidents')}</label><b>{act.length}</b><small>{T(`${list.filter(i => i.status === 'open').length} بانتظار القرار`, `${list.filter(i => i.status === 'open').length} awaiting decision`)}</small></div>
        <div className="kpi"><label>{T('عالية الخطورة', 'High severity')}</label><b style={{ color: 'var(--crit)' }}>{crit}</b><small>{T('تدخل فوري', 'immediate action')}</small></div>
        <div className="kpi"><label>{T('قيد التنفيذ', 'In progress')}</label><b style={{ color: 'var(--info)' }}>{prog}</b><small>{T('فرق في الميدان', 'teams in the field')}</small></div>
        <div className="kpi"><label>{T('مسارات مهيأة متأثرة', 'Accessible routes affected')}</label><b style={{ color: affected ? 'var(--access)' : 'var(--fg)' }}>{affected}</b><small>{T(`من ${data.routes.length} مسارات`, `of ${data.routes.length} routes`)}</small></div>
      </section>
      <div className="ov">
        <section className="panel"><div className="panel-h"><div><h2>{T('خريطة المعرض الحية', 'Live Expo map')}</h2></div><MapLegend /></div>
          <MapView mode="overview" /></section>
        <div className="col">
          <section className={'panel q-panel' + (qOpen ? ' open' : '')}>
            <button className="q-toggle" aria-expanded={qOpen} aria-controls="q-list" onClick={() => setQOpen(o => !o)}>
              <h2>{T('تحتاج تدخلك الآن', 'Needs you now')}</h2><span className="q-count">{queue.length}</span><span className="q-chev"><Icon n="chev" s={18} /></span>
            </button>
            <div id="q-list" hidden={!qOpen}>
              <div className="q">{queue.slice(0, 6).map(i => <QItem key={i.id} i={i} />)}
                {!queue.length && <div className="empty">{T('لا توجد حوادث تحتاج قرارًا الآن', 'Nothing needs a decision right now')}</div>}</div>
              {low.length ? <div className="q-more"><span>{T(`${low.length} حادثة منخفضة الخطورة يمكن أن تنتظر`, `${low.length} low-risk incident(s) can wait`)}</span>
                <button className="link" onClick={() => openInc(low[0].id)}>{T('عرض', 'View')}</button></div> : null}
            </div>
          </section>
          <section className={'panel q-panel' + (logOpen ? ' open' : '')}>
            <button className="q-toggle" aria-expanded={logOpen} aria-controls="log-list" onClick={() => setLogOpen(o => !o)}>
              <h2>{T('سجل العمليات', 'Activity log')}</h2><span className="q-count neutral">{data.activity.length}</span><span className="q-chev"><Icon n="chev" s={18} /></span>
            </button>
            <div id="log-list" hidden={!logOpen}><div className="log" style={{ paddingBottom: 10 }}>{data.activity.slice(0, 10).map(l => <LogI key={l.id} l={l} />)}</div></div>
          </section>
        </div>
      </div>
    </>
  );
}

// ---------------- map ----------------
export function MapPage() {
  const { layers, setLayers, T, L, isField } = useApp();
  const L1 = [
    ['incidents', <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--crit)' }} />, ['الحوادث', 'Incidents']],
    ['staff', <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--brand)' }} />, ['الموظفون الميدانيون', 'Field staff']],
    ['access', <span style={{ width: 16, height: 3, borderRadius: 2, background: 'var(--access)' }} />, ['المسارات المهيأة', 'Accessible routes']],
    ['assets', <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px solid var(--access)' }} />, ['المصاعد والمنحدرات', 'Elevators & ramps']],
    ['gates', <span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--raise)', border: '1px solid var(--line-2)' }} />, ['البوابات', 'Gates']],
  ].filter(([k]) => !isField || k !== 'assets');
  return (
    <>
      <div className="ph"><div><h1>{T('الخريطة', 'Map')}</h1></div><span className="demo-tag">{T('نموذج ثلاثي الأبعاد لموقع المعرض', '3D model of the Expo site')}</span></div>
      <div className="mapfull">
        <section className="panel"><div className="panel-h"><h2>{T('الطبقات', 'Layers')}</h2></div>
          <div className="layers">{L1.map(([k, g, n]) => (
            <label className="lay" htmlFor={'ly-' + k} key={k}><span className="gl">{g}</span>{L(n)}
              <input type="checkbox" id={'ly-' + k} checked={!!layers[k]} onChange={e => setLayers(o => ({ ...o, [k]: e.target.checked }))} /><span className="sw" /></label>
          ))}</div>
          <div className="panel-b" style={{ paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--brand)' }} />{T('متاح', 'Available')}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--info)' }} />{T('في مهمة', 'On task')}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 16, height: 0, borderTop: '3px dashed var(--crit)' }} />{T('مسار متأثر', 'Affected route')}</span>
          </div></section>
        <section className="panel" style={{ overflow: 'hidden' }}><div className="panel-h"><MapLegend /></div><MapView mode="full" /></section>
        <section className="panel info"><div className="panel-h"><h2>{T('المناطق', 'Zones')}</h2></div><ZoneList /></section>
      </div>
    </>
  );
}

// ---------------- incidents ----------------
export function Incidents() {
  const { vm, T, L, openInc } = useApp();
  const [f, setF] = useState('active');
  const F = [['all', ['الكل', 'All']], ['active', ['النشطة', 'Active']], ['open', ['بانتظار القرار', 'Awaiting decision']], ['prog', ['قيد التنفيذ', 'In progress']], ['resolved', ['المغلقة', 'Closed']]];
  const fl = { active: i => i.active, open: i => i.status === 'open', prog: i => i.inProg, resolved: i => !i.active, all: () => true }[f];
  const list = vm.incidents.filter(fl).sort(vm.sortQ);
  return (
    <>
      <div className="ph"><div><h1>{T('الحوادث', 'Incidents')}</h1></div></div>
      <div className="chips chips-lg" role="group" aria-label={T('تصفية الحوادث', 'Filter incidents')}>
        {F.map(([k, n]) => <button key={k} className={'chip' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{L(n)}</button>)}</div>
      <section className="panel"><div className="tbl-wrap"><table className="tbl tbl-strong">
        <thead><tr><th /><th>{T('الحادثة', 'Incident')}</th><th>{T('الخطورة', 'Severity')}</th><th>{T('المنطقة', 'Zone')}</th><th>{T('البلاغات', 'Reports')}</th><th>{T('المصادر', 'Sources')}</th><th>{T('المُسند إليه', 'Assigned')}</th><th>{T('الحالة', 'Status')}</th><th>{T('الوقت', 'Time')}</th></tr></thead>
        <tbody>{list.map(i => (
          <tr key={i.id} className="click" tabIndex={0} onClick={() => openInc(i.id)} onKeyDown={e => { if (e.key === 'Enter') openInc(i.id); }}>
            <td style={{ width: 3, paddingInlineEnd: 0 }}><span className="sev-bar" style={{ background: sevColor(i.sev) }} /></td>
            <td><b style={{ fontWeight: 500 }}>{i.title}</b><div className="mono faint" style={{ fontSize: 11 }}>{i.code} · {L(CATEGORY[i.raw.category] || ['', ''])}
              {i.raw.possibleDuplicateOfCode ? ` · ⚠ ${T('احتمال تكرار', 'possible duplicate of')} ${i.raw.possibleDuplicateOfCode}` : ''}</div></td>
            <td><Pill sev={i.sev} /></td><td>{L(i.zoneName)}</td><td className="mono">{i.total}</td><td><SrcIcons list={i.sources} /></td>
            <td>{i.team.length ? i.team.join('، ') : <span className="faint">—</span>}</td><td><StChip st={i.status} /></td><td className="mono muted">{hm(i.raw.createdAt)}</td>
          </tr>))}
          {!list.length && <tr><td colSpan={9} className="empty">{T('لا توجد حوادث في هذا التصنيف', 'No incidents in this view')}</td></tr>}
        </tbody></table></div></section>
    </>
  );
}

// ---------------- inbox ----------------
export function Inbox() {
  const { data, vm, T, L, openInc, me, run, lang } = useApp();
  const [src, setSrc] = useState('all');
  const [dismissing, setDismissing] = useState(null);
  const s = data.stats || {};
  const total = s.totalAlerts || data.alerts.length, merged = s.mergedAlerts || 0, incN = s.totalIncidents || vm.incidents.length;
  const mx = Math.max(1, total);
  const incById = useMemo(() => Object.fromEntries(vm.incidents.map(i => [i.raw.id, i])), [vm.incidents]);
  const present = SRC_KEYS.filter(k => data.alerts.some(a => a.source === k));
  const shown = data.alerts.filter(a => src === 'all' || a.source === src).slice(0, 60);
  return (
    <>
      <div className="ph"><div><h1>{T('صندوق البلاغات', 'Alerts inbox')}</h1></div></div>
      <section className="funnel f3">
        <div className="fn"><label>{T('كل البلاغات', 'All signals')}</label><b>{fmt(total)}</b><div className="fb"><i style={{ width: '100%', background: 'var(--faint)' }} /></div></div>
        <div className="fn"><label>{T('مكررة ودُمجت', 'Duplicates merged')}</label><b>{fmt(merged)}</b><div className="fb"><i style={{ width: `${merged / mx * 100}%`, background: 'var(--brand-mid)' }} /></div></div>
        <div className="fn final"><label>{T('حوادث تحتاج قرارًا', 'Incidents needing a decision')}</label><b>{incN}</b><div className="fb"><i style={{ width: `${Math.max(3, incN / mx * 100)}%`, background: 'var(--brand)' }} /></div></div>
      </section>
      <section className="panel"><div className="panel-h"><h2>{T('آخر البلاغات', 'Latest signals')}</h2>
        <div className="chips"><button className={'chip' + (src === 'all' ? ' on' : '')} onClick={() => setSrc('all')}>{T('كل المصادر', 'All sources')}</button>
          {present.map(k => <button key={k} className={'chip' + (src === k ? ' on' : '')} onClick={() => setSrc(k)}>{L(SRC[k].n)}</button>)}</div></div>
        <div className="tbl-wrap"><table className="tbl tbl-strong">
          <thead><tr><th>{T('الوقت', 'Time')}</th><th>{T('المصدر', 'Source')}</th><th>{T('البلاغ', 'Signal')}</th><th>{T('المنطقة', 'Zone')}</th><th>{T('تقدير الخطورة', 'AI severity')}</th><th>{T('ماذا فعل رِفد', 'What RIFD did')}</th></tr></thead>
          <tbody>{shown.map(a => {
            const inc = a.incidentId != null ? incById[a.incidentId] : null;
            return (
              <tr key={a.id}>
                <td className="mono muted">{hm(a.receivedAt)}</td>
                <td><span className="src">{L((SRC[a.source] || { n: [a.source, a.source] }).n)}</span>
                  {a.reporterTrust ? <div className="muted" style={{ fontSize: 11 }}>{L(TRUST[a.reporterTrust])}</div> : null}</td>
                <td className="msg">{a.rawText}{a.attachmentUrl ? <div><AttachmentButton alert={a} /></div> : null}
                  {dismissing === a.id && <ReasonForm placeholder={T('سبب الاستبعاد', 'Reason')} confirm={T('استبعاد', 'Dismiss')} onCancel={() => setDismissing(null)}
                    onSubmit={reason => run(() => api.dismissAlert(a.id, reason, me), T('استُبعد البلاغ', 'Signal dismissed')).then(() => setDismissing(null))} />}</td>
                <td>{L(vm.zoneName(a.zoneId))}</td>
                <td>{a.aiSeverity ? <><Pill sev={SEV_KEY[a.aiSeverity]} /><div className="muted mono" style={{ fontSize: 11 }}>{a.aiConfidence != null ? (a.aiConfidence === 0.5 ? T('قواعد', 'rules') : `AI ${a.aiConfidence.toFixed(2)}`) : ''}</div></> : <span className="faint">—</span>}</td>
                <td>{a.status === 'DISMISSED' ? <span className="pill s-mute">{T('مستبعد', 'Dismissed')}</span>
                  : inc ? <><button className="link" onClick={() => openInc(inc.id)}>{inc.code}</button>
                    {inc.active && dismissing !== a.id ? <button className="link" style={{ color: 'var(--muted)' }} onClick={() => setDismissing(a.id)}>{T('استبعاد', 'Dismiss')}</button> : null}</>
                    : <span className="faint">{agoText(a.receivedAt, lang)}</span>}</td>
              </tr>);
          })}
            {!shown.length && <tr><td colSpan={6} className="empty">{T('لا توجد بلاغات من هذا المصدر حاليًا', 'No signals from this source right now')}</td></tr>}
          </tbody></table></div></section>
    </>
  );
}

// ---------------- dispatch ----------------
export function Dispatch() {
  const { vm, T, L, openInc, run, refreshStaff } = useApp();
  const [roleF, setRoleF] = useState('all');
  const cols = [['open', ['بانتظار الإسناد', 'Awaiting dispatch']], ['assigned', ['مُسندة', 'Assigned']], ['enroute', ['في الطريق', 'En route']], ['onsite', ['في الموقع', 'On site']], ['resolved', ['أُغلقت', 'Closed']]];
  const colOf = i => (i.status === 'accepted' ? 'assigned' : i.status === 'false' ? 'resolved' : i.status);
  const roles = ['all', ...new Set(vm.staff.map(s => s.raw.specialty).filter(Boolean))];
  const order = { available: 0, busy: 1, off: 2 };
  const staff = vm.staff.filter(s => roleF === 'all' || s.raw.specialty === roleF).sort((a, b) => order[a.status] - order[b.status]);
  const setStatus = (s, status) => run(() => api.staffStatus(s.raw.id, status), T('تم تحديث الحالة', 'Status updated')).then(refreshStaff);
  return (
    <>
      <div className="ph"><div><h1>{T('الإسناد والموظفون', 'Dispatch & staff')}</h1></div></div>
      <div className="board">{cols.map(([k, n]) => {
        const list = vm.incidents.filter(i => colOf(i) === k).sort(vm.sortQ);
        return (
          <section className="bcol" key={k}><div className="bcol-h">{L(n)}<span>{list.length}</span></div>
            {list.map(i => (
              <button className="tcard" key={i.id} onClick={() => openInc(i.id)}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><Pill sev={i.sev} /><span className="mono faint" style={{ fontSize: 11 }}>{i.code}</span></span>
                <b>{i.title}</b>
                <span className="row"><span>{L(i.zoneName)}</span>{i.team.length ? <span className="tnames">{i.team.join('، ')}</span>
                  : <span>{T('رِفد يقترح', 'RIFD suggests')}: {i.rec ? `${i.rec.playbookTitle} (${i.rec.staffCount})` : '—'}</span>}</span>
              </button>))}
            {!list.length && <div className="empty">{T('لا يوجد', 'Nothing here')}</div>}
          </section>);
      })}</div>
      <div className="note"><Icon n="shield" s={18} />{T('لا يُسند رِفد مهمة لموظف غير معتمد لنوعها. مثلًا: الحالات الطبية تذهب لمسعف فقط.', 'RIFD never assigns a task to someone without the right specialty. Medical cases go to paramedics only.')}</div>
      <section className="panel"><div className="panel-h"><h2>{T('الموظفون في الميدان', 'Field staff')}</h2>
        <div className="chips">{roles.map(r => <button key={r} className={'chip' + (roleF === r ? ' on' : '')} onClick={() => setRoleF(r)}>{r === 'all' ? T('الكل', 'All') : L(ROLES[r])}</button>)}</div></div>
        <div className="tbl-wrap"><table className="tbl tbl-strong">
          <thead><tr><th>{T('الموظف', 'Staff')}</th><th>{T('الاعتمادات', 'Certifications')}</th><th>{T('المنطقة', 'Zone')}</th><th>{T('الحالة', 'Status')}</th><th>{T('المهمة الحالية', 'Current task')}</th></tr></thead>
          <tbody>{staff.map(s => (
            <tr key={s.id}>
              <td><Who name={s.n} sub={`${s.raw.employeeNumber} · ${L(s.roleL)}`} /></td>
              <td>{s.certs.map(c => <span className="cert" key={c[1]}>{L(c)}</span>)}</td>
              <td>{L(s.zoneName)}</td>
              <td>{s.status === 'available' ? <span className="pill s-ok"><i className="d" />{T('متاح', 'Available')}</span>
                : s.status === 'busy' ? <span className="pill s-info"><i className="d" />{T('في مهمة', 'On task')}</span>
                  : <span className="pill s-mute">{T('خارج المناوبة', 'Off shift')}</span>}
                {s.status !== 'busy' && <button className="link" style={{ fontSize: 12, marginInlineStart: 8 }} onClick={() => setStatus(s, s.status === 'off' ? 'AVAILABLE' : 'OFF_DUTY')}>
                  {s.status === 'off' ? T('بدء المناوبة', 'Start shift') : T('إنهاء المناوبة', 'End shift')}</button>}</td>
              <td>{s.task ? <><button className="link" onClick={() => openInc(s.task.incidentId)}>{s.task.incidentCode}</button> <span className="muted">{s.task.incidentTitle}</span></> : <span className="faint">—</span>}</td>
            </tr>))}</tbody></table></div></section>
    </>
  );
}

