import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Logo, CopyBtn } from './ui.jsx';
import { agoText, initials, STAFF_ROLE } from '../lib/labels.js';
import { sevColor } from '../map/geometry.js';

const NAV = [
  [['التشغيل', 'Operations'], [['overview', 'globe', ['نظرة عامة', 'Overview']], ['map', 'map', ['الخريطة', 'Map']], ['incidents', 'alert', ['الحوادث', 'Incidents']], ['inbox', 'inbox', ['صندوق البلاغات', 'Alerts inbox']]]],
  [['الاستجابة', 'Response'], [['dispatch', 'users', ['الإسناد والموظفون', 'Dispatch & staff']], ['staffadmin', 'userplus', ['إدارة الموظفين', 'Staff management']], ['access', 'access', ['إمكانية الوصول', 'Accessibility']]]],
  [['النظام', 'System'], [['analytics', 'analytics', ['التحليلات', 'Analytics']], ['sources', 'docsearch', ['المصادر', 'Sources']], ['settings', 'gear', ['الإعدادات', 'Settings']]]],
];
const STAFF_NAV = [
  [['عملي', 'My work'], [['mytasks', 'service', ['مهامي', 'My tasks']], ['map', 'map', ['الخريطة', 'Map']], ['report', 'alert', ['رفع بلاغ', 'Report an issue']]]],
  [['النظام', 'System'], [['settings', 'gear', ['الإعدادات', 'Settings']]]],
];

