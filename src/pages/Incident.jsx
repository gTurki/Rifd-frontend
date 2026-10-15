import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Pill, StChip, ReasonForm } from '../components/ui.jsx';
import { sevColor } from '../map/geometry.js';
import { api } from '../lib/api.js';
import { SEV, SEV_BACK, STATUS, STEPS, TASK_ST, ACTIVE_TASK, ROLES, LEVEL, CATEGORY, SRC, TRUST, hm, initials } from '../lib/labels.js';
import { LogI } from '../components/Log.jsx';
import { AttachmentButton } from '../components/Attachment.jsx';

function AccCard({ i }) {
  const { data, T, me, run, isSup } = useApp();
  const asset = data.assets.find(a => a.id === i.raw.accessibilityAssetId);
  const route = data.routes.find(r => (r.assetIds || []).includes(i.raw.accessibilityAssetId));
  const alt = route ? data.alts[route.id] : null;
  const st = !route || route.status !== 'DISRUPTED' ? 'ok' : alt && alt.found ? 'rerouted' : 'affected';
  return (
    <section className="acc-card">
      <h3><Icon n="access" s={18} />{T('أثر الحادثة على ذوي الإعاقة', 'Accessibility impact')}
        <span style={{ marginInlineStart: 'auto' }}>{st === 'affected' ? <span className="pill s-crit"><i className="d" />{T('بدون بديل', 'No alternative')}</span>
          : st === 'rerouted' ? <span className="pill s-acc"><i className="d" />{T('يوجد بديل', 'Alternative ready')}</span>
            : <span className="pill s-ok"><i className="d" />{T('يعمل', 'Open')}</span>}</span></h3>
      <div className="acc-route">
        <div><small>{T('المسار المتأثر', 'Affected route')}</small><b>{route ? route.name : '—'}</b>{asset ? <div className="muted" style={{ fontSize: 12 }}>{asset.name}</div> : null}</div>
        <Icon n="arrow" s={18} flip style={{ color: 'var(--access)' }} />
        <div><small>{T('البديل', 'Alternative')}</small>{alt && alt.found
          ? <><b>{alt.segments.map(s => s.name).join(' ← ')}</b><div className="muted" style={{ fontSize: 12 }}>~{alt.estimatedMinutes} {T('د', 'min')} · {Math.round(alt.totalMeters)} {T('م', 'm')}</div></>
          : <b>{route && route.status === 'DISRUPTED' ? T('مكتب خدمة الزوار', 'Visitor services desk') : '—'}</b>}</div>
      </div>
      {route && route.status === 'DISRUPTED' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {route.publishedAt ? <span className="muted" style={{ fontSize: 13 }}>{T('منشور على تطبيق الزوار', 'Live on the visitor app')} · {hm(route.publishedAt)}</span>
            : <button className="btn btn-primary btn-sm" onClick={() => run(() => api.publishRoute(route.id, me), T('نُشر التحديث للزوار', 'Update published to visitors'))}>{T('نشر التحديث للزوار', 'Publish update to visitors')}</button>}
          {asset && isSup && asset.status !== 'OPERATIONAL' && <span className="muted" style={{ fontSize: 12 }}>{T('يرجع الأصل للعمل تلقائيًا عند إغلاق الحادثة', 'The asset returns to service when the incident is closed')}</span>}
        </div>)}
    </section>
  );
}

