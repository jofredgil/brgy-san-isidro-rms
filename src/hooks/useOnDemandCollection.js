// src/hooks/useOnDemandCollection.js
// ─────────────────────────────────────────────────────────────────────────────
// One-shot getDocs fetch for collections that are small enough to load fully
// but should not maintain a persistent onSnapshot listener.
//
// Automatically re-fetches when `queryRef` identity changes.
// Call `refresh()` to manually trigger a re-fetch after a mutation.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { getDocs } from 'firebase/firestore';

/**
 * @param {import('firebase/firestore').Query | null} queryRef
 *   Pass null to skip the fetch (useful for conditional queries).
 */
export function useOnDemandCollection(queryRef) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!queryRef) return;
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(queryRef);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[useOnDemandCollection] fetch error:', err);
      setError(err.message ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [queryRef]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { records, loading, error, refresh: fetch };
}