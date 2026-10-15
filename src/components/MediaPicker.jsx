import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon } from './ui.jsx';
import { canRecord, startRecording, MAX_SECONDS } from '../lib/recorder.js';

export const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EDGE = 1600;

export const emptyMedia = () => ({ photos: [], audio: null });
export const hasMedia = m => !!(m && (m.photos.length || m.audio));

const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function shrink(file) {
  try {
    const bmp = window.createImageBitmap ? await createImageBitmap(file) : await new Promise((res, rej) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = e => { URL.revokeObjectURL(u); rej(e); }; img.src = u;
    });
    const w = bmp.width, h = bmp.height, k = Math.min(1, EDGE / Math.max(w, h));
    if (k === 1 && file.size <= 1.5 * 1024 * 1024) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) return file;
    const name = (file.name || 'photo').replace(/\.[a-z0-9]+$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (e) {
    return file;
  }
}

export function MediaPicker({ value, onChange, disabled }) {
  const { T } = useApp();
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const alive = useRef(true);
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState('');
  const [thumbs, setThumbs] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const { photos, audio } = value;

  useEffect(() => () => { alive.current = false; if (recRef.current) recRef.current.cancel(); }, []);
  useEffect(() => {
    const urls = photos.map(p => URL.createObjectURL(p));
    setThumbs(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [photos]);
  useEffect(() => {
    if (!audio) { setAudioUrl(null); return undefined; }
    const u = URL.createObjectURL(audio.blob);
    setAudioUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [audio]);

  const addPhotos = async list => {
    setErr('');
    const files = Array.from(list || []);
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setErr(T(`الحد ${MAX_PHOTOS} صور`, `Up to ${MAX_PHOTOS} photos`));
    const ok = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      if (!TYPES.includes(f.type)) { setErr(T('الصور المقبولة: JPG أو PNG أو WEBP', 'Photos must be JPG, PNG or WEBP')); continue; }
      const s = await shrink(f);
      if (s.size > MAX_BYTES) { setErr(T('حجم الصورة أكبر من 5MB', 'Photo is larger than 5 MB')); continue; }
      ok.push(s);
    }
    if (ok.length && alive.current) onChange(m => ({ ...m, photos: [...m.photos, ...ok].slice(0, MAX_PHOTOS) }));
  };
  const removePhoto = k => { setErr(''); onChange(m => ({ ...m, photos: m.photos.filter((_, i) => i !== k) })); };

  const record = async () => {
    setErr('');
    try {
      setRec({ s: 0 });
      recRef.current = await startRecording({
        onTick: s => { if (alive.current) setRec(r => (r && r !== 'busy' ? { s } : r)); },
        onDone: a => { recRef.current = null; if (!alive.current) return; setRec(null); onChange(m => ({ ...m, audio: a })); },
        onError: e => {
          recRef.current = null; if (!alive.current) return; setRec(null);
          setErr(e.code === 'empty' ? T('التسجيل قصير جدًا، جرّب مرة ثانية', 'Too short, try again') : T('تعذّر تجهيز التسجيل، جرّب مرة ثانية', 'Could not process the recording, try again'));
        },
      });
    } catch (e) {
      setRec(null);
      setErr(e.code === 'denied' ? T('اسمح للمتصفح باستخدام المايكروفون ثم جرّب مرة ثانية', 'Allow microphone access, then try again')
        : T('ما لقينا مايكروفون في هذا الجهاز', 'No microphone found on this device'));
    }
  };
  const stop = () => { if (recRef.current) { setRec('busy'); recRef.current.stop(); } };
  const cancelRec = () => { if (recRef.current) recRef.current.cancel(); recRef.current = null; setRec(null); };

  const recording = rec && rec !== 'busy';
  return (
    <div className="media">
      <div className="media-acts">
        {photos.length < MAX_PHOTOS && (
          <button type="button" className="vphoto" disabled={disabled} onClick={() => fileRef.current && fileRef.current.click()}>
            <Icon n="camera" s={18} />{photos.length ? T('إضافة صورة', 'Add photo') : T('إرفاق صور', 'Attach photos')}
            <small className="mono">{photos.length}/{MAX_PHOTOS}</small></button>)}
        {!audio && !rec && canRecord() && (
          <button type="button" className="vphoto" disabled={disabled} onClick={record}><Icon n="mic" s={18} />{T('تسجيل صوتي', 'Voice note')}</button>)}
        {recording && (
          <div className="media-rec" role="status">
            <i className="live-dot" /><span className="mono">{mmss(rec.s)} / {mmss(MAX_SECONDS)}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={stop}><Icon n="stop" s={15} />{T('إيقاف', 'Stop')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelRec}>{T('إلغاء', 'Cancel')}</button>
          </div>)}
        {rec === 'busy' && <div className="media-rec"><span className="muted">{T('جاري تجهيز التسجيل...', 'Preparing the recording...')}</span></div>}
      </div>
      <input ref={fileRef} type="file" hidden multiple accept={TYPES.join(',')}
        onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />

      {photos.length ? (
        <div className="media-thumbs">{photos.map((p, k) => (
          <div className="media-thumb" key={k + p.name + p.size}>
            {thumbs[k] ? <img src={thumbs[k]} alt="" /> : null}
            <button type="button" aria-label={T('حذف الصورة', 'Remove photo')} disabled={disabled} onClick={() => removePhoto(k)}><Icon n="x" s={14} /></button>
          </div>))}</div>) : null}

      {audio && audioUrl ? (
        <div className="media-audio">
          <Icon n="mic" s={18} /><audio src={audioUrl} controls preload="metadata" /><span className="mono faint">{mmss(audio.seconds)}</span>
          <button type="button" className="btn btn-ghost btn-sm" aria-label={T('حذف التسجيل', 'Delete recording')} disabled={disabled}
            onClick={() => { setErr(''); onChange(m => ({ ...m, audio: null })); }}><Icon n="trash" s={15} /></button>
        </div>) : null}

      {err ? <p className="form-err">{err}</p> : null}
      <small className="media-hint">{T(`حتى ${MAX_PHOTOS} صور وتسجيل صوتي (دقيقة). نحللها تلقائيًا ونضيفها لبلاغك.`, `Up to ${MAX_PHOTOS} photos and a one-minute voice note. We analyze them and add them to your report.`)}</small>
    </div>
  );
}