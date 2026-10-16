import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Logo } from '../components/ui.jsx';
import { LangSeg } from '../components/Shell.jsx';
import { MediaPicker, Spinner, emptyMedia, hasMedia } from '../components/MediaPicker.jsx';
import { api, setVisitorToken, setVisitorUnauthorizedHandler } from '../lib/api.js';
import { VisitorAuth } from './VisitorAuth.jsx';
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
  { k: 'app', i: 'phone', n: ['من هنا أو من تطبيق إكسبو', 'Here or in the Expo app'], d: ['اختر المشكلة ومكانك، وبلاغك يوصل خلال ثواني.', 'Pick the problem and your spot; it arrives in seconds.'], btn: ['ابدأ البلاغ', 'Start a report'], a: 'start' },
  { k: 'qr', i: 'qr', n: ['امسح رمز QR', 'Scan a QR code'], d: ['تلقاه على كل جناح ومصعد وبوابة، ويعرف مكانك على طول.', 'On every pavilion, lift and gate — it fills in your location.'], btn: ['جرّب المسح', 'Try a scan'], a: 'qr' },
  { k: 'tg', i: 'chat', n: ['بوت تيليجرام', 'Telegram bot'], d: ['ارسل كتابة أو تسجيل صوتي أو صورة، وتوصل لنفس غرفة العمليات.', 'Send text, a voice note or a photo; it reaches the same operations center.'] },
  { k: 'call', i: 'phone', n: ['الرقم الموحد 2036', 'Unified number 2036'], d: ['شغّال ٢٤ ساعة وبأكثر من لغة.', 'Open 24/7 in several languages.'] },
  { k: 'staff', i: 'badge', n: ['أي موظف أو مكتب خدمة الزوار', 'Any staff member or help desk'], d: ['قول لأي موظف لابس زي إكسبو، ويرفع البلاغ من جواله على طول.', 'Tell anyone in Expo uniform; they log it on the spot.'] },
];
const VSTEPS = [['استلمنا بلاغك', 'Report received'], ['وصل لأقرب فريق', 'Nearest team assigned'], ['الفريق شغّال عليه', 'Team is on it'], ['انحلّت المشكلة', 'Resolved']];
// per account: the server has the list ("mine"), this keeps what only the page knows (type, what we heard)
const STORE = 'rifd-visitor-reports';
const loadReports = key => { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saveReports = (key, list) => { try { localStorage.setItem(key, JSON.stringify(list.slice(0, 20))); } catch (e) { /* */ } };

// the visitor's own sign-in, kept apart from the staff one (never opens the operations center)
const VAUTH = 'rifd-visitor-auth';
const loadVAuth = () => { try { return JSON.parse(sessionStorage.getItem(VAUTH) || localStorage.getItem(VAUTH) || 'null'); } catch (e) { return null; } };
const saveVAuth = (a, remember) => {
  try {
    sessionStorage.removeItem(VAUTH); localStorage.removeItem(VAUTH);
    if (a) (remember ? localStorage : sessionStorage).setItem(VAUTH, JSON.stringify(a));
  } catch (e) { /* private mode */ }
};

// visitors sign in (or sign up) first; an expired / refused token signs them out
export function Visitor() {
  const [vauth, setVauth] = useState(() => { const a = loadVAuth(); setVisitorToken(a ? a.token : null); return a; });
  const signOut = useCallback(() => { saveVAuth(null); setVisitorToken(null); setVauth(null); }, []);
  useEffect(() => { setVisitorUnauthorizedHandler(signOut); return () => setVisitorUnauthorizedHandler(() => {}); }, [signOut]);
  if (!vauth) {
    return <VisitorAuth onDone={(r, remember) => {
      const a = { token: r.token, visitorId: r.visitorId, name: r.name, email: r.email };
      setVisitorToken(a.token); saveVAuth(a, remember); setVauth(a);
    }} />;
  }
  return <VisitorApp key={vauth.visitorId} vauth={vauth} signOut={signOut} />;
}

function Steps({ r }) {
  const { L } = useApp();
  const st = r.step || 0;
  return (
    <ol className="vtl">{VSTEPS.map((s, k) => (
      <li key={k} className={k < st ? 'done' : k === st ? (st === 3 ? 'done' : 'cur') : ''}>
        <i>{k < st || st === 3 ? <Icon n="check" s={13} /> : null}</i><span>{r.state === 'CLOSED' && k === 3 ? L(['تقفّل البلاغ', 'Report closed']) : L(s)}</span>
        {k === 0 ? <small className="mono">{hm(r.receivedAt || r.at)}</small> : null}</li>))}</ol>
  );
}

function VisitorApp({ vauth, signOut }) {
  const { T, L, lang, setPage, theme, setTheme, fail } = useApp();
  const storeKey = STORE + ':' + vauth.visitorId;
  const [view, setView] = useState('home');
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState(1);
  const [d, setD] = useState({});
  const [err, setErr] = useState('');
  const [zones, setZones] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [reports, setReports] = useState(() => loadReports(storeKey));
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(emptyMedia);
  // preview before sending (voice note or unknown place): { draftId, hasVoice, transcript, zoneCode, zoneGuessed, needsLocation, edit, zone, unknown }
  const [review, setReview] = useState(null);

  useEffect(() => { api.publicZones().then(setZones).catch(() => {}); api.routes().then(setRoutes).catch(() => {}); }, []);
  // my reports come from the server (any device); every few seconds for the live status
  useEffect(() => {
    const tick = () => api.visitorMine().then(list => {
      setReports(old => {
        const mine = {}; old.forEach(r => { mine[r.code] = r; });
        const next = (list || []).map(s => ({ ...(mine[s.trackingCode] || {}), ...s, code: s.trackingCode, heard: (mine[s.trackingCode] || {}).heard || null }));
        saveReports(storeKey, next); return next;
      });
    }).catch(() => {});
    tick();
    const h = setInterval(tick, 5000);
    return () => clearInterval(h);
  }, [storeKey]);

  const go = v => { setView(v); setMenu(false); setErr(''); window.scrollTo(0, 0); };
  const start = (type, qr) => {
    const nd = {};
    if (qr) { nd.zone = 'PB'; nd.spot = T('الجناح B — المدخل الرئيسي', 'Pavilion B — main entrance'); nd.by = 'qr'; }
    if (type) nd.type = type;
    setD(nd); setMedia(emptyMedia()); setReview(null); setErr(''); setMenu(false); setView('report'); setStep(type ? 2 : 1); window.scrollTo(0, 0);
  };
  const zName = code => { if (!code) return T('المكان غير محدد', 'Place not given'); const z = zones.find(o => o.code === code); return z ? (lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name) : code; };
  const saved = (r, zone, heard) => {
    // heard = what we understood from the voice note, kept so "My reports" can show it too
    const item = { ...r, code: r.trackingCode, type: d.type, zone: r.zoneCode || zone || null, at: new Date().toISOString(), voice: !!media.audio, heard: heard || null };
    const list = [item, ...reports.filter(o => o.code !== item.code)]; setReports(list); saveReports(storeKey, list);
    setLast(item.code); setD({}); setMedia(emptyMedia()); setReview(null); setStep(1); go('done');
  };
  const next = async () => {
    if (step === 1 && !d.type) { setErr(T('اختر وش المشكلة', 'Choose the problem')); return; }
    if (step === 2 && !d.zone && !d.unknown) { setErr(T('اختر المنطقة', 'Pick the zone')); return; }
    if (step < 3) { setStep(step + 1); setErr(''); window.scrollTo(0, 0); return; }
    if (review) { await confirm(); return; }
    const t = VIS_TYPES[d.type];
    const text = `بلاغ زائر: ${t.n[0]}${d.spot ? ' — ' + d.spot.trim() : ''}${d.desc ? ': ' + d.desc.trim() : ''}`;
    setBusy(true); setErr('');
    try {
      const dto = { text, language: 'ar', zoneCode: d.zone };
      if (media.audio || !d.zone) {
        // voice note or unknown place: show what we heard / ask where before anything is sent
        const p = await api.visitorPreview(dto, media.photos, media.audio && media.audio.blob);
        setReview({ ...p, edit: p.transcript || '', zone: p.zoneCode || null, unknown: false }); window.scrollTo(0, 0);
      } else {
        // photos only (decision 151) or text: sent directly, as before
        const r = hasMedia(media) ? await api.visitorReportMedia(dto, media.photos, null) : await api.visitorReport(dto);
        saved(r, d.zone, null);
      }
    } catch (e) { fail(e); }
    setBusy(false);
  };
  const confirm = async () => {
    const zone = d.zone || review.zone || null;
    if (!d.zone && review.needsLocation && !review.zone && !review.unknown) { setErr(T('اختر المنطقة أو «ما أعرف»', 'Pick the zone or "I don\'t know"')); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.visitorConfirm({ draftId: review.draftId, transcript: review.edit, zoneCode: zone });
      saved(r, zone, r.transcript);
    } catch (e) {
      fail(e);
      // review expired (the backend answers 400 for every error, so match the message): the visitor sends it again.
      // any other failure keeps the review: the backend kept the draft, pressing send retries it
      if (/انتهت مهلة/.test(e.message || '')) setReview(null);
    }
    setBusy(false);
  };
  const reRecord = () => { setReview(null); setMedia(m => ({ ...m, audio: null })); setErr(''); };

  const wayCard = (w, full) => (
    <article className="vway" key={w.k}><span className="vway-ic"><Icon n={w.i} s={22} /></span><div className="vway-b"><b>{L(w.n)}</b>{full ? <p>{L(w.d)}</p> : null}</div>
      {w.btn ? <button className="btn btn-ghost btn-sm" onClick={() => start(null, w.a === 'qr')}>{L(w.btn)}</button> : null}</article>);
  const sos = <a className="vsos" href="tel:911"><Icon n="phone" s={20} /><span><b>{T('فيه خطر على حياة أحد؟', 'Life-threatening emergency?')}</b><small>{T('اتصل على 911 على طول', 'Call 911 right away')}</small></span><span className="vsos-n mono">911</span></a>;
  const published = routes.filter(r => r.status === 'DISRUPTED' && r.publishedAt);

  let body;
  if (view === 'report') {
    const t = VIS_TYPES[d.type];
    const titles = [T('وش المشكلة؟', 'What is the problem?'), T('وين المشكلة؟', 'Where is it?'), T('تبي تضيف شي؟', 'A few details')];
    body = (
      <>
        <div className="vstep-h"><button className="vback" aria-label={T('رجوع', 'Back')} disabled={busy} onClick={() => (review ? (setReview(null), setErr('')) : step > 1 ? (setStep(step - 1), setErr('')) : go('home'))}><Icon n="arrow" s={18} /></button>
          <span>{T('بلّغ عن مشكلة', 'Report a problem')}</span><small className="mono">{step} / 3</small></div>
        <div className="vprog">{[1, 2, 3].map(k => <i key={k} className={k <= step ? 'on' : ''} />)}</div>
        <h1 className="vq">{review ? T('تأكد من بلاغك قبل نرسله', 'Check your report before we send it') : titles[step - 1]}</h1>
        {step === 1 && <div className="vtiles">{Object.entries(VIS_TYPES).map(([k, ty]) => (
          <button key={k} className={'vtile' + (ty.urgent ? ' urg' : '') + (d.type === k ? ' sel' : '')} onClick={() => { setD(o => ({ ...o, type: k })); setErr(''); setStep(2); window.scrollTo(0, 0); }}>
            <span className="vt-ic"><Icon n={ty.i} s={24} /></span><b>{L(ty.n)}</b></button>))}</div>}
        {step === 2 && <>
          {d.by === 'qr' && <div className="vok"><Icon n="qr" s={20} /><span><b>{T('عرفنا مكانك من رمز QR', 'Location taken from the QR code')}</b><small>{zName(d.zone)} · {d.spot}</small></span></div>}
          <p className="vor">{T('اختر المنطقة', 'Pick the zone')}</p>
          <div className="vzones">{zones.map(z => (
            <button key={z.code} className={'vzone' + (d.zone === z.code ? ' sel' : '')} onClick={() => { setD(o => ({ ...o, zone: z.code, unknown: false, by: 'manual' })); setErr(''); }}>
              <span className="mono">{z.code}</span>{lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name}</button>))}
            <button className={'vzone' + (d.unknown ? ' sel' : '')} onClick={() => { setD(o => ({ ...o, zone: undefined, unknown: true, by: 'unknown' })); setErr(''); }}>
              <span className="mono">?</span>{T('ما أعرف', "I don't know")}</button></div>
          <label className="vfield"><span>{T('وش أقرب شي عندك؟', 'Nearest landmark')}</span><input value={d.spot || ''} onChange={e => setD(o => ({ ...o, spot: e.target.value }))} /></label>
        </>}
        {step === 3 && t && review && <>
          <div className="vsum"><span className="vt-ic"><Icon n={t.i} s={20} /></span><span><b>{L(t.n)}</b><small>{zName(d.zone || review.zone)}{d.spot ? ' · ' + d.spot : ''}</small></span></div>
          {review.hasVoice && <label className="vfield"><span>{review.transcript
            ? T('هذا اللي فهمناه من تسجيلك، تقدر تعدّله', 'This is what we heard; you can correct it')
            : T('ما قدرنا نفرّغ التسجيل، اكتب وش قلت إذا تبي', 'We could not transcribe it; type what you said if you like')}</span>
            <textarea rows={3} maxLength={1000} value={review.edit} onChange={e => setReview(r => ({ ...r, edit: e.target.value }))} /></label>}
          {!d.zone && <>
            {review.zoneGuessed && review.zone === review.zoneCode
              ? <div className="vok"><Icon n="pin" s={20} /><span><b>{T('فهمنا إن المكان:', 'We think the place is:')}</b><small>{zName(review.zoneCode)}</small></span></div> : null}
            <p className="vor">{review.zoneGuessed ? T('إذا المكان غلط اختر الصح', 'If that is wrong, pick the right zone') : T('ما عرفنا وين المكان، اختر المنطقة', 'We could not tell where it is; pick the zone')}</p>
            <div className="vzones">{zones.map(z => (
              <button key={z.code} className={'vzone' + (review.zone === z.code ? ' sel' : '')} onClick={() => { setReview(r => ({ ...r, zone: z.code, unknown: false })); setErr(''); }}>
                <span className="mono">{z.code}</span>{lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name}</button>))}
              <button className={'vzone' + (review.unknown ? ' sel' : '')} onClick={() => { setReview(r => ({ ...r, zone: null, unknown: true })); setErr(''); }}>
                <span className="mono">?</span>{T('ما أعرف', "I don't know")}</button></div>
          </>}
          {review.hasVoice && <button className="btn btn-ghost vbig" disabled={busy} onClick={reRecord}><Icon n="mic" s={18} />{T('سجّل مرة ثانية', 'Record again')}</button>}
        </>}
        {step === 3 && t && !review && <>
          <div className="vsum"><span className="vt-ic"><Icon n={t.i} s={20} /></span><span><b>{L(t.n)}</b><small>{zName(d.zone)}{d.spot ? ' · ' + d.spot : ''}</small></span>
            <button className="vlink" onClick={() => setStep(2)}>{T('عدّل', 'Edit')}</button></div>
          <label className="vfield"><span>{T('وش صار بالضبط؟', 'Describe it')}</span><textarea rows={3} value={d.desc || ''} onChange={e => setD(o => ({ ...o, desc: e.target.value }))}
            placeholder={T('مثال: السلم متوقف والناس واقفين عنده', 'e.g. The escalator stopped and people are stuck')} /></label>
          <div className="vfield"><span>{T('صور أو تسجيل صوتي', 'Photos or a voice note')} <em>{T('إذا تبي', 'optional')}</em></span>
            <MediaPicker value={media} onChange={setMedia} disabled={busy} /></div>
        </>}
        {err ? <p className="form-err">{err}</p> : null}
        {step > 1 && <button className={'btn btn-primary vbig' + (busy ? ' is-busy' : '')} disabled={busy} onClick={next}>{step === 3
          ? (busy ? <><Spinner />{hasMedia(media) && !review ? T('نحلل المرفقات...', 'Analyzing attachments...') : T('نرسل بلاغك...', 'Sending...')}</>
            : <><Icon n="arrow" s={18} flip />{!review && (media.audio || !d.zone) ? T('التالي', 'Next') : T('أرسل البلاغ', 'Send report')}</>)
          : T('التالي', 'Next')}</button>}
        {busy && hasMedia(media) && !review && <p className="vwait">{T('لحظات بس... نسمع التسجيل ونشوف الصور، ممكن ياخذ لين 15 ثانية. لا تسكّر الصفحة.', 'Hang on... we are listening to the recording and checking the photos. This can take up to 15 seconds.')}</p>}
      </>
    );
  } else if (view === 'done') {
    const r = reports.find(o => o.code === last) || reports[0];
    body = r ? (
      <>
        <section className="vdone"><div className="vdone-ic"><Icon n="check" s={34} /></div><h1>{T('وصل بلاغك', 'Report sent')}</h1>
          <p>{T('رقم البلاغ', 'Report number')} <b className="mono">{r.code}</b></p></section>
        {r.voice ? (
          <section className="vheard"><span className="vheard-ic"><Icon n="mic" s={18} /></span><div>
            {r.heard ? <><b>{T('وصل بلاغك بهذا الكلام:', 'Your report was sent with:')}</b><p>«{r.heard}»</p>
              <small>{T('والفريق يقدر يسمع تسجيلك بنفسه بعد.', 'The team can also listen to your recording.')}</small></>
              : <><b>{T('وصلنا تسجيلك', 'We got your voice note')}</b><small>{T('ما قدرنا نفرّغه كتابة، بس الفريق بيسمعه بنفسه.', 'We could not transcribe it, but the team will listen to it.')}</small></>}
          </div></section>) : null}
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
            <span className={'vpill' + (r.step === 3 ? ' ok' : '')}>{L(VSTEPS[r.step || 0])}</span></div>
            {r.heard ? <p className="vheard-s"><Icon n="mic" s={14} />«{r.heard}»</p> : null}<Steps r={r} /></section>))
          : <><section className="vcard vempty"><Icon n="list" s={44} /><b>{T('ما عندك بلاغات للحين', 'No reports yet')}</b></section>
            <button className="btn btn-primary vbig" onClick={() => start()}>{T('بلّغ عن مشكلة', 'Report a problem')}</button></>}
      </>);
  } else if (view === 'ways') {
    body = (
      <>
        <div className="vstep-h"><button className="vback" aria-label={T('رجوع', 'Back')} onClick={() => go('home')}><Icon n="arrow" s={18} /></button></div>
        <h1 className="vq">{T('طرق التبليغ', 'Ways to report')}</h1>
        <div className="vflow"><span>{T('أي طريقة تختارها', 'Any channel you use')}</span><Icon n="arrow" s={16} flip /><span>{T('غرفة العمليات', 'Unified operations center')}</span><Icon n="arrow" s={16} flip /><span>{T('أقرب فريق', 'Nearest team')}</span></div>
        <div className="vways">{VIS_WAYS.map(w => wayCard(w, true))}</div>{sos}
      </>);
  } else {
    const lastR = reports[0];
    body = (
      <>
        <section className="vhero"><h1>{T('كيف نقدر نساعدك؟', 'How can we help?')}</h1><p>{T('أي مشكلة تواجهك في إكسبو، علّمنا عنها.', 'Tell us about any problem you run into at Expo.')}</p>
          <button className="btn btn-primary vbig" onClick={() => start()}>{T('بلّغ عن مشكلة', 'Report a problem')}</button></section>
        {published.map(r => (
          <section className="vcard" key={r.id}><div className="vsum flat"><span className="vt-ic"><Icon n="access" s={20} /></span>
            <span><b>{T('المسار المهيأ تغيّر مؤقتًا', 'Temporary accessible route change')}</b><small>{lang === 'ar' ? r.publicMessageAr : r.publicMessageEn}</small></span></div></section>))}
        {lastR ? <button className="vlast" onClick={() => go('track')}><span className="vt-ic"><Icon n={(VIS_TYPES[lastR.type] || VIS_TYPES.other).i} s={20} /></span>
          <span><b>{L((VIS_TYPES[lastR.type] || VIS_TYPES.other).n)}</b><small className="mono">{lastR.code}</small></span>
          <span className={'vpill' + (lastR.step === 3 ? ' ok' : '')}>{L(VSTEPS[lastR.step || 0])}</span></button> : null}
        <section><div className="vh2-row"><h2 className="vh2">{T('طرق ثانية تبلّغ فيها', 'Other ways to report')}</h2>
          <button className="vlink" onClick={() => go('ways')}>{T('شوف الكل', 'See all')}<Icon n="chev" s={15} flip /></button></div>
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
          <div className="vm-h"><b>{T('القائمة', 'Menu')}</b><button className="vm-x" aria-label={T('سكّر', 'Close')} onClick={() => setMenu(false)}><Icon n="x" s={20} /></button></div>
          {item('home', 'home', T('الرئيسية', 'Home'))}
          {item('report', 'alert', T('بلّغ عن مشكلة', 'Report a problem'))}
          {item('track', 'list', T('بلاغاتي', 'My reports'), reports.length ? <span className="cnt">{reports.length}</span> : null)}
          {item('ways', 'chat', T('طرق التبليغ', 'Ways to report'))}
          <div className="vm-sep" />
          <div className="vm-row"><span>{T('اللغة', 'Language')}</span><LangSeg full /></div>
          <div className="vm-row"><span>{T('المظهر', 'Appearance')}</span><div className="theme-sw">
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Icon n="moon" s={15} /></button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Icon n="sun" s={15} /></button></div></div>
          <button className="vm-i" onClick={() => setPage('welcome')}><Icon n="home" s={20} /><span>{T('صفحة البداية', 'Start page')}</span></button>
          <button className="vm-i vm-out" onClick={() => { setMenu(false); signOut(); }}><Icon n="logout" s={20} /><span>{T('تسجيل خروج', 'Sign out')}<small className="muted" style={{ display: 'block' }} dir="ltr">{vauth.email}</small></span></button>
        </aside>
      </>}
    </div>
  );
}