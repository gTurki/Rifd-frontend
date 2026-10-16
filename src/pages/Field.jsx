import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Pill, Dropdown, ReasonForm } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { MediaPicker, Spinner, emptyMedia, hasMedia } from '../components/MediaPicker.jsx';
import { SEV_KEY, STATUS, STEPS, TASK_KEY, TASK_ST, NEXT_TASK, ACTIVE_TASK, REPORT_TYPES, hm } from '../lib/labels.js';
import { ZONE_AR } from '../map/geometry.js';

const UNKNOWN = '?'; // "I don't know" in the zone dropdowns: sent as no zone

export function MyTasks() {
  const { data, me, T, L, run, refreshTasks, showOnMap } = useApp();
  const [rejecting, setRejecting] = useState(null);
  const mine = data.tasks.filter(t => t.staffId === me);
  const act = mine.filter(t => ACTIVE_TASK.includes(t.status)).sort((a, b) => ACTIVE_TASK.indexOf(a.status) - ACTIVE_TASK.indexOf(b.status));
  const done = mine.filter(t => t.status === 'DONE');
  const fresh = act.filter(t => t.status === 'PENDING').length;
  const step = async t => {
    const nx = NEXT_TASK[t.status]; if (!nx) return;
    const fn = t.status === 'PENDING' ? () => api.acceptTask(t.id, me) : () => api.taskStatus(t.id, nx[0], null, me);
    await run(fn, nx[0] === 'DONE' ? T('أحسنت! أُغلقت المهمة', 'Task closed') : L(TASK_ST[nx[0]]), nx[0] === 'DONE' ? T('تم إبلاغ المشرف تلقائيًا.', 'Your supervisor was notified.') : '');
    refreshTasks();
  };
  const card = t => {
    const key = TASK_KEY[t.status], cur = STEPS.indexOf(key), nx = NEXT_TASK[t.status];
    return (
      <article className={'task' + (t.status === 'PENDING' ? ' new' : '')} key={t.id}>
        <div className="task-h"><Pill sev={SEV_KEY[t.incidentSeverity] || 'low'} /><span className="mono faint">{t.incidentCode}</span>
          <span style={{ marginInlineStart: 'auto' }}><span className={'st ' + (t.status === 'PENDING' ? 'open' : 'prog')}><i />{L(TASK_ST[t.status])}</span></span></div>
        <h3>{t.incidentTitle}</h3>
        <div className="inc-meta"><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon n="pin" s={15} />{t.zoneName || '—'}</span><i className="sep" />
          <span>{t.estimatedArrivalMinutes != null ? T(`تقريبًا ${t.estimatedArrivalMinutes} د · ${Math.round(t.distanceMeters || 0)} م`, `~${t.estimatedArrivalMinutes} min · ${Math.round(t.distanceMeters || 0)} m`) : ''}</span>
          {t.isEscalated ? <><i className="sep" /><span>{T('مُعاد إسنادها', 'Reassigned')}</span></> : null}</div>
        {t.notes ? <p className="task-note">{t.notes}</p> : null}
        <div className="steps">{STEPS.map((s, k) => <div key={s} className={'step ' + (k < cur ? 'done' : k === cur ? 'cur' : '')}><i />{L(STATUS[s])}</div>)}</div>
        <div className="task-acts">
          {nx ? <button className="btn btn-primary" onClick={() => step(t)}><Icon n="check" s={17} />{L(nx[1])}</button> : null}
          {t.status === 'PENDING' && <button className="btn btn-ghost" onClick={() => setRejecting(t.id)}>{T('اعتذار', 'Decline')}</button>}
          <button className="btn btn-ghost" onClick={() => showOnMap(t.incidentId)}><Icon n="map" s={16} />{T('عرض على الخريطة', 'Show on map')}</button>
        </div>
        {rejecting === t.id && <ReasonForm placeholder={T('سبب الاعتذار', 'Reason')} confirm={T('إرسال', 'Send')} onCancel={() => setRejecting(null)}
          onSubmit={reason => run(() => api.rejectTask(t.id, reason, me), T('أُرسل اعتذارك وتُسند المهمة لغيرك', 'Declined: the task goes to someone else')).then(() => { setRejecting(null); refreshTasks(); })} />}
      </article>
    );
  };
  return (
    <>
      <div className="ph"><div><h1>{T('مهامي', 'My tasks')}</h1></div></div>
      <section className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi"><label>{T('طلبات جديدة', 'New requests')}</label><b style={{ color: fresh ? 'var(--crit)' : 'var(--fg)' }}>{fresh}</b></div>
        <div className="kpi"><label>{T('قيد التنفيذ', 'In progress')}</label><b style={{ color: 'var(--info)' }}>{act.length - fresh}</b></div>
        <div className="kpi"><label>{T('أنجزتها', 'Done')}</label><b>{done.length}</b></div>
      </section>
      <div className="tasks">{act.map(card)}
        {!act.length && <section className="panel"><div className="empty-state"><Icon n="check" s={28} /><b>{T('لا توجد مهام حاليًا', 'No tasks right now')}</b>
          <span>{T('أي طلب يرسله لك مركز العمليات يظهر هنا مباشرة.', 'Any request from the operations center appears here right away.')}</span></div></section>}</div>
      {done.length ? <section className="panel"><div className="panel-h"><h2>{T('المهام المنجزة', 'Completed')}</h2></div><div className="q">
        {done.map(t => <div className="q-item" key={t.id} style={{ cursor: 'default' }}><span className="sev-bar" style={{ background: 'var(--ok)' }} />
          <span><b>{t.incidentTitle}</b><small>{t.zoneName} · {hm(t.completedAt)}</small></span><span><span className="st done"><i />{L(TASK_ST.DONE)}</span></span></div>)}
      </div></section> : null}
    </>
  );
}