function Candidates({ i, limit, onDone, preview }) {
  const { T, L, me, run, refreshIncident } = useApp();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let s = false; api.candidates(i.raw.id).then(r => { if (!s) setList(r); }).catch(() => { if (!s) setList([]); }); return () => { s = true; }; }, [i.raw.id, i.tasks.length]);
  if (!list) return <div className="muted" style={{ fontSize: 13 }}>{T('جاري البحث عن أقرب موظف…', 'Finding the nearest staff…')}</div>;
  if (!list.length) return <div className="muted" style={{ fontSize: 13 }}>{T('لا يوجد موظف متاح بالتخصص المطلوب الآن', 'Nobody with the right specialty is available now')}</div>;
  const assign = async c => {
    setBusy(true);
    await run(() => api.assign(i.raw.id, c.staff.id, null, me), T(`أُرسلت المهمة إلى ${c.staff.name}`, `Task sent to ${c.staff.name}`));
    await refreshIncident(i.raw.id); setBusy(false); onDone && onDone();
  };
  // preview = who the recommendation would send (not clickable); otherwise a click assigns manually
  const Tag = preview ? 'div' : 'button';
  return list.slice(0, limit || 4).map((c, k) => (
    <Tag key={c.staff.id} className={'pick' + (preview && k === 0 ? ' on' : '')} disabled={preview ? undefined : busy} onClick={preview ? undefined : () => assign(c)} style={preview ? { cursor: 'default' } : undefined}>
      <span className="av" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 12 }}>{initials(c.staff.name)}</span>
      <span style={{ minWidth: 0 }}><b style={{ fontWeight: 500 }}>{c.staff.name}</b>{k === 0 ? <span className="best">{T('الأقرب', 'Nearest')}</span> : null}
        <small style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>{L(ROLES[c.staff.specialty] || ['', ''])} · {L(LEVEL[c.staff.level] || ['', ''])}{c.escort ? ' · ' + T('مرافق', 'escort') : ''}</small></span>
      <span className="eta"><b>{c.estimatedArrivalMinutes ?? '—'} {T('د', 'min')}</b>{c.distanceMeters != null ? `${Math.round(c.distanceMeters)} ${T('م', 'm')}` : ''}</span>
    </Tag>
  ));
}

function Decide({ i }) {
  const { T, me, run, refreshIncident, setModal } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [manual, setManual] = useState(false);
  const rec = i.rec;
  const accept = async () => {
    const r = await run(() => api.acceptRec(rec.id, me));
    if (r) { setModal({ title: T('تم اعتماد التوصية وإرسال المهام', 'Recommendation approved, tasks sent'), body: `${rec.playbookTitle} · ${rec.staffCount} ${T('موظف', 'staff')}` }); }
    refreshIncident(i.raw.id);
  };
  if (!rec) {
    return (
      <section className="rec"><div className="rec-t"><Icon n="spark" s={17} />{T('لا توجد توصية حالية', 'No pending recommendation')}</div>
        <div className="decide">
          <button className="btn btn-primary" onClick={() => run(() => api.regenerate(i.raw.id, me), T('طُلبت توصية جديدة', 'New recommendation requested')).then(() => refreshIncident(i.raw.id))}>
            <Icon n="spark" s={18} />{T('اطلب توصية', 'Get a recommendation')}</button>
          <button className="btn btn-ghost" onClick={() => setManual(m => !m)}>{T('إسناد يدوي', 'Assign manually')}</button>
        </div>
        {manual && <div className="picks"><Candidates i={i} onDone={() => setManual(false)} /></div>}
      </section>
    );
  }
  const steps = String(rec.actionText || '').split('\n').map(s => s.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean);
  return (
    <section className="rec"><div className="rec-t"><Icon n="spark" s={17} />{T('توصية رِفد', 'RIFD recommendation')} · {rec.playbookTitle}</div>
      <div className="acts">{steps.map((s, k) => <div className="chk" key={k}><Icon n="check" s={16} style={{ color: 'var(--brand)' }} /><span>{s}</span></div>)}</div>
      <div className="picks"><div className="picks-h"><span>{T(`المطلوب: ${rec.staffCount} · ${rec.requiredLevel === 'CERTIFIED' ? 'معتمد' : 'مساعد'}`, `Needed: ${rec.staffCount} · ${(rec.requiredLevel || '').toLowerCase()}`)}</span></div>
        <Candidates i={i} limit={Math.max(1, Math.min(rec.staffCount || 1, 3))} preview /></div>
      <div className="muted" style={{ fontSize: 12 }}>{rec.reasoning}</div>
      <div className="decide">
        <button className="btn btn-primary" onClick={accept}><Icon n="check" s={18} />{T('اعتماد وإرسال', 'Approve & dispatch')}</button>
        <button className="btn btn-ghost" onClick={() => setRejecting(r => !r)}>{T('رفض التوصية', 'Reject')}</button>
        <button className="btn btn-ghost" onClick={() => setManual(m => !m)}>{T('إسناد يدوي', 'Assign manually')}</button>
      </div>
      {manual && <div className="picks"><Candidates i={i} onDone={() => setManual(false)} /></div>}
      {rejecting && <ReasonForm placeholder={T('سبب الرفض', 'Reason')} confirm={T('رفض', 'Reject')} onCancel={() => setRejecting(false)}
        onSubmit={reason => run(() => api.rejectRec(rec.id, reason, me), T('رُفضت التوصية: أسند يدويًا أو اطلب توصية جديدة', 'Rejected: assign manually or ask again')).then(() => { setRejecting(false); refreshIncident(i.raw.id); })} />}
    </section>
  );
}

