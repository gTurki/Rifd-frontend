import { useEffect, useMemo, useRef, useState } from 'react';
import { I } from '../lib/svg.js';
import logoSrc from '../assets/logo.webp?inline';
import { useApp } from '../store/AppContext.jsx';
import { SEV, ZST, STATUS, SRC, initials } from '../lib/labels.js';

// same markup as the design's ic(): <svg class="ic">
export function Icon({ n, s = 18, flip, style, className }) {
  return (
    <svg className={'ic' + (flip ? ' flip' : '') + (className ? ' ' + className : '')} width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}
      dangerouslySetInnerHTML={{ __html: I[n] || '' }} />
  );
}

// Saudi-identity logo (Sadu pattern), inlined into the bundle so it shows instantly
export function Logo({ s = 38 }) {
  return <img className="logo" src={logoSrc} width={s} height={s} alt="" draggable="false" />;
}

export function Pill({ sev }) {
  const { L } = useApp();
  return <span className={`pill s-${sev}`}><i className="d" />{L(SEV[sev])}</span>;
}
export function ZPill({ st }) {
  const { L } = useApp();
  return <span className={`pill s-${st}`}><i className="d" />{L(ZST[st])}</span>;
}
export function StChip({ st }) {
  const { L } = useApp();
  const cls = st === 'open' ? 'open' : st === 'resolved' || st === 'false' ? 'done' : 'prog';
  return <span className={`st ${cls}`}><i />{L(STATUS[st] || [st, st])}</span>;
}
export function SrcIcons({ list }) {
  const { L } = useApp();
  return <span className="srcs">{list.map(s => <span key={s} title={L((SRC[s] || { n: [s, s] }).n)}><Icon n={(SRC[s] || {}).i || 'info'} s={14} /></span>)}</span>;
}
export function Who({ name, sub }) {
  return <span className="who"><span className="av">{initials(name)}</span><span><b>{name}</b><small>{sub}</small></span></span>;
}

// the design's custom dropdown (.dd), as a controlled component
export function Dropdown({ value, onChange, options, placeholder, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const cur = options.find(([v]) => v === value);
  return (
    <div className={'dd' + (open ? ' open' : '')} ref={ref}>
      <button type="button" id={id} className="dd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className={'dd-val' + (cur ? '' : ' ph')}>{cur ? cur[1] : placeholder}</span><Icon n="chev" s={16} />
      </button>
      <div className="dd-list" role="listbox">
        {options.map(([v, t]) => (
          <button type="button" role="option" aria-selected={v === value} key={v} className={'dd-opt' + (v === value ? ' sel' : '')}
            onClick={() => { onChange(v); setOpen(false); }}>{t}<Icon n="check" s={15} /></button>
        ))}
      </div>
    </div>
  );
}

// copy button with the design's "copied" feedback
export function CopyBtn({ text, label, className = 'cp', size = 15 }) {
  const { T } = useApp();
  const [done, setDone] = useState(false);
  const copy = () => {
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1600); };
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* */ } ta.remove(); ok();
    };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  };
  return (
    <button type="button" className={className + (done ? ' copied' : '')} onClick={copy} aria-label={label || T('نسخ', 'Copy')}>
      <Icon n={done ? 'check' : 'copy'} s={size} />{label ? (done ? T('تم النسخ', 'Copied') : label) : null}
    </button>
  );
}

// a tiny prompt used for reasons (reject, dismiss, cancel...): the backend requires a reason
export function ReasonForm({ placeholder, confirm, onSubmit, onCancel }) {
  const { T } = useApp();
  const [v, setV] = useState('');
  return (
    <form className="reason" onSubmit={e => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}>
      <input autoFocus value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} maxLength={500} />
      <button className="btn btn-primary btn-sm" type="submit" disabled={!v.trim()}>{confirm}</button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>{T('إلغاء', 'Cancel')}</button>
    </form>
  );
}
