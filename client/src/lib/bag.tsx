import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BagLine = { productId: number; quantity: number };

type Bag = {
  lines: BagLine[];
  count: number;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  has: (productId: number) => boolean;
};

const Ctx = createContext<Bag | null>(null);
const KEY = "md_bag";

function load(): BagLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => Number.isInteger(l?.productId) && Number.isInteger(l?.quantity) && l.quantity > 0)
      .map((l) => ({ productId: l.productId, quantity: Math.min(l.quantity, 20) }));
  } catch {
    return [];
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BagLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* private mode: the bag lives for this visit only */
    }
  }, [lines]);

  // Keep several open tabs in agreement.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLines(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((productId: number, quantity = 1) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.productId === productId);
      if (hit) return prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(l.quantity + quantity, 20) } : l));
      return [...prev, { productId, quantity }];
    });
  }, []);
  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.productId !== productId) : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    );
  }, []);
  const remove = useCallback((productId: number) => setLines((prev) => prev.filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Bag>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      has: (id) => lines.some((l) => l.productId === id),
    }),
    [lines, add, setQuantity, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBag() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBag must be used inside BagProvider");
  return v;
}

const CHECKOUT_KEY = "md_checkout";
export const pendingCheckout = {
  get: () => {
    try {
      return localStorage.getItem(CHECKOUT_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(CHECKOUT_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(CHECKOUT_KEY);
    } catch {
      /* ignore */
    }
  },
};
