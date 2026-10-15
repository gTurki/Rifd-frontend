import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Logo } from '../components/ui.jsx';
import { LangSeg } from '../components/Shell.jsx';
import { MediaPicker, emptyMedia, hasMedia } from '../components/MediaPicker.jsx';
import { api } from '../lib/api.js';
import { hm } from '../lib/labels.js';
import { ZONE_AR } from '../map/geometry.js';

// the type is written into the report text (Arabic): it helps the classifier pick the right team
const VIS_TYPES = {
  escal: { n: ['سلم كهربائي متوقف', 'Escalator stopped'], i: 'escal' },
  elev: { n: ['مصعد معطل', 'Elevator out of service'], i: 'elev' },
  crowd: { n: ['ازدحام شديد', 'Heavy crowding'], i: 'users' },
  clean: { n: ['نظافة أو انسكاب', 'Spill or cleanliness'], i: 'broom' },
  medical: { n: ['حالة صحية', 'Health issue'], i: 'heart', urgent: true },
  child: { n: ['طفل مفقود', 'Lost child'], i: 'child', urgent: true },
  item: { n: ['غرض مفقود', 'Lost item'], i: 'bag' },
  safety: { n: ['خطر أو مشكلة أمنية', 'Safety or security'], i: 'siren', urgent: true },
  other: { n: ['مشكلة أخرى', 'Something else'], i: 'dots' },
};
const VIS_WAYS = [
  { k: 'app', i: 'phone', n: ['من هنا أو من تطبيق إكسبو', 'Here or in the Expo app'], d: ['اختر المشكلة وموقعك، ويصل بلاغك خلال ثوانٍ.', 'Pick the problem and your spot; it arrives in seconds.'], btn: ['ابدأ البلاغ', 'Start a report'], a: 'start' },
  { k: 'qr', i: 'qr', n: ['امسح رمز QR', 'Scan a QR code'], d: ['موجود على كل جناح ومصعد وبوابة، ويحدد موقعك تلقائيًا.', 'On every pavilion, lift and gate — it fills in your location.'], btn: ['جرّب المسح', 'Try a scan'], a: 'qr' },
  { k: 'tg', i: 'chat', n: ['بوت تيليجرام', 'Telegram bot'], d: ['أرسل نصًا أو تسجيلًا صوتيًا أو صورة، ويصل لنفس مركز العمليات.', 'Send text, a voice note or a photo; it reaches the same operations center.'] },
  { k: 'call', i: 'phone', n: ['الرقم الموحد 2036', 'Unified number 2036'], d: ['متاح على مدار الساعة وبأكثر من لغة.', 'Open 24/7 in several languages.'] },
  { k: 'staff', i: 'badge', n: ['أقرب موظف أو مكتب خدمة الزوار', 'Any staff member or help desk'], d: ['بلّغ أي موظف بزي إكسبو، ويرفع البلاغ من جهازه فورًا.', 'Tell anyone in Expo uniform; they log it on the spot.'] },
];
const VSTEPS = [['استلمنا بلاغك', 'Report received'], ['أُسند لأقرب فريق', 'Nearest team assigned'], ['الفريق يعمل عليه', 'Team is on it'], ['تم الحل', 'Resolved']];
const STORE = 'rifd-visitor-reports';
const loadReports = () => { try { const a = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saveReports = list => { try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 20))); } catch (e) { /* */ } };

function Steps({ r }) {
  const { L } = useApp();
  const st = r.step || 0;
  return (
    <ol className="vtl">{VSTEPS.map((s, k) => (
      <li key={k} className={k < st ? 'done' : k === st ? (st === 3 ? 'done' : 'cur') : ''}>
        <i>{k < st || st === 3 ? <Icon n="check" s={13} /> : null}</i><span>{r.state === 'CLOSED' && k === 3 ? L(['أُغلق البلاغ', 'Report closed']) : L(s)}</span>
        {k === 0 ? <small className="mono">{hm(r.receivedAt || r.at)}</small> : null}</li>))}</ol>
  );
}

