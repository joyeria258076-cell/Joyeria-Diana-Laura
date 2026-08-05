import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { visitaSitioAPI } from '../services/api';

const VISITOR_ID_KEY = 'dl_visitor_id';
const PING_INTERVAL_MS = 4 * 60 * 1000;

const getVisitorId = (): string => {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
};

const VisitorTracker: React.FC = () => {
  const location = useLocation();
  const lastPing = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastPing.current < PING_INTERVAL_MS) return;
    lastPing.current = now;
    visitaSitioAPI.registrar(getVisitorId(), location.pathname).catch(() => { /* silently ignore */ });
  }, [location.pathname]);

  return null;
};

export default VisitorTracker;
