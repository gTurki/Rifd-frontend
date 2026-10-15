import { Icon } from './ui.jsx';
import { hm } from '../lib/labels.js';

// ---------------- activity log line ----------------
export function LogI({ l }) {
  const kind = l.entityType === 'ROUTE' || l.entityType === 'ASSET' ? 'acc' : l.actorType === 'AI' ? 'ai' : l.actorType === 'HUMAN' ? (l.entityType === 'TASK' ? 'staff' : 'op') : 'sys';
  const icn = { ai: 'spark', op: 'user', staff: 'badge', acc: 'access', sys: 'check' }[kind];
  const text = l.details || [l.action, l.entityType, l.newValue].filter(Boolean).join(' · ');
  return <div className="log-i"><time>{hm(l.timestamp)}</time><span className={'li ' + kind}><Icon n={icn} s={13} /></span><span>{text}</span></div>;
}

