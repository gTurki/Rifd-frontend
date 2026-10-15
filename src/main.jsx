import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LOGO } from './lib/svg.js';
import './styles.css';
import './extra.css';

// tab icon drawn from the same vector logo (as in the design)
try {
  const svg = LOGO(64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/svg+xml';
  l.href = 'data:image/svg+xml,' + encodeURIComponent(svg); document.head.appendChild(l);
} catch (e) { /* */ }

createRoot(document.getElementById('root')).render(<App />);
