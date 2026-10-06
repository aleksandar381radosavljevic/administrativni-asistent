// lib/hooks/useChecklist.ts
// Hook za čuvanje i praćenje statusa procedure u checklisti
// localStorage key: checklist_{life_event_id}

'use client';

import { useEffect, useState } from 'react';

export type ChecklistStatus = 'todo' | 'in-progress' | 'done';

interface ChecklistState {
  [procedureId: string]: {
    status: ChecklistStatus;
    timestamp: number;
  };
}

interface UseChecklistReturn {
  statuses: Map<string, ChecklistStatus>;
  setStatus: (procedureId: string, status: ChecklistStatus) => void;
  getProgress: (totalProcedures: number) => { completed: number; percentage: number };
  isLoading: boolean;
}

export function useChecklist(lifeEventId: string): UseChecklistReturn {
  const [statuses, setStatuses] = useState<Map<string, ChecklistStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `checklist_${lifeEventId}`;

  // Inicijalno učitavanje iz localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: ChecklistState = JSON.parse(stored);
        const newMap = new Map<string, ChecklistStatus>();
        Object.entries(parsed).forEach(([id, data]) => {
          newMap.set(id, data.status);
        });
        setStatuses(newMap);
      }
    } catch (err) {
      console.error('Greška pri učitavanju checkliste:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Čuvanje u localStorage kada se status promeni
  const setStatus = (procedureId: string, status: ChecklistStatus) => {
    try {
      const newMap = new Map(statuses);
      newMap.set(procedureId, status);
      setStatuses(newMap);

      // Formatuj za localStorage
      const toStore: ChecklistState = {};
      newMap.forEach((status, id) => {
        toStore[id] = {
          status,
          timestamp: Date.now(),
        };
      });

      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (err) {
      console.error('Greška pri čuvanju checkliste:', err);
    }
  };

  // Izračunaj napredak
  const getProgress = (totalProcedures: number) => {
    const completed = Array.from(statuses.values()).filter((s) => s === 'done').length;
    const percentage = totalProcedures > 0 ? Math.round((completed / totalProcedures) * 100) : 0;
    return { completed, percentage };
  };

  return { statuses, setStatus, getProgress, isLoading };
}
