// src/hooks/useInitialSnapshot.js
// ─────────────────────────────────────────────────────────────────────────────
// Scoped real-time listener for a SINGLE document.
// Used exclusively for the current user's own profile doc so that status
// changes made by the admin (e.g. accountStatus: 'Inactive') are reflected
// in the UI immediately without requiring a page refresh.
//
// Cost: 1 persistent listener = 1 read on mount + 1 read per server change.
// Acceptable because it is scoped to exactly one document.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';

/**
 * @param {import('firebase/firestore').DocumentReference | null} docRef
 */
export function useSingleDocSnapshot(docRef) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      docRef,
      snap => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      err => {
        console.error('[useSingleDocSnapshot] error:', err);
        setError(err.message ?? 'Listener error.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [docRef]);

  return { data, loading, error };
}