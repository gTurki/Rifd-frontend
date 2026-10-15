import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon, Logo } from '../components/ui.jsx';
import { BgCanvas, LangSeg } from '../components/Shell.jsx';

// seed accounts (DataSeeder): all use demo123
const DEMO_ACCOUNTS = [['operator1', ['مشغّل', 'Operator']], ['supervisor1', ['مشرف', 'Supervisor']], ['C-101', ['موظف ميداني · حشود', 'Field · crowd']], ['T-101', ['موظف ميداني · فني', 'Field · technician']]];
const DEMO_PASS = 'demo123';

export function Welcome() {
  const { T, setPage } = useApp();
  return (
    <div className="login"><BgCanvas cardSelector=".wcard" />
      <div className="login-top"><LangSeg /></div>
      <div className="wcard">
        <div className="l-logo"><Logo s={88} /></div>
        <h1>{T('أهلًا بك في رِفد', 'Welcome to RIFD')}</h1>
        <p className="wsub">{T('منصة إدارة العمليات لمعرض إكسبو 2030', 'The operations management platform for Expo 2030')}</p>
        <div className="wopts">
          <button className="wopt vis" onClick={() => setPage('visitor')}><span className="wico"><Icon n="users" s={28} /></span>
            <span><b>{T('إكسبو الزوار', 'Expo Visitors')}</b><small>{T('أبلغ عن مشكلة', 'Report an issue')}</small></span>
            <span className="wgo">{T('دخول', 'Enter')}<Icon n="arrow" s={16} flip /></span></button>
          <button className="wopt" onClick={() => setPage('login')}><span className="wico"><Icon n="briefcase" s={28} /></span>
            <span><b>{T('إكسبو الأعمال', 'Expo Business')}</b><small>{T('مركز العمليات الموحد', 'Unified operations center')}</small></span>
            <span className="wgo">{T('دخول', 'Enter')}<Icon n="arrow" s={16} flip /></span></button>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { T, L, setPage, login } = useApp();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [rem, setRem] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!u.trim() || !p) { setErr(T('اكتب اسم المستخدم وكلمة المرور', 'Enter your username and password')); return; }
    setBusy(true); setErr('');
    try { await login(u, p, rem); } catch (ex) {
      setErr(ex.status === 0 ? ex.message : T('اسم المستخدم أو كلمة المرور غير صحيحة', 'Incorrect username or password'));
    }
    setBusy(false);
  };
  return (
    <div className="login"><BgCanvas cardSelector=".lcard" />
      <div className="login-top"><LangSeg /></div>
      <button className="login-back" onClick={() => setPage('welcome')}><Icon n="arrow" s={16} />{T('رجوع', 'Back')}</button>
      <form className="lcard" autoComplete="off" onSubmit={submit}>
        <div className="l-logo"><Logo s={96} /></div>
        <div className="brand"><div><b>{T('إكسبو الأعمال', 'Expo Business')}</b><small>RIFD · EXPO 2030 RIYADH</small></div></div>
        <h1>{T('منصة موحدة لمركز عمليات إكسبو 2030', 'One platform for the Expo 2030 operations center')}</h1>
        <div className="field"><label htmlFor="em">{T('اسم المستخدم', 'Username')}</label>
          <div className={'em-wrap' + (picked ? ' done' : '')} onMouseLeave={() => setPicked(false)}>
            <input id="em" type="text" value={u} onChange={e => { setU(e.target.value); setErr(''); }} placeholder="operator1" dir="ltr" />
            <div className="em-sug" role="listbox">{DEMO_ACCOUNTS.map(([acc, n]) => (
              <button type="button" key={acc} className="em-opt" onClick={() => { setU(acc); setP(DEMO_PASS); setErr(''); setPicked(true); if (document.activeElement) document.activeElement.blur(); }}>
                <b dir="ltr">{acc}</b> <small className="muted">{L(n)}</small></button>))}</div>
          </div></div>
        <div className="field"><label htmlFor="pw">{T('كلمة المرور', 'Password')}</label>
          <div className="pw-wrap"><input id="pw" type={show ? 'text' : 'password'} value={p} onChange={e => { setP(e.target.value); setErr(''); }} dir="ltr" />
            <button type="button" className="pw-eye" onClick={() => setShow(s => !s)} aria-label={show ? T('إخفاء كلمة المرور', 'Hide password') : T('إظهار كلمة المرور', 'Show password')}><Icon n={show ? 'eye' : 'eyeOff'} s={19} /></button></div></div>
        <div className="lrow"><label className="chk"><input type="checkbox" checked={rem} onChange={e => setRem(e.target.checked)} /><span>{T('تذكرني', 'Remember me')}</span></label>
          <span>{T('نسيت كلمة المرور؟ راجع المشرف', 'Forgot it? Ask your supervisor')}</span></div>
        {err ? <p className="form-err">{err}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ height: 48, fontSize: 15 }}>{busy ? T('جاري الدخول…', 'Signing in…') : T('تسجيل الدخول', 'Sign in')}</button>
      </form>
    </div>
  );
}
