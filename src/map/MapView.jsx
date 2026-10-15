import { useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { M, getMap3D } from './Map3D.js';
import { Icon, Pill, ZPill, StChip, Who } from '../components/ui.jsx';
import { ZCSS } from './geometry.js';
import { SRC } from '../lib/labels.js';

export function MapLegend() {
  const { T } = useApp();
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--crit)' }} />{T('عالية', 'High')}</span>
      <span><i style={{ background: 'var(--high)' }} />{T('متوسطة', 'Medium')}</span>
      <span><i style={{ background: 'var(--med)' }} />{T('قيد المعالجة', 'Being handled')}</span>
      <span><i style={{ background: 'var(--ok)' }} />{T('مستقرة', 'Stable')}</span>
      <span><i style={{ background: 'var(--access)', borderRadius: 2, height: 3, width: 14 }} />{T('مسار مهيأ', 'Accessible route')}</span>
    </div>
  );
}

function MapCard() {
  const { sel, setSel, getInc, vm, T, L, openInc, isField } = useApp();
  if (!sel) return null;
  const close = <button className="x" aria-label={T('إغلاق', 'Close')} onClick={() => setSel(null)}><Icon n="x" s={16} /></button>;
  if (sel.k === 'inc') {
    const i = getInc(sel.v);
    if (!i) return null;
    return (
      <div className="map-card">{close}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Pill sev={i.sev} /><span className="mono faint" style={{ fontSize: 12 }}>{i.code}</span></div>
        <h3>{i.title}</h3>
        <dl className="kv">
          <dt>{T('الموقع', 'Location')}</dt><dd>{L(i.zoneName)}</dd>
          <dt>{T('البلاغات', 'Reports')}</dt><dd>{T(`${i.total} بلاغ من ${i.sources.length || 1} مصادر`, `${i.total} from ${i.sources.length || 1} sources`)}</dd>
          <dt>{T('المُسند إليه', 'Assigned')}</dt><dd>{i.team.join('، ') || '—'}</dd>
          <dt>{T('الحالة', 'Status')}</dt><dd><StChip st={i.status} /></dd>
        </dl>
        {!isField && <button className="btn btn-primary btn-sm" onClick={() => openInc(i.id)}>{T('فتح الحادثة', 'Open incident')} <Icon n="chev" s={14} flip /></button>}
      </div>
    );
  }
  if (sel.k === 'zone') {
    const z = sel.v, st = vm.zoneState(z);
    const list = vm.incidents.filter(i => i.zone === z && i.active).sort(vm.sortQ);
    const staffN = vm.staff.filter(p => p.zone === z && p.status !== 'off').length;
    return (
      <div className="map-card">{close}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="mono faint">{T('المنطقة', 'Zone')} {vm.zoneCodes[z]}</span><ZPill st={st} /></div>
        <h3>{L(vm.zoneNames[z])}</h3>
        <dl className="kv"><dt>{T('حوادث نشطة', 'Active incidents')}</dt><dd className="num">{list.length}</dd>
          <dt>{T('موظفون في المنطقة', 'Staff in zone')}</dt><dd className="num">{staffN}</dd></dl>
        {!isField && list.slice(0, 3).map(i => (
          <button key={i.id} className="link" onClick={() => openInc(i.id)} style={{ justifyContent: 'space-between', width: '100%', color: 'var(--fg-2)' }}>
            <span>{i.title}</span><Pill sev={i.sev} /></button>
        ))}
      </div>
    );
  }
  if (sel.k === 'staff') {
    const p = vm.staff.find(s => s.id === sel.v);
    if (!p) return null;
    return (
      <div className="map-card">{close}<Who name={p.n} sub={L(p.roleL)} />
        <dl className="kv">
          <dt>{T('الحالة', 'Status')}</dt><dd>{p.status === 'available' ? <span className="pill s-ok">{T('متاح', 'Available')}</span> : p.status === 'busy' ? <span className="pill s-info">{T('في مهمة', 'On task')}</span> : <span className="pill s-mute">{T('خارج المناوبة', 'Off shift')}</span>}</dd>
          <dt>{T('المهمة الحالية', 'Current task')}</dt><dd>{p.task ? `${p.task.incidentCode} · ${p.task.incidentTitle}` : '—'}</dd>
          <dt>{T('الاعتمادات', 'Certifications')}</dt><dd>{p.certs.map(c => L(c)).join(' · ')}</dd>
        </dl>
      </div>
    );
  }
  if (sel.k === 'asset') {
    const a = vm.assets.find(o => o.id === sel.v);
    if (!a) return null;
    return (
      <div className="map-card">{close}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="mono faint">#{a.id}</span>
          {a.ok ? <span className="pill s-ok"><i className="d" />{T('يعمل', 'Working')}</span> : <span className="pill s-crit"><i className="d" />{T('متوقف', 'Out of service')}</span>}</div>
        <h3>{a.n}</h3>
        <dl className="kv"><dt>{T('النوع', 'Type')}</dt><dd>{a.t === 'elev' ? T('مصعد', 'Elevator') : T('منحدر', 'Ramp')}</dd>
          <dt>{T('المنطقة', 'Zone')}</dt><dd>{L(a.zoneName)}</dd>
          {a.route ? <><dt>{T('المسار المهيأ', 'Accessible route')}</dt><dd>{a.route}</dd></> : null}</dl>
      </div>
    );
  }
  return null;
}

// mode: overview | full | access (same layer presets as the design)
export function MapView({ mode = 'overview', className = '' }) {
  const app = useApp();
  const { vm, sel, lang, layers, flash, loaded, mapFull, setMapFull, toggleSel, T, data } = app;
  const slot = useRef(null);

  // fill the map state from the backend view models
  M.lang = lang;
  M.incidents = vm.incidents;
  M.staff = vm.staff;
  M.sel = sel;
  M.flash = flash;
  M.layers = layers;
  M.zoneNames = vm.zoneNames;
  M.zoneCodes = vm.zoneCodes;
  M.zoneState = vm.zoneState;
  M.getInc = id => vm.incidents.find(i => i.id === id);
  M.onSelect = (k, v) => toggleSel(k, v);
  M.assetDefs = Object.fromEntries(vm.assets.map(a => [a.id, a]));
  M.assetStatus = Object.fromEntries(vm.assets.map(a => [a.id, a.ok ? 'ok' : 'fault']));
  M.routePaths = Object.fromEntries(data.routes.map(r => [String(r.id), vm.routePath(r)]).filter(([, p]) => p.length > 1));
  M.routeStatus = Object.fromEntries(data.routes.map(r => [String(r.id), vm.routeState(r)]));
  M.altPaths = Object.fromEntries(data.routes.map(r => [String(r.id), vm.altPath(r)]).filter(([, p]) => p));

  const ready = loaded && data.zones.length > 0;
  useEffect(() => {
    if (!ready || !slot.current) return;
    const map = getMap3D();
    if (map) map.attach(slot.current, mode);
  });

  if (!ready) return <div className={'map-wrap ' + className}><div className="m3d-fail">{T('جاري تحميل الخريطة…', 'Loading the map…')}</div></div>;
  const map = getMap3D();
  return (
    <div className={'map-wrap ' + className + (mapFull ? ' is-full' : '')}>
      {map ? <div ref={slot} className={'m3d-slot' + (mode === 'full' ? ' full' : mode === 'access' ? ' acc' : '')} data-mode={mode} />
        : <div className="m3d-fail">{T('تعذّر تحميل الخريطة ثلاثية الأبعاد في هذا المتصفح.', 'The 3D map could not load in this browser.')}</div>}
      <MapCard />
      {mode !== 'access' && (mapFull
        ? <button className="map-fs close" aria-label={T('إغلاق ملء الشاشة', 'Exit full screen')} onClick={() => setMapFull(false)}><Icon n="x" s={20} /></button>
        : <button className="map-fs" aria-label={T('عرض الخريطة بملء الشاشة', 'Full-screen map')} onClick={() => setMapFull(true)}><Icon n="expand" s={19} /></button>)}
    </div>
  );
}

export function ZoneList() {
  const { vm, L, toggleSel } = useApp();
  return (
    <div className="zl">
      {Object.keys(vm.zoneNames).filter(z => vm.zoneByLetter[z]).map(z => (
        <button key={z} onClick={() => toggleSel('zone', z)}>
          <span className="zl-n"><i style={{ borderColor: ZCSS(z), color: ZCSS(z) }}>{vm.zoneCodes[z]}</i><b>{L(vm.zoneNames[z])}</b></span>
        </button>
      ))}
    </div>
  );
}

export const srcName = (L, s) => L((SRC[s] || { n: [s, s] }).n);