export function Side() {
  const { page, go, isField, isSup, L, T, vm, data, me } = useApp();
  const cur = page === 'incident' ? 'incidents' : page === 'profile' ? 'settings' : page;
  const openN = isField
    ? data.tasks.filter(t => t.staffId === me && t.status === 'PENDING').length
    : vm.incidents.filter(i => i.status === 'open').length;
  const badgeOn = isField ? 'mytasks' : 'incidents';
  const nav = (isField ? STAFF_NAV : NAV).map(([g, items]) => [g, items.filter(([k]) => k !== 'staffadmin' || isSup)]);
  return (
    <aside className="side">
      <div className="brand"><Logo s={38} /><div><b>{T('رِفد', 'RIFD')}</b></div></div>
      <nav className="nav">
        {nav.map(([lbl, items]) => (
          <div className="nav-g" key={lbl[1]}>
            <div className="nav-l">{L(lbl)}</div>
            {items.map(([k, i, n]) => (
              <a key={k} className={cur === k ? 'on' : ''} tabIndex={0} role="link" aria-current={cur === k ? 'page' : undefined}
                onClick={() => go(k)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(k); } }}>
                <Icon n={i} /><span>{L(n)}</span>{k === badgeOn && openN ? <span className="cnt">{openN}</span> : null}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Clock() {
  const { lang, live, T } = useApp();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const h = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(h); }, []);
  const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <div className="clock"><b>{now.toLocaleTimeString('en-GB')}</b>
      <small>{date}{live ? '' : ' · ' + T('غير متصل بالتحديث المباشر', 'live updates offline')}</small></div>
  );
}

export function Top() {
  const { auth, isField, T, lang, bell, data, unread, markBellRead, openInc, go, me } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const mine = data.notifications.filter(n => n.recipientStaffId === me || (isField && n.recipientSpecialty))
    .map(n => ({ id: 'n' + n.id, incidentId: n.incidentId, sev: n.priority === 'HIGH' ? 'crit' : n.priority === 'MEDIUM' ? 'high' : 'low', text: n.message, at: n.sentAt }));
  const list = [...bell, ...mine].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  const click = it => { setOpen(false); if (isField) go('mytasks'); else if (it.incidentId) openInc(it.incidentId); };
  return (
    <header className="top">
      <Clock />
      <div className="top-sp" />
      <div className="notif-wrap" ref={ref}>
        <button className="icon-btn" aria-label={T('الإشعارات', 'Notifications')} onClick={() => { setOpen(o => !o); markBellRead(); }}>
          <Icon n="bell" />{unread ? <span className="badge">{unread}</span> : null}
        </button>
        {open && (
          <div className="drop"><h4>{T('الإشعارات', 'Notifications')}</h4>
            {!list.length && <div className="empty">{T('لا توجد إشعارات', 'No notifications')}</div>}
            {list.map(n => (
              <button key={n.id} className="drop-i" onClick={() => click(n)}>
                <span className="sev-bar" style={{ background: sevColor(n.sev), height: 34 }} />
                <span><span>{n.text}</span><small>{agoText(n.at, lang)}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="me"><span className="av">{initials(auth?.name)}</span><div><b>{auth?.name}</b></div></div>
    </header>
  );
}

export function Toasts() {
  const { toasts, closeToast, openInc, go } = useApp();
  return (
    <div id="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast t-${t.kind}${t.out ? ' out' : ''}`}>
          <div className="t-ic"><Icon n={t.kind === 'crit' ? 'alert' : t.kind === 'ok' ? 'check' : 'spark'} s={18} /></div>
          <div><b>{t.title}</b>{t.body ? <p>{t.body}</p> : null}
            {t.act ? <button className="btn btn-primary btn-sm" onClick={() => { closeToast(t.id); t.act.kind === 'inc' ? openInc(t.act.v) : go(t.act.v); }}>{t.act.l}</button> : null}
          </div>
          <button className="t-x" aria-label="close" onClick={() => closeToast(t.id)}><Icon n="x" s={14} /></button>
        </div>
      ))}
    </div>
  );
}

// "account created" (the generated password is shown once) and simple "done" confirmations
export function Modal() {
  const { modal, setModal, T, L } = useApp();
  const btn = useRef(null);
  useEffect(() => {
    if (!modal) return undefined;
    btn.current && btn.current.focus();
    const h = e => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [modal, setModal]);
  if (!modal) return <div id="modal-root" />;
  if (modal.kind === 'account') {
    const { username, password, staff } = modal.data;
    const msg = T(`مرحبًا ${staff.name}،\nتم إنشاء حسابك في منصة رِفد.\nاسم المستخدم: ${username}\nكلمة المرور: ${password}\nرابط الدخول: ${window.location.origin}`,
      `Hello ${staff.name},\nYour RIFD account is ready.\nUsername: ${username}\nPassword: ${password}\nSign in: ${window.location.origin}`);
    return (
      <div id="modal-root"><div className="scrim"><div className="modal modal-acc" role="dialog" aria-modal="true" aria-labelledby="mt">
        <span className="ok-big"><Icon n="check" s={30} /></span>
        <div><h2 id="mt">{T('تم إنشاء الحساب', 'Account created')}</h2>
          <p className="muted" style={{ fontSize: 13 }}>{T('انسخ كلمة المرور الآن: ما تنعرض مرة ثانية.', 'Copy the password now: it is not shown again.')} · {L(STAFF_ROLE[staff.role])}</p></div>
        <div className="cred"><label>{T('اسم المستخدم', 'Username')}</label><div className="cred-v"><code dir="ltr">{username}</code><CopyBtn text={username} size={17} /></div></div>
        <div className="cred"><label>{T('كلمة المرور', 'Password')}</label><div className="cred-v"><code dir="ltr">{password}</code><CopyBtn text={password} size={17} /></div></div>
        <CopyBtn className="btn btn-primary" text={msg} label={T('نسخ بيانات الدخول', 'Copy sign-in details')} size={17} />
        <button className="btn btn-ghost" ref={btn} onClick={() => setModal(null)}>{T('تم', 'Done')}</button>
      </div></div></div>
    );
  }
  return (
    <div id="modal-root"><div className="scrim"><div className="modal modal-ok" role="dialog" aria-modal="true" aria-labelledby="mt">
      <span className="ok-big"><Icon n="check" s={30} /></span>
      <h2 id="mt">{modal.title}</h2>
      {modal.body ? <p className="muted">{modal.body}</p> : null}
      <button className="btn btn-primary" ref={btn} onClick={() => setModal(null)}>{T('تم', 'Done')}</button>
    </div></div></div>
  );
}

// login / welcome background: rotating rings around the card (from the design)
export function BgCanvas({ cardSelector }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return undefined;
    const ctx = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    let W, H, raf = 0;
    const size = () => { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const TAU = Math.PI * 2;
    const RINGS = [
      { r: 225, w: 15, c: 'rgba(64,184,156,.24)', v: .16, segs: [[.03, .47], [.53, .97]] },
      { r: 268, w: 15, c: 'rgba(64,184,156,.19)', v: -.11, segs: [[0, .29], [.33, .61], [.65, .96]] },
      { r: 311, w: 15, c: 'rgba(64,184,156,.15)', v: .08, segs: [[.06, .56], [.61, .95]] },
      { r: 356, w: 2, c: 'rgba(64,184,156,.35)', v: 0, segs: [[0, 1]] },
      { r: 415, w: 4, c: 'rgba(227,240,235,.12)', v: -.05, segs: [[0, .12], [.21, .29], [.44, .6], [.7, .79]] },
      { r: 492, w: 3, c: 'rgba(227,240,235,.08)', v: .035, segs: [[.08, .22], [.5, .68], [.84, .9]] },
      { r: 575, w: 12, c: 'rgba(64,184,156,.09)', v: -.03, segs: [[.02, .3], [.36, .58], [.66, .94]] },
      { r: 650, w: 2, c: 'rgba(64,184,156,.17)', v: 0, segs: [[0, 1]] },
      { r: 730, w: 4, c: 'rgba(227,240,235,.06)', v: .022, segs: [[.04, .16], [.3, .46], [.6, .7], [.8, .92]] },
      { r: 830, w: 10, c: 'rgba(64,184,156,.06)', v: -.016, segs: [[0, .22], [.3, .55], [.62, .9]] },
      { r: 940, w: 3, c: 'rgba(227,240,235,.045)', v: .012, segs: [[.1, .3], [.45, .6], [.72, .95]] },
    ];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const frame = now => {
      if (c.clientWidth !== W || c.clientHeight !== H) size();
      const t = reduce ? 0 : ((now || t0) - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const card = document.querySelector(cardSelector);
      const rc = card ? card.getBoundingClientRect() : { left: W / 2, top: H / 2, width: 0, height: 0 };
      const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      const s = Math.max(.8, rc.height / 560, Math.hypot(W, H) / 1750);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * .6);
      const light = document.documentElement.dataset.theme === 'light';
      if (light) { bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(.5, '#F1F7F4'); bg.addColorStop(1, '#E3EEEA'); }
      else { bg.addColorStop(0, '#051F18'); bg.addColorStop(.5, '#041711'); bg.addColorStop(1, '#030F0B'); }
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (card && card.classList.contains('lcard')) { ctx.fillStyle = '#40B89C'; ctx.beginPath(); ctx.arc(cx, cy, 70 * s, 0, TAU); ctx.fill(); }
      ctx.lineCap = 'butt';
      RINGS.forEach(g => {
        const rot = t * g.v;
        ctx.strokeStyle = light ? g.c.replace('227,240,235', '7,66,51').replace('64,184,156,.', '21,145,78,.1') : g.c; ctx.lineWidth = g.w * s;
        g.segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(cx, cy, g.r * s, rot + a * TAU, rot + b * TAU); ctx.stroke(); });
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [cardSelector]);
  return <canvas id="bgc" ref={ref} aria-hidden="true" />;
}

export function LangSeg({ full }) {
  const { lang, setLang } = useApp();
  return (
    <div className="seg">
      <button className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>{full ? 'العربية' : 'ع'}</button>
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>{full ? 'English' : 'EN'}</button>
    </div>
  );
}
