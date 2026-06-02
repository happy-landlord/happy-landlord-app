import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

// ── Modal state ──────────────────────────────────────────────────────────────
// Discriminated union: at most one keyset-action modal is ever open. Each
// variant carries the data it needs (e.g. duration in days) so there are
// no orphan state slots like "checkoutDays when no checkout modal is open".

export type KeySetModalState =
  | { kind: "none" }
  | { kind: "checkout"; days: number }
  | { kind: "extend"; days: number }
  | { kind: "return" }
  | { kind: "transfer" }
  | { kind: "reportLost" }
  | { kind: "reserve" }
  | { kind: "editKeys" };

export type KeySetModalKind = KeySetModalState["kind"];

type Action =
  | { type: "open"; state: KeySetModalState }
  | { type: "close" }
  | { type: "setDays"; days: number };

function reducer(state: KeySetModalState, action: Action): KeySetModalState {
  switch (action.type) {
    case "open":
      return action.state;
    case "close":
      return { kind: "none" };
    case "setDays":
      if (state.kind === "checkout" || state.kind === "extend") {
        return { ...state, days: action.days };
      }
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

type KeySetScreenContextValue = {
  /** Route param `id` — single source of truth for which keyset is on screen. */
  keySetId: string;
  modal: KeySetModalState;
  openModal: (state: KeySetModalState) => void;
  closeModal: () => void;
  setModalDays: (days: number) => void;
};

const KeySetScreenContext = createContext<KeySetScreenContextValue | null>(
  null,
);

export function KeySetScreenProvider({
  keySetId,
  children,
}: {
  keySetId: string;
  children: ReactNode;
}) {
  const [modal, dispatch] = useReducer(reducer, { kind: "none" });

  const openModal = useCallback(
    (state: KeySetModalState) => dispatch({ type: "open", state }),
    [],
  );
  const closeModal = useCallback(() => dispatch({ type: "close" }), []);
  const setModalDays = useCallback(
    (days: number) => dispatch({ type: "setDays", days }),
    [],
  );

  const value = useMemo<KeySetScreenContextValue>(
    () => ({ keySetId, modal, openModal, closeModal, setModalDays }),
    [keySetId, modal, openModal, closeModal, setModalDays],
  );

  return (
    <KeySetScreenContext.Provider value={value}>
      {children}
    </KeySetScreenContext.Provider>
  );
}

export function useKeySetScreen(): KeySetScreenContextValue {
  const ctx = useContext(KeySetScreenContext);
  if (!ctx) {
    throw new Error(
      "useKeySetScreen must be used inside <KeySetScreenProvider>",
    );
  }
  return ctx;
}