export function Report() {
  const { data, T, L, lang, toast, fail, me } = useApp();
  const [d, setD] = useState({});
  const [err, setErr] = useState([]);
  const [sent, setSent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState(emptyMedia);
  // preview before sending (voice note or unknown zone): { draftId, hasVoice, transcript, zoneCode, zoneGuessed, needsLocation, edit, zone }
  const [review, setReview] = useState(null);
  const self = data.staff.find(s => s.id === me);
  const set = (k, v) => { setD(o => ({ ...o, [k]: v })); setErr(e => e.filter(x => x !== k)); };
  const f = (k, label, input, req, wide) => <div className={'field' + (err.includes(k) ? ' bad' : '') + (wide ? ' wide' : '')}><label htmlFor={'rf-' + k}>{label}{req ? <> <i className="req">*</i></> : null}</label>{input}</div>;
  const zoneOf = v => (v && v !== UNKNOWN ? v : null);
  const done = (r, zone, heard) => {
    setSent(s => [{ ...d, zone: zone || T('غير محدد', 'unknown'), files: { photos: media.photos.length, audio: !!media.audio }, heard, at: new Date() }, ...s]);
    setD({}); setMedia(emptyMedia()); setReview(null);
    toast('ok', T('وصل بلاغك', 'Report sent'), heard ? T(`وصل بهذا الكلام: «${heard}»`, `Sent with: "${heard}"`)
      : media.audio ? T('وصل التسجيل، بس ما قدرنا نفرّغه. غرفة العمليات بتسمعه.', 'Voice note received; the operations room will listen to it.')
        : T('وصل لغرفة العمليات.', 'Your report reached the operations center.'));
  };
  const submit = async e => {
    e.preventDefault();
    if (review) { await confirm(); return; }
    // the description is optional when a photo or voice note is attached (decision 149)
    const missing = ['type', 'zone', ...(hasMedia(media) ? [] : ['desc'])].filter(k => !(d[k] || '').trim());
    if (missing.length) { setErr(missing); return; }
    setBusy(true);
    // the type words help the classifier (Arabic, like the rest of the reports)
    const desc = (d.desc || '').trim();
    const text = `${REPORT_TYPES[d.type][0]}${desc ? ': ' + desc : ''}${d.spot ? ' — ' + d.spot.trim() : ''}`;
    const sourceReference = 'staff:' + (self ? self.employeeNumber : me);
    const zone = zoneOf(d.zone);
    try {
      if (media.audio || !zone) {
        // voice note or unknown zone: show what we heard / ask where before anything is sent
        const p = await api.alertPreview({ sourceReference, text, language: 'ar', zoneCode: zone }, media.photos, media.audio && media.audio.blob);
        setReview({ ...p, edit: p.transcript || '', zone: p.zoneCode || (p.needsLocation ? '' : null) });
      } else {
        const r = hasMedia(media)
          ? await api.sendAlertMedia({ sourceReference, text, language: 'ar', zoneCode: zone }, media.photos, null)
          : await api.sendAlert({ source: 'STAFF_APP', sourceReference, text, language: 'ar', zoneCode: zone });
        done(r, zone, null);
      }
    } catch (ex) { fail(ex); }
    setBusy(false);
  };
  const confirm = async () => {
    const zone = zoneOf(d.zone) || zoneOf(review.zone);
    // '' = not answered yet, null = "I don't know" (allowed)
    if (!zoneOf(d.zone) && review.zone === '') { setErr(['rzone']); return; }
    setBusy(true);
    try {
      const r = await api.alertConfirm({ draftId: review.draftId, transcript: review.edit, zoneCode: zone });
      done(r, zone, review.hasVoice ? (review.edit.trim() || review.transcript || null) : null);
    } catch (ex) {
      fail(ex);
      // review expired (every backend error is a 400, so match the message): send it again; otherwise retry as is
      if (/انتهت مهلة/.test(ex.message || '')) setReview(null);
    }
    setBusy(false);
  };
  const zones = data.zones.map(z => [z.code, `${z.code} · ${lang === 'ar' ? ZONE_AR[z.code] || z.name : z.name}`]);
  const zoneChoices = [...zones, [UNKNOWN, T('ما أعرف', "I don't know")]];
  return (
    <>
      <div className="ph"><div><h1>{T('رفع بلاغ', 'Report an issue')}</h1></div></div>
      <section className="panel"><div className="panel-h"><h2>{T('بلاغ جديد لغرفة العمليات', 'New report to the operations center')}</h2></div>
        <form className="panel-b emp-form" autoComplete="off" noValidate onSubmit={submit}>
          {review ? <div className="form-grid">
            {review.hasVoice && f('edit', review.transcript ? T('هذا اللي فهمناه من تسجيلك، تقدر تعدّله', 'What we heard; you can correct it')
              : T('ما قدرنا نفرّغ التسجيل، اكتب وش قلت إذا تبي', 'Could not transcribe it; type what you said if you like'),
              <textarea id="rf-edit" rows={3} maxLength={1000} value={review.edit} onChange={e => setReview(r => ({ ...r, edit: e.target.value }))} />, false, true)}
            {!zoneOf(d.zone) && f('rzone', review.zoneGuessed ? T('فهمنا إن المكان هنا، غيّره إذا غلط', 'We think it is here; change it if wrong') : T('ما عرفنا المنطقة، اخترها', 'We could not tell the zone; pick it'),
              <Dropdown id="rf-rzone" value={review.zone === null ? UNKNOWN : review.zone} onChange={v => { setReview(r => ({ ...r, zone: v === UNKNOWN ? null : v })); setErr([]); }}
                placeholder={T('اختر المنطقة', 'Choose zone')} options={zoneChoices} />, true, true)}
          </div> : <div className="form-grid">
            {f('type', T('نوع البلاغ', 'Type'), <Dropdown id="rf-type" value={d.type} onChange={v => set('type', v)} placeholder={T('اختر نوعه', 'Choose type')} options={Object.entries(REPORT_TYPES).map(([k, n]) => [k, L(n)])} />, true)}
            {f('zone', T('المنطقة', 'Zone'), <Dropdown id="rf-zone" value={d.zone} onChange={v => set('zone', v)} placeholder={T('اختر المنطقة', 'Choose zone')} options={zoneChoices} />, true)}
            {f('spot', T('وين بالضبط', 'Exact spot'), <input id="rf-spot" value={d.spot || ''} onChange={e => set('spot', e.target.value)} placeholder={T('الجناح B — المدخل الشرقي', 'Pavilion B — east entrance')} />)}
            {f('desc', T('وش صار', 'Description'), <textarea id="rf-desc" rows={4} value={d.desc || ''} onChange={e => set('desc', e.target.value)} />, !hasMedia(media), true)}
            <div className="field wide"><label>{T('صور أو تسجيل صوتي', 'Photos or a voice note')}</label>
              <MediaPicker value={media} onChange={m => { setMedia(m); setErr(e => e.filter(x => x !== 'desc')); }} disabled={busy} /></div>
          </div>}
          {err.length ? <p className="form-err">{T('كمّل الخانات المطلوبة', 'Complete the required fields')}</p> : null}
          <div className="form-actions"><button type="submit" className={'btn btn-primary' + (busy ? ' is-busy' : '')} disabled={busy}>{busy
            ? <><Spinner s={16} />{hasMedia(media) && !review ? T('نحلل المرفقات...', 'Analyzing attachments...') : T('نرسل البلاغ...', 'Sending...')}</>
            : <><Icon n="arrow" s={17} flip />{!review && (media.audio || !zoneOf(d.zone)) ? T('التالي', 'Next') : T('أرسل البلاغ', 'Send report')}</>}</button>
            {review && review.hasVoice ? <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setReview(null); setMedia(m => ({ ...m, audio: null })); setErr([]); }}><Icon n="mic" s={16} />{T('سجّل مرة ثانية', 'Record again')}</button> : null}
            {review ? <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setReview(null); setErr([]); }}>{T('رجوع للبلاغ', 'Back to the report')}</button> : null}
            {busy && hasMedia(media) && !review ? <span className="vwait">{T('ممكن ياخذ لين 15 ثانية، لا تسكّر الصفحة.', 'This can take up to 15 seconds.')}</span> : null}</div>
        </form></section>
      {sent.length ? <section className="panel"><div className="panel-h"><h2>{T('بلاغاتي اللي أرسلتها', 'My reports')}</h2></div><div className="q">
        {sent.map((r, k) => <div className="q-item" key={k} style={{ cursor: 'default' }}><span className="sev-bar" style={{ background: 'var(--info)' }} />
          <span><b>{r.desc || (r.heard ? `«${r.heard}»` : T('بلاغ بمرفقات', 'Report with attachments'))}</b><small>{L(REPORT_TYPES[r.type])}{r.files && (r.files.photos || r.files.audio) ? ` · ${r.files.photos ? T(`${r.files.photos} صور`, `${r.files.photos} photos`) : ''}${r.files.photos && r.files.audio ? ' + ' : ''}${r.files.audio ? T('صوت', 'voice') : ''}` : ''} · {r.zone}{r.spot ? ' · ' + r.spot : ''} · {hm(r.at)}</small></span>
          <span className="st done"><i />{T('وصل', 'Received')}</span></div>)}
      </div></section> : null}
    </>
  );
}