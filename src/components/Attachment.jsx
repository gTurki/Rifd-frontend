import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Icon } from './ui.jsx';
import { api } from '../lib/api.js';

// attachments need the token: fetched as a blob and shown in a small viewer
export function AttachmentButton({ alert }) {
  const { T, fail } = useApp();
  const [view, setView] = useState(null);
  const count = (alert.attachmentUrl || '').replace(/^[a-z]+:/, '').split(',').length;
  const open = async index => {
    try { const r = await api.attachmentUrl(alert.id, index); setView(v => { if (v) URL.revokeObjectURL(v.url); return { ...r, index }; }); }
    catch (e) { fail(e); }
  };
  useEffect(() => () => { if (view) URL.revokeObjectURL(view.url); }, [view]);
  return (
    <>
      <button className="link" style={{ fontSize: 12 }} onClick={() => open(0)}><Icon n="camera" s={14} />{T('عرض المرفق', 'View attachment')}{count > 1 ? ` (${count})` : ''}</button>
      {view && (
        <div className="scrim" onClick={() => setView(null)}>
          <div className="modal att-view" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            {view.type.startsWith('image/') ? <img src={view.url} alt="" /> : view.type.startsWith('audio/') || view.type.includes('ogg')
              ? <audio src={view.url} controls autoPlay /> : <a href={view.url} target="_blank" rel="noreferrer">{T('فتح الملف', 'Open file')}</a>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {count > 1 && Array.from({ length: count }, (_, k) => <button key={k} className={'chip' + (view.index === k ? ' on' : '')} onClick={() => open(k)}>{k + 1}</button>)}
              <button className="btn btn-ghost btn-sm" onClick={() => setView(null)}>{T('إغلاق', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}