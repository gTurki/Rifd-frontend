import { useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext.jsx';
import { Side, Top, Toasts, Modal } from './components/Shell.jsx';
import { Overview, MapPage, Incidents, Inbox, Dispatch } from './pages/Control.jsx';
import { IncidentPage } from './pages/Incident.jsx';
import { StaffAdmin, Access, Analytics, Sources, Settings, Profile } from './pages/Admin.jsx';
import { MyTasks, Report } from './pages/Field.jsx';
import { Welcome, Login } from './pages/Public.jsx';
import { Visitor } from './pages/Visitor.jsx';

const PAGES = {
  overview: Overview, map: MapPage, incidents: Incidents, incident: IncidentPage, inbox: Inbox, dispatch: Dispatch,
  staffadmin: StaffAdmin, access: Access, analytics: Analytics, sources: Sources, settings: Settings, profile: Profile,
  mytasks: MyTasks, report: Report,
};

function Root() {
  const { auth, page, setPage, isField, isSup, mapFull, setMapFull, setSel } = useApp();

  useEffect(() => {
    const h = e => {
      if (e.key !== 'Escape') return;
      if (mapFull) setMapFull(false); else setSel(null);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mapFull, setMapFull, setSel]);

  // signed in but sitting on a public page -> the role's home page
  useEffect(() => {
    if (auth && (page === 'welcome' || page === 'login')) setPage(isField ? 'mytasks' : 'overview');
  }, [auth, page, isField, setPage]);

  if (page === 'visitor') return <Visitor />;
  if (!auth) return page === 'login' ? <Login /> : <Welcome />;

  let key = page;
  if (isField && !['mytasks', 'map', 'report', 'settings', 'profile'].includes(key)) key = 'mytasks';
  if (!isField && (key === 'mytasks' || key === 'report')) key = 'overview';
  if (key === 'staffadmin' && !isSup) key = 'overview';
  const P = PAGES[key] || (isField ? MyTasks : Overview);
  return (
    <div className="app"><Side /><div className="main"><Top /><main className="content" id="content"><P /></main></div></div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div id="app"><Root /></div>
      <Modal />
      <Toasts />
    </AppProvider>
  );
}
