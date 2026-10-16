import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Logo } from '../components/ui.jsx';
import { BgCanvas, LangSeg } from '../components/Shell.jsx';
import { api } from '../lib/api.js';

// visitor sign in / sign up (same card as the staff login). onDone(response, remember)
export function VisitorAuth({ onDone }) {
  const { T, setPage } = useApp();
  const [mode, setMode] = useState('in'); // 'in' | 'up'
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [rem, setRem] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const up = mode === 'up';
  const set = (k, v) => { setF(o => ({ ...o, [k]: v })); setErr(''); };
  const swap = () => { setMode(up ? 'in' : 'up'); setErr(''); setInfo(''); };

  const submit = async e => {
    e.preventDefault();
    if ((up && !f.name.trim()) || !f.email.trim() || !f.password) { setErr(T('عبّ كل الخانات', 'Fill in every field')); return; }
    if (up && f.password.length < 8) { setErr(T('كلمة المرور لازم تكون 8 أحرف أو أكثر', 'The password needs at least 8 characters')); return; }
    setBusy(true); setErr(''); setInfo('');
    try {
      const r = up
        ? await api.visitorRegister({ name: f.name.trim(), email: f.email.trim(), password: f.password })
        : await api.visitorLogin(f.email.trim(), f.password);
      onDone(r, rem);
    } catch (ex) {
      setErr(ex.status === 0 ? ex.message : ex.message || T('ما زبط، جرّب مرة ثانية', 'Something went wrong, try again'));
    }
    setBusy(false);
  };

  return (
    <div className="login"><BgCanvas cardSelector=".lcard" />
      <div className="login-top"><LangSeg /></div>
      <button className="login-back" onClick={() => setPage('welcome')}><Icon n="arrow" s={16} />{T('رجوع', 'Back')}</button>
      <form className="lcard" autoComplete="on" noValidate onSubmit={submit}>
        <div className="l-logo"><Logo s={96} /></div>
        <div className="brand"><div><b>{T('إكسبو الزوار', 'Expo Visitors')}</b><small>RIFD · EXPO 2030 RIYADH</small></div></div>
        <h1>{up ? T('سوّ حسابك وبلّغ عن أي مشكلة تواجهك في إكسبو', 'Create your account and report any problem at Expo')
          : T('سجّل دخولك وبلّغ عن أي مشكلة تواجهك في إكسبو', 'Sign in and report any problem at Expo')}</h1>
        {up && <div className="field"><label htmlFor="vn">{T('الاسم', 'Name')}</label>
          <input id="vn" type="text" autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} /></div>}
        <div className="field"><label htmlFor="ve">{T('البريد الإلكتروني', 'Email')}</label>
          <input id="ve" type="email" autoComplete="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="name@example.com" dir="ltr" /></div>
        <div className="field"><label htmlFor="vp">{T('كلمة المرور', 'Password')}</label>
          <div className="pw-wrap"><input id="vp" type={show ? 'text' : 'password'} autoComplete={up ? 'new-password' : 'current-password'} value={f.password} onChange={e => set('password', e.target.value)} dir="ltr" />
            <button type="button" className="pw-eye" onClick={() => setShow(s => !s)} aria-label={show ? T('إخفاء كلمة المرور', 'Hide password') : T('إظهار كلمة المرور', 'Show password')}><Icon n={show ? 'eye' : 'eyeOff'} s={19} /></button></div></div>
        <div className="lrow"><label className="chk"><input type="checkbox" checked={rem} onChange={e => setRem(e.target.checked)} /><span>{T('تذكرني', 'Remember me')}</span></label>
          {!up && <button type="button" className="vlink" style={{ margin: 0 }} onClick={() => setInfo(T('لاستعادة كلمة المرور تواصل مع مكتب خدمة الزوار في الموقع', 'To recover your password, contact the visitor help desk on site'))}>{T('نسيت كلمة المرور؟', 'Forgot password?')}</button>}</div>
        {info ? <p className="vwait">{info}</p> : null}
        {err ? <p className="form-err">{err}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ height: 48, fontSize: 15 }}>{busy
          ? T('لحظة…', 'One moment…')
          : up ? T('إنشاء حساب', 'Create account') : T('تسجيل الدخول', 'Sign in')}</button>
        <p style={{ textAlign: 'center', margin: 0 }}>{up ? T('عندك حساب؟', 'Have an account?') : T('ما عندك حساب؟', 'No account yet?')}{' '}
          <button type="button" className="vlink" style={{ margin: 0 }} onClick={swap}>{up ? T('سجّل دخولك', 'Sign in') : T('سوّ حساب', 'Sign up')}</button></p>
      </form>
    </div>
  );
}