function Track({ i }) {
  const { T, L, me, run, refreshIncident } = useApp();
  const [cancelling, setCancelling] = useState(null);
  const [more, setMore] = useState(false);
  const cur = i.status === 'false' ? 4 : STEPS.indexOf(i.status);
  const tasks = i.tasks.filter(t => ACTIVE_TASK.includes(t.status) || t.status === 'DONE');
  const closed = !i.active;
  return (
    <section className="panel"><div className="panel-h"><h2>{closed ? T('تم التنفيذ', 'Completed') : T('متابعة التنفيذ', 'Tracking')}</h2><span className="muted" style={{ fontSize: 12 }}>{T('تحديث مباشر من تطبيق الموظفين', 'Live from the staff app')}</span></div>
      <div className="panel-b">
        {closed && <div className="resolved" style={{ marginBottom: 18 }}><span className="ok"><Icon n="check" s={20} /></span>
          <div><b style={{ fontWeight: 500 }}>{i.status === 'false' ? T('أُغلقت كإنذار كاذب', 'Closed as a false alarm') : T('أُغلقت الحادثة', 'Incident resolved')}</b>
            <div className="muted" style={{ fontSize: 13 }}>{i.raw.resolutionNotes || ''} {hm(i.raw.resolvedAt)}</div></div></div>}
        <div className="steps">{STEPS.map((s, k) => <div key={s} className={'step ' + (k < cur || (k === cur && s === 'resolved') ? 'done' : k === cur ? 'cur' : '')}><i />{L(STATUS[s])}</div>)}</div>
        <div className="track-team">{tasks.map(t => (
          <div className="pick on" key={t.id} style={{ cursor: 'default' }}>
            <span className="av" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 12 }}>{initials(t.staffName)}</span>
            <span><b style={{ fontWeight: 500 }}>{t.staffName}</b><small style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>{L(ROLES[t.staffSpecialty] || ['', ''])} · {L(TASK_ST[t.status])}{t.isEscalated ? ' · ' + T('مُصعّدة', 'escalated') : ''}</small>
              {!closed && ACTIVE_TASK.includes(t.status) && (cancelling === t.id
                ? <ReasonForm placeholder={T('سبب السحب', 'Reason')} confirm={T('سحب', 'Withdraw')} onCancel={() => setCancelling(null)}
                  onSubmit={reason => run(() => api.cancelTask(t.id, reason, me), T('سُحبت المهمة', 'Task withdrawn')).then(() => { setCancelling(null); refreshIncident(i.raw.id); })} />
                : <button className="link" style={{ fontSize: 12, color: 'var(--muted)' }} onClick={() => setCancelling(t.id)}>{T('سحب المهمة', 'Withdraw')}</button>)}</span>
            <span className="eta">{t.status === 'ON_SITE' || t.status === 'DONE' ? <b style={{ color: 'var(--brand)' }}>{T('وصل', 'Arrived')}</b>
              : <><b>{t.estimatedArrivalMinutes ?? '—'} {T('د', 'min')}</b>{t.distanceMeters != null ? `${Math.round(t.distanceMeters)} ${T('م', 'm')}` : ''}</>}</span>
          </div>))}
          {!tasks.length && <div className="muted" style={{ fontSize: 13 }}>{T('لا يوجد موظف على الحادثة الآن', 'Nobody is on this incident right now')}</div>}
        </div>
        {!closed && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setMore(m => !m)}><Icon n="userplus" s={15} />{T('إضافة موظف', 'Add staff')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.regenerate(i.raw.id, me), T('طُلبت توصية جديدة', 'New recommendation requested')).then(() => refreshIncident(i.raw.id))}><Icon n="spark" s={15} />{T('توصية تعزيز', 'Reinforcement recommendation')}</button>
        </div>}
        {more && <div className="picks" style={{ marginTop: 10 }}><Candidates i={i} onDone={() => setMore(false)} /></div>}
      </div>
    </section>
  );
}

function Actions({ i }) {
  const { T, L, me, run, refreshIncident } = useApp();
  const [mode, setMode] = useState(null);
  const [notes, setNotes] = useState('');
  const [actual, setActual] = useState('');
  const id = i.raw.id;
  const done = () => { setMode(null); setNotes(''); refreshIncident(id); };
  if (!i.active) {
    return (
      <section className="panel"><div className="panel-h"><h2>{T('إجراءات', 'Actions')}</h2></div><div className="panel-b">
        {mode === 'reopen' ? <ReasonForm placeholder={T('سبب إعادة الفتح', 'Reason')} confirm={T('إعادة فتح', 'Reopen')} onCancel={() => setMode(null)}
          onSubmit={reason => run(() => api.reopen(id, reason, me), T('أُعيد فتح الحادثة', 'Incident reopened')).then(done)} />
          : <button className="btn btn-ghost btn-sm" onClick={() => setMode('reopen')}><Icon n="reset" s={15} />{T('إعادة فتح الحادثة', 'Reopen incident')}</button>}
      </div></section>
    );
  }
  return (
    <section className="panel"><div className="panel-h"><h2>{T('إجراءات المشغّل', 'Operator actions')}</h2>
      {!i.raw.acknowledgedAt && <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.acknowledge(id, me), T('تم الاطلاع', 'Acknowledged')).then(done)}><Icon n="eye" s={15} />{T('اطلعت عليها', 'Acknowledge')}</button>}</div>
      <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="set-r" style={{ padding: 0 }}><span className="muted">{T('تعديل الخطورة', 'Change severity')}</span>
          <div className="seg">{['low', 'high', 'crit'].map(k => (
            <button key={k} className={i.sev === k ? 'on' : ''} onClick={() => { if (i.sev !== k) setMode('sev:' + k); }}>{L(SEV[k])}</button>))}</div></div>
        {mode && mode.startsWith('sev:') && <ReasonForm placeholder={T('سبب تعديل الخطورة', 'Reason for the change')} confirm={T('تعديل', 'Change')} onCancel={() => setMode(null)}
          onSubmit={reason => run(() => api.setSeverity(id, SEV_BACK[mode.slice(4)], reason, me), T('عُدّلت الخطورة', 'Severity changed')).then(done)} />}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setMode(mode === 'resolve' ? null : 'resolve')}><Icon n="check" s={15} />{T('إغلاق الحادثة', 'Resolve')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode(mode === 'false' ? null : 'false')}>{T('إنذار كاذب', 'False alarm')}</button>
        </div>
        {(mode === 'resolve' || mode === 'false') && (
          <form className="emp-form" onSubmit={e => {
            e.preventDefault();
            const fn = mode === 'resolve' ? () => api.resolve(id, notes || null, actual || null, me) : () => api.falseAlarm(id, notes || null, me);
            run(fn, mode === 'resolve' ? T('أُغلقت الحادثة', 'Incident resolved') : T('أُغلقت كإنذار كاذب', 'Closed as a false alarm')).then(done);
          }}>
            <div className="field wide"><label htmlFor="rn">{T('ملاحظات الإغلاق', 'Closing notes')}</label><textarea id="rn" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            {mode === 'resolve' && <div className="field"><label>{T('الخطورة الفعلية', 'Actual severity')}</label>
              <div className="seg">{['LOW', 'MEDIUM', 'HIGH'].map(k => <button type="button" key={k} className={actual === k ? 'on' : ''} onClick={() => setActual(actual === k ? '' : k)}>{L(SEV[{ LOW: 'low', MEDIUM: 'high', HIGH: 'crit' }[k]])}</button>)}</div></div>}
            <div className="form-actions"><button className="btn btn-primary btn-sm" type="submit">{T('تأكيد', 'Confirm')}</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => setMode(null)}>{T('إلغاء', 'Cancel')}</button></div>
          </form>)}
      </div>
    </section>
  );
}