export function Visitor() {
  const { T, L, lang, setPage, theme, setTheme, fail } = useApp();
  const [view, setView] = useState('home');
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState(1);
  const [d, setD] = useState({});
  const [err, setErr] = useState('');
  const [zones, setZones] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [reports, setReports] = useState(loadReports);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(emptyMedia);

  useEffect(() => { api.publicZones().then(setZones).catch(() => {}); api.routes().then(setRoutes).catch(() => {}); }, []);
  // refresh the status of saved reports every few seconds
  useEffect(() => {
    if (!reports.length) return undefined;
    const tick = () => Promise.all(reports.map(r => api.trackReport(r.code).catch(() => null))).then(list => {
      setReports(old => { const next = old.map((r, k) => (list[k] ? { ...r, ...list[k] } : r)); saveReports(next); return next; });
    });
    tick();
    const h = setInterval(tick, 5000);
    return () => clearInterval(h);
  }, [reports.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = v => { setView(v); setMenu(false); setErr(''); window.scrollTo(0, 0); };
  const start = (type, qr) => {
    const nd = {};
    if (qr) { nd.zone = 'PB'; nd.spot = T('الجناح B — المدخل الرئيسي', 'Pavilion B — main entrance'); nd.by = 'qr'; }
    if (type) nd.type = type;
    setD(nd); setMedia(emptyMedia()); setErr(''); setMenu(false); setView('report'); setStep(type ? 2 : 1); window.scrollTo(0, 0);
  };
  const zName = code => { const z = zones.find(o => o.code === code); return z ? (lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name) : code; };
  const next = async () => {
    if (step === 1 && !d.type) { setErr(T('اختر نوع المشكلة', 'Choose the problem')); return; }
    if (step === 2 && !d.zone) { setErr(T('اختر المنطقة', 'Pick the zone')); return; }
    if (step < 3) { setStep(step + 1); setErr(''); window.scrollTo(0, 0); return; }
    const t = VIS_TYPES[d.type];
    const text = `بلاغ زائر: ${t.n[0]}${d.spot ? ' — ' + d.spot.trim() : ''}${d.desc ? ': ' + d.desc.trim() : ''}`;
    setBusy(true);
    try {
      // with photos / a voice note: multipart, the backend analyzes them and appends the result to the text (decision 151)
      const dto = { text, language: 'ar', zoneCode: d.zone };
      const r = hasMedia(media) ? await api.visitorReportMedia(dto, media.photos, media.audio && media.audio.blob) : await api.visitorReport(dto);
      const item = { ...r, code: r.trackingCode, type: d.type, zone: d.zone, at: new Date().toISOString() };
      const list = [item, ...reports]; setReports(list); saveReports(list);
      setLast(item.code); setD({}); setMedia(emptyMedia()); setStep(1); go('done');
    } catch (e) { fail(e); }
    setBusy(false);
  };

  const wayCard = (w, full) => (
    <article className="vway" key={w.k}><span className="vway-ic"><Icon n={w.i} s={22} /></span><div className="vway-b"><b>{L(w.n)}</b>{full ? <p>{L(w.d)}</p> : null}</div>
      {w.btn ? <button className="btn btn-ghost btn-sm" onClick={() => start(null, w.a === 'qr')}>{L(w.btn)}</button> : null}</article>);
  const sos = <a className="vsos" href="tel:911"><Icon n="phone" s={20} /><span><b>{T('حالة طارئة تهدد الحياة؟', 'Life-threatening emergency?')}</b><small>{T('اتصل بالطوارئ 911 مباشرة', 'Call 911 right away')}</small></span><span className="vsos-n mono">911</span></a>;
  const published = routes.filter(r => r.status === 'DISRUPTED' && r.publishedAt);

  let body;
  if (view === 'report') {
    const t = VIS_TYPES[d.type];
    const titles = [T('وش المشكلة؟', 'What is the problem?'), T('وين المشكلة؟', 'Where is it?'), T('تفاصيل إضافية', 'A few details')];
    body = (
      <>
        <div className="vstep-h"><button className="vback" aria-label={T('رجوع', 'Back')} onClick={() => (step > 1 ? (setStep(step - 1), setErr('')) : go('home'))}><Icon n="arrow" s={18} /></button>
          <span>{T('أبلغ عن مشكلة', 'Report a problem')}</span><small className="mono">{step} / 3</small></div>
        <div className="vprog">{[1, 2, 3].map(k => <i key={k} className={k <= step ? 'on' : ''} />)}</div>
        <h1 className="vq">{titles[step - 1]}</h1>
        {step === 1 && <div className="vtiles">{Object.entries(VIS_TYPES).map(([k, ty]) => (
          <button key={k} className={'vtile' + (ty.urgent ? ' urg' : '') + (d.type === k ? ' sel' : '')} onClick={() => { setD(o => ({ ...o, type: k })); setErr(''); setStep(2); window.scrollTo(0, 0); }}>
            <span className="vt-ic"><Icon n={ty.i} s={24} /></span><b>{L(ty.n)}</b></button>))}</div>}
        {step === 2 && <>
          {d.by === 'qr' && <div className="vok"><Icon n="qr" s={20} /><span><b>{T('تم تحديد موقعك من رمز QR', 'Location taken from the QR code')}</b><small>{zName(d.zone)} · {d.spot}</small></span></div>}
          <p className="vor">{T('اختر المنطقة', 'Pick the zone')}</p>
          <div className="vzones">{zones.map(z => (
            <button key={z.code} className={'vzone' + (d.zone === z.code ? ' sel' : '')} onClick={() => { setD(o => ({ ...o, zone: z.code, by: 'manual' })); setErr(''); }}>
              <span className="mono">{z.code}</span>{lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name}</button>))}</div>
          <label className="vfield"><span>{T('أقرب معلم', 'Nearest landmark')}</span><input value={d.spot || ''} onChange={e => setD(o => ({ ...o, spot: e.target.value }))} /></label>
        </>}
        {step === 3 && t && <>
          <div className="vsum"><span className="vt-ic"><Icon n={t.i} s={20} /></span><span><b>{L(t.n)}</b><small>{zName(d.zone)}{d.spot ? ' · ' + d.spot : ''}</small></span>
            <button className="vlink" onClick={() => setStep(2)}>{T('تعديل', 'Edit')}</button></div>
          <label className="vfield"><span>{T('وصف المشكلة', 'Describe it')}</span><textarea rows={3} value={d.desc || ''} onChange={e => setD(o => ({ ...o, desc: e.target.value }))}
            placeholder={T('مثال: السلم متوقف والناس واقفين عنده', 'e.g. The escalator stopped and people are stuck')} /></label>
          <div className="vfield"><span>{T('صور أو تسجيل صوتي', 'Photos or a voice note')} <em>{T('اختياري', 'optional')}</em></span>
            <MediaPicker value={media} onChange={setMedia} disabled={busy} /></div>
        </>}
        {err ? <p className="form-err">{err}</p> : null}
        {step > 1 && <button className="btn btn-primary vbig" disabled={busy} onClick={next}>{step === 3 ? (busy && hasMedia(media) ? T('جاري تحليل المرفقات...', 'Analyzing attachments...') : <><Icon n="arrow" s={18} flip />{T('إرسال البلاغ', 'Send report')}</>) : T('التالي', 'Next')}</button>}
      </>
    );
  } else if (view === 'done') {
    const r = reports.find(o => o.code === last) || reports[0];
    body = r ? (
      <>
        <section className="vdone"><div className="vdone-ic"><Icon n="check" s={34} /></div><h1>{T('وصل بلاغك', 'Report sent')}</h1>
          <p>{T('رقم البلاغ', 'Report number')} <b className="mono">{r.code}</b></p></section>
        <section className="vcard"><Steps r={r} /></section>
        <button className="btn btn-primary vbig" onClick={() => go('home')}>{T('الرئيسية', 'Home')}</button>
        <button className="btn btn-ghost vbig" onClick={() => go('track')}>{T('بلاغاتي', 'My reports')}</button>
      </>) : null;
  } else if (view === 'track') {
    body = (
      <>
        <h1 className="vq">{T('بلاغاتي', 'My reports')}</h1>
        {reports.length ? reports.map(r => (
          <section className="vcard" key={r.code}><div className="vsum flat"><span className="vt-ic"><Icon n={(VIS_TYPES[r.type] || VIS_TYPES.other).i} s={20} /></span>
            <span><b>{L((VIS_TYPES[r.type] || VIS_TYPES.other).n)}</b><small><span className="mono">{r.code}</span> · {zName(r.zone)}</small></span>
            <span className={'vpill' + (r.step === 3 ? ' ok' : '')}>{L(VSTEPS[r.step || 0])}</span></div><Steps r={r} /></section>))
          : <><section className="vcard vempty"><Icon n="list" s={44} /><b>{T('ما عندك بلاغات بعد', 'No reports yet')}</b></section>
            <button className="btn btn-primary vbig" onClick={() => start()}>{T('أبلغ عن مشكلة', 'Report a problem')}</button></>}
      </>);
  } else if (view === 'ways') {
    body = (
      <>
        <div className="vstep-h"><button className="vback" aria-label={T('رجوع', 'Back')} onClick={() => go('home')}><Icon n="arrow" s={18} /></button></div>
        <h1 className="vq">{T('طرق الإبلاغ', 'Ways to report')}</h1>
        <div className="vflow"><span>{T('أي طريقة تختارها', 'Any channel you use')}</span><Icon n="arrow" s={16} flip /><span>{T('مركز العمليات الموحد', 'Unified operations center')}</span><Icon n="arrow" s={16} flip /><span>{T('أقرب فريق', 'Nearest team')}</span></div>
        <div className="vways">{VIS_WAYS.map(w => wayCard(w, true))}</div>{sos}
      </>);
  } else {
    const lastR = reports[0];
    body = (
      <>
        <section className="vhero"><h1>{T('كيف نقدر نساعدك؟', 'How can we help?')}</h1><p>{T('بلغنا عن أي مشكلة تواجهك في إكسبو.', 'Tell us about any problem you run into at Expo.')}</p>
          <button className="btn btn-primary vbig" onClick={() => start()}>{T('أبلغ عن مشكلة', 'Report a problem')}</button></section>
        {published.map(r => (
          <section className="vcard" key={r.id}><div className="vsum flat"><span className="vt-ic"><Icon n="access" s={20} /></span>
            <span><b>{T('تغيير مؤقت في المسار المهيأ', 'Temporary accessible route change')}</b><small>{lang === 'ar' ? r.publicMessageAr : r.publicMessageEn}</small></span></div></section>))}
        {lastR ? <button className="vlast" onClick={() => go('track')}><span className="vt-ic"><Icon n={(VIS_TYPES[lastR.type] || VIS_TYPES.other).i} s={20} /></span>
          <span><b>{L((VIS_TYPES[lastR.type] || VIS_TYPES.other).n)}</b><small className="mono">{lastR.code}</small></span>
          <span className={'vpill' + (lastR.step === 3 ? ' ok' : '')}>{L(VSTEPS[lastR.step || 0])}</span></button> : null}
        <section><div className="vh2-row"><h2 className="vh2">{T('طرق أخرى للإبلاغ', 'Other ways to report')}</h2>
          <button className="vlink" onClick={() => go('ways')}>{T('عرض الكل', 'See all')}<Icon n="chev" s={15} flip /></button></div>
          <div className="vways">{VIS_WAYS.slice(1, 4).map(w => wayCard(w))}</div></section>
        {sos}
      </>);
  }

  const item = (v, i, n, extra) => (
    <button className={'vm-i' + (view === v ? ' on' : '')} onClick={() => (v === 'report' ? start() : go(v))}><Icon n={i} s={20} /><span>{n}</span>{extra}</button>);
  return (
    <div className="vpage">
      <header className="vbar"><div className="vbar-in">
        <button className="vbrand" onClick={() => go('home')}><Logo s={34} /><span><b>{T('إكسبو الزوار', 'Expo Visitors')}</b><small>EXPO 2030 RIYADH</small></span></button>
        <button className="vmenu-btn" aria-label={T('القائمة', 'Menu')} aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon n="menu" s={22} /></button>
      </div></header>
      <main className="vwrap">{body}</main>
      {menu && <>
        <div className="vm-scrim" onClick={() => setMenu(false)} />
        <aside className="vm" role="dialog" aria-label={T('القائمة', 'Menu')}>
          <div className="vm-h"><b>{T('القائمة', 'Menu')}</b><button className="vm-x" aria-label={T('إغلاق', 'Close')} onClick={() => setMenu(false)}><Icon n="x" s={20} /></button></div>
          {item('home', 'home', T('الرئيسية', 'Home'))}
          {item('report', 'alert', T('أبلغ عن مشكلة', 'Report a problem'))}
          {item('track', 'list', T('بلاغاتي', 'My reports'), reports.length ? <span className="cnt">{reports.length}</span> : null)}
          {item('ways', 'chat', T('طرق الإبلاغ', 'Ways to report'))}
          <div className="vm-sep" />
          <div className="vm-row"><span>{T('اللغة', 'Language')}</span><LangSeg full /></div>
          <div className="vm-row"><span>{T('المظهر', 'Appearance')}</span><div className="theme-sw">
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Icon n="moon" s={15} /></button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Icon n="sun" s={15} /></button></div></div>
          <button className="vm-i vm-out" onClick={() => setPage('welcome')}><Icon n="logout" s={20} /><span>{T('صفحة البداية', 'Start page')}</span></button>
        </aside>
      </>}
    </div>
  );
}