import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have passed without further changes. Handy for search inputs, free-form
 * text fields that drive expensive effects, etc.
 *
 *   const [name, setName] = useState("");
 *   const debouncedName = useDebouncedValue(name, 400);
 *   useEffect(() => saveToServer(debouncedName), [debouncedName]);
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

