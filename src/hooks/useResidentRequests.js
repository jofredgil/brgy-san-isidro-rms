// src/hooks/useResidentRequests.js
// ─────────────────────────────────────────────────────────────────────────────
// Real-time listener scoped to a single resident's requests.
// A resident will typically have < 20 requests lifetime, so the read cost
// is negligible and the live status updates are valuable UX.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';

/**
 * @param {import('firebase/firestore').CollectionReference} requestsColRef
 * @param {string | null} residentId   Firebase UID of the logged-in resident.
 */
export function useResidentRequests(requestsColRef, residentId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!residentId || !requestsColRef) {
      setLoading(false);
      return;
    }
    const q = query(
      requestsColRef,
      where('residentId', '==', residentId),
      orderBy('dateRequested', 'desc')
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => {
        console.error('[useResidentRequests] error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [requestsColRef, residentId]);

  return { requests, loading };
}