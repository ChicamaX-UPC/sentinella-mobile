import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const COLLAPSE_RANGE = 72;

type Ctx = {
  collapse: number;
  reportScroll: (y: number) => void;
  resetScroll: () => void;
};

const ScrollCollapseContext = createContext<Ctx | null>(null);

export function ScrollCollapseProvider({ children }: { children: ReactNode }) {
  const [scrollY, setScrollY] = useState(0);

  const collapse = Math.min(1, Math.max(0, scrollY / COLLAPSE_RANGE));

  const reportScroll = useCallback((y: number) => {
    setScrollY(Math.max(0, y));
  }, []);

  const resetScroll = useCallback(() => {
    setScrollY(0);
  }, []);

  const value = useMemo(
    () => ({ collapse, reportScroll, resetScroll }),
    [collapse, reportScroll, resetScroll],
  );

  return (
    <ScrollCollapseContext.Provider value={value}>{children}</ScrollCollapseContext.Provider>
  );
}

export function useScrollCollapse() {
  const ctx = useContext(ScrollCollapseContext);
  if (!ctx) {
    throw new Error("useScrollCollapse debe usarse dentro de ScrollCollapseProvider");
  }
  return ctx;
}