function Signals({ i }) {
  const { T, L } = useApp();
  return (
    <section className="panel"><div className="panel-h"><h2>{T('البلاغات المدموجة', 'Merged signals')}</h2><span className="q-count neutral">{i.total}</span></div>
      <div className="log" style={{ paddingBottom: 10 }}>{i.alerts.slice().sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)).slice(0, 25).map(a => (
        <div className="log-i" key={a.id} style={a.status === 'DISMISSED' ? { opacity: .5 } : null}>
          <time>{hm(a.receivedAt)}</time><span className="li sys"><Icon n={(SRC[a.source] || {}).i || 'info'} s={13} /></span>
          <span>{a.rawText}<small className="muted" style={{ display: 'block', fontSize: 11 }}>{L((SRC[a.source] || { n: [a.source, a.source] }).n)}{a.reporterTrust ? ' · ' + L(TRUST[a.reporterTrust]) : ''}
            {a.aiConfidence != null ? ` · ${a.aiConfidence === 0.5 ? T('قواعد', 'rules') : 'AI ' + a.aiConfidence.toFixed(2)}` : ''}{a.status === 'DISMISSED' ? ' · ' + T('مستبعد', 'dismissed') : ''}</small>
            {a.attachmentUrl ? <AttachmentButton alert={a} /> : null}</span>
        </div>))}</div></section>
  );
}

export function IncidentPage() {
  const { incId, getInc, T, L, go, showOnMap, me, run, refreshIncident } = useApp();
  const i = getInc(incId);
  const [log, setLog] = useState([]);
  useEffect(() => { if (incId) refreshIncident(incId); }, [incId]); // eslint-disable-line react-hooks/exhaustive-deps
  const stamp = i ? `${i.raw.updatedAt}|${i.tasks.length}|${(i.recs || []).length}` : '';
  useEffect(() => { if (!incId) return; api.incidentActivity(incId).then(setLog).catch(() => {}); }, [incId, stamp]);
  if (!i) return <p className="muted">{T('الحادثة غير موجودة', 'Incident not found')}</p>;
  const segs = ['low', 'high', 'crit'], sevIdx = segs.indexOf(i.sev);
  const first = i.alerts.reduce((m, a) => (!m || new Date(a.receivedAt) < new Date(m) ? a.receivedAt : m), null) || i.raw.createdAt;
  const why = [
    [`${i.total} بلاغ من ${i.sources.length || 1} مصادر مختلفة دُمجت في حادثة واحدة`, `${i.total} reports from ${i.sources.length || 1} sources merged into one incident`],
    ['التصنيف: ' + ((CATEGORY[i.raw.category] || [])[0] || i.raw.category), 'Category: ' + ((CATEGORY[i.raw.category] || [])[1] || i.raw.category)],
    i.raw.eventId ? ['قريبة من فعالية جارية: الخطورة ترتفع', 'Next to a live event: severity is raised'] : null,
    i.raw.affectsAccessibility ? ['مسار مهيأ لذوي الإعاقة متأثر', 'An accessible route is affected'] : null,
    i.sev === 'crit' ? ['تحتاج تدخلًا فوريًا الآن', 'Needs immediate action now'] : null,
  ].filter(Boolean);
  const dup = i.raw.possibleDuplicateOfCode;
  return (
    <>
      <div><button className="crumb" onClick={() => go('incidents')}><Icon n="back" s={15} flip />{T('الحوادث', 'Incidents')}</button>
        <div className="inc-head"><div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Pill sev={i.sev} /><span className="mono muted">{i.code}</span><StChip st={i.status} /></div>
          <h1>{i.title}</h1>
          <div className="inc-meta"><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon n="pin" s={15} />{L(i.zoneName)}</span><i className="sep" />
            <span>{L(CATEGORY[i.raw.category] || ['', ''])}</span><i className="sep" />
            <span>{T('أول بلاغ', 'First report')} <span className="mono">{hm(first)}</span></span></div></div>
          <button className="btn btn-ghost btn-sm" onClick={() => showOnMap(i.id)}><Icon n="map" s={15} />{T('عرض على الخريطة', 'Show on map')}</button></div></div>

      {dup && i.active && (
        <div className="note"><Icon n="merge" s={18} />
          <span style={{ flex: 1 }}>{T(`احتمال تكرار للحادثة ${dup}`, `Possible duplicate of ${dup}`)}{i.raw.duplicateScore != null ? ` (${i.raw.duplicateScore.toFixed(2)})` : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => run(() => api.confirmDuplicate(i.raw.id, me), T(`دُمجت مع ${dup}`, `Merged into ${dup}`)).then(r => { if (r) refreshIncident(r.id); refreshIncident(i.raw.id); })}>{T('دمج مع الأصلية', 'Merge into the original')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.notDuplicate(i.raw.id, me), T('أُزيلت علامة التكرار', 'Flag removed')).then(() => refreshIncident(i.raw.id))}>{T('ليست تكرارًا', 'Not a duplicate')}</button>
        </div>)}

      {!i.active ? (
        <div className="idg"><div className="col"><Track i={i} /><Actions i={i} /></div>
          <div className="col"><Signals i={i} /></div></div>
      ) : (
        <div className="idg">
          <div className="col">
            <section className="panel"><div className="panel-h"><h2>{T('لماذا خطر؟', 'Why is it risky?')}</h2></div><div className="panel-b">
              <div className="meter">{segs.map((s, k) => <span key={s} style={k <= sevIdx ? { background: sevColor(s) } : null} />)}</div>
              <div className="meter-l">{segs.map((s, k) => <span key={s} className={k === sevIdx ? 'on' : ''}>{L(SEV[s])}</span>)}</div>
              <div className="why"><ul>{why.map((w, k) => <li key={k}><span>{L(w)}</span></li>)}</ul></div>
            </div></section>
            <Actions i={i} />
            <Signals i={i} />
          </div>
          <div className="col">
            {i.status === 'open' ? <Decide i={i} /> : <Track i={i} />}
            {i.raw.affectsAccessibility ? <AccCard i={i} /> : null}
            <section className="panel"><div className="panel-h"><h2>{T('سجل الحادثة', 'Incident log')}</h2></div>
              <div className="log" style={{ paddingBottom: 10 }}>{log.slice(0, 12).map(l => <LogI key={l.id} l={l} />)}
                {!log.length && <div className="empty">{T('سيظهر هنا كل تحديث على الحادثة', 'Every update on this incident shows here')}</div>}</div></section>
          </div>
        </div>
      )}
    </>
  );
}
