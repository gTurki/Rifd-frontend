// Live updates: STOMP over the backend's plain WebSocket endpoint /ws (no SockJS).
// Every message is { type, payload, timestamp } (WsMessage).
import { Client } from '@stomp/stompjs';
import { API_URL } from './api.js';

export const TOPICS = ['/topic/incidents', '/topic/alerts', '/topic/stats', '/topic/recommendations',
  '/topic/tasks', '/topic/staff', '/topic/routes', '/topic/notifications'];

export function connectLive(onMessage, onStatus) {
  const client = new Client({
    brokerURL: API_URL.replace(/^http/, 'ws') + '/ws',
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });
  client.onConnect = () => {
    onStatus && onStatus(true);
    TOPICS.forEach(topic => client.subscribe(topic, frame => {
      try { const m = JSON.parse(frame.body); onMessage(topic, m.type, m.payload); } catch (e) { /* ignore bad frame */ }
    }));
  };
  client.onWebSocketClose = () => onStatus && onStatus(false);
  client.onStompError = () => onStatus && onStatus(false);
  client.activate();
  return () => client.deactivate();
}
