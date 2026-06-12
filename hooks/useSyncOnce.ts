import { useEffect, useRef } from "react";

/**
 * Runs `sync` exactly once — the first render at which `data` becomes
 * defined (non-null/undefined).
 *
 * Replaces the repeated "useRef flag + useEffect" boilerplate used across
 * edit forms to copy server data into local form state a single time,
 * without re-clobbering the user's subsequent edits when the query
 * refetches.
 *
 *   useSyncOnce(property, (p) => {
 *     setName(p.name);
 *     setType(p.type);
 *   });
 */
export function useSyncOnce<T>(
  data: T | null | undefined,
  sync: (data: T) => void,
): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || data == null) return;
    sync(data);
    done.current = true;
    // `sync` is intentionally excluded: it's called once and callers
    // typically pass an inline closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}

