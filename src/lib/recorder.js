// Voice note: MediaRecorder -> decodeAudioData -> OfflineAudioContext (16 kHz mono) -> 16-bit WAV (decision 152).
// The microphone needs localhost or HTTPS.

export const MAX_SECONDS = 60;
const RATE = 16000;

export const canRecord = () =>
  typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

const pickMime = () => {
  const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
  if (!window.MediaRecorder.isTypeSupported) return '';
  return list.find(t => window.MediaRecorder.isTypeSupported(t)) || '';
};

export async function startRecording({ onTick, onDone, onError, maxSeconds = MAX_SECONDS }) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const err = new Error(e && e.message ? e.message : 'mic');
    err.code = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'nomic';
    throw err;
  }
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  let cancelled = false;
  const t0 = Date.now();
  const elapsed = () => Math.min(maxSeconds, (Date.now() - t0) / 1000);

  const timer = setInterval(() => {
    const s = elapsed();
    if (onTick) onTick(s);
    if (s >= maxSeconds && rec.state === 'recording') rec.stop();
  }, 250);
  const release = () => { clearInterval(timer); stream.getTracks().forEach(t => t.stop()); };

  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = async () => {
    const seconds = Math.round(elapsed());
    release();
    if (cancelled) return;
    if (!chunks.length) { const err = new Error('empty'); err.code = 'empty'; if (onError) onError(err); return; }
    try {
      const raw = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      const blob = await toWav(raw);
      if (onDone) onDone({ blob, seconds: Math.max(1, seconds) });
    } catch (e) {
      const err = new Error(e && e.message ? e.message : 'convert'); err.code = 'convert';
      if (onError) onError(err);
    }
  };
  rec.start(500);

  return {
    stop: () => { if (rec.state !== 'inactive') rec.stop(); },
    cancel: () => { cancelled = true; if (rec.state !== 'inactive') rec.stop(); else release(); },
  };
}

export async function toWav(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let decoded;
  try {
    const buf = await blob.arrayBuffer();
    decoded = await new Promise((res, rej) => {
      const p = ctx.decodeAudioData(buf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  } finally {
    if (ctx.close) ctx.close().catch(() => {});
  }
  let rendered;
  try {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(1, Math.max(1, Math.ceil(decoded.duration * RATE)), RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start(0);
    rendered = await off.startRendering();
  } catch (e) {
    rendered = null;
  }
  if (rendered) return encodeWav(rendered.getChannelData(0), RATE);
  const n = decoded.length, ch = decoded.numberOfChannels, mono = new Float32Array(n);
  for (let c = 0; c < ch; c++) { const d = decoded.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
  return encodeWav(mono, decoded.sampleRate);
}

function encodeWav(samples, rate) {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, samples.length * 2, true);
  for (let i = 0, o = 44; i < samples.length; i++, o += 2) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}