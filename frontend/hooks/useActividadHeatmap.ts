"use client";

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface ActividadDay {
  date:  string; // YYYY-MM-DD
  count: number;
}

export function useActividadHeatmap() {
  const { user } = useAuth();
  const [actividad, setActividad] = useState<ActividadDay[]>([]);
  const [loading,   setLoading]   = useState(true);

  const fetch_ = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/stats/actividad-heatmap');
      if (!res.ok) return;
      const data = await res.json();
      setActividad(data.actividad ?? []);
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { actividad, loading };
}
