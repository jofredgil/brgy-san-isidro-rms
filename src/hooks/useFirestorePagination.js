// src/hooks/useFirestorePagination.js
// ─────────────────────────────────────────────────────────────────────────────
// Generic cursor-based pagination hook for Firestore.
//
// Strategy:
//   • Uses getDocs (one-shot fetch) instead of onSnapshot to avoid
//     persistent read streams that exhaust the 50,000/day free-tier limit.
//   • Keeps a stack of "cursors" (last document snapshots) so the user
//     can page forward AND backward without re-fetching earlier pages.
//   • Each page fetch costs exactly PAGE_SIZE reads — no over-fetching.
//
// Usage:
//   const {
//     records,        // current page data array
//     loading,        // boolean
//     error,          // string | null
//     page,           // current page number (1-based)
//     hasNext,        // boolean — show "Next" button?
//     hasPrev,        // boolean — show "Prev" button?
//     fetchNext,      // () => void
//     fetchPrev,      // () => void
//     refresh,        // () => void — re-fetches page 1
//     totalFetched,   // number of records retrieved so far (informational)
//   } = useFirestorePagination(baseQuery, PAGE_SIZE);
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDocs,
  query,
  limit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';

/**
 * @param {import('firebase/firestore').Query} baseQuery
 *   A Firestore Query object (collection ref + any where/orderBy clauses).
 *   Do NOT add limit() — this hook manages that.
 * @param {number} pageSize   Records per page. Defaults to 20.
 */
export function useFirestorePagination(baseQuery, pageSize = 20) {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [page, setPage]                 = useState(1);
  const [hasNext, setHasNext]           = useState(false);
  const [totalCount, setTotalCount]     = useState(null); // from getCountFromServer

  // Cursor stack: index 0 = undefined (start of collection),
  // index N = last doc of page N.
  // We store the raw DocumentSnapshot so startAfter() works correctly.
  const cursorStack = useRef([undefined]); // [undefined, snap1, snap2, ...]

  // ── Internal fetch ────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (cursorSnap) => {
    setLoading(true);
    setError(null);
    try {
      // Build the paginated query
      const paginatedQuery = cursorSnap
        ? query(baseQuery, startAfter(cursorSnap), limit(pageSize + 1))
        : query(baseQuery, limit(pageSize + 1));

      // Fetch pageSize + 1 so we can detect whether a next page exists
      // without a separate count query on every navigation.
      const snap = await getDocs(paginatedQuery);
      const docs = snap.docs;

      const hasMoreAfterThis = docs.length > pageSize;
      const pageData = docs
        .slice(0, pageSize)
        .map(d => ({ id: d.id, ...d.data() }));

      setRecords(pageData);
      setHasNext(hasMoreAfterThis);

      // Return the last doc of this page so the caller can push it to the stack
      return docs[pageSize - 1]; // undefined if fewer than pageSize results
    } catch (err) {
      console.error('[useFirestorePagination] fetchPage error:', err);
      setError(err.message ?? 'Failed to load records.');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [baseQuery, pageSize]);

  // ── Initial load + total count ────────────────────────────────────────────
  useEffect(() => {
    // Reset state whenever the base query changes (e.g. search filter applied)
    cursorStack.current = [undefined];
    setPage(1);
    setHasNext(false);
    setTotalCount(null);

    // Fetch page 1
    fetchPage(undefined).then(lastDoc => {
      // Stack: [undefined, lastDocOfPage1]
      if (lastDoc) {
        cursorStack.current = [undefined, lastDoc];
      }
    });

    // Fetch total count once (costs 1 read regardless of collection size)
    getCountFromServer(baseQuery)
      .then(snap => setTotalCount(snap.data().count))
      .catch(() => setTotalCount(null)); // non-fatal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery]);

  // ── Navigate forward ──────────────────────────────────────────────────────
  const fetchNext = useCallback(async () => {
    if (!hasNext || loading) return;

    const nextPage = page + 1;
    // The cursor for page N is stored at index N-1 in the stack
    const cursor = cursorStack.current[nextPage - 1];

    const lastDoc = await fetchPage(cursor);

    // Push the new cursor onto the stack if not already there
    if (lastDoc && cursorStack.current.length < nextPage + 1) {
      cursorStack.current.push(lastDoc);
    }

    setPage(nextPage);
  }, [hasNext, loading, page, fetchPage]);

  // ── Navigate backward ─────────────────────────────────────────────────────
  const fetchPrev = useCallback(async () => {
    if (page <= 1 || loading) return;

    const prevPage = page - 1;
    // Cursor at index prevPage - 1 in the stack is the start-after for prevPage
    const cursor = cursorStack.current[prevPage - 1];

    await fetchPage(cursor);
    setPage(prevPage);
    setHasNext(true); // we know there's at least 1 page ahead (the one we just came from)
  }, [page, loading, fetchPage]);

  // ── Refresh (go back to page 1) ────────────────────────────────────────────
  const refresh = useCallback(async () => {
    cursorStack.current = [undefined];
    setPage(1);
    setHasNext(false);
    const lastDoc = await fetchPage(undefined);
    if (lastDoc) {
      cursorStack.current = [undefined, lastDoc];
    }
  }, [fetchPage]);

  return {
    records,
    loading,
    error,
    page,
    hasNext,
    hasPrev: page > 1,
    fetchNext,
    fetchPrev,
    refresh,
    totalCount,  // null until loaded; use for "Showing X of Y" display
  };
}