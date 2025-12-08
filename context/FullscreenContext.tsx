import React, { createContext, useCallback, useContext, useState } from "react";

type FullscreenContextValue = {
  isFullscreen: boolean;
  setFullscreen: (v: boolean) => void;
};

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

export function FullscreenProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setFullscreen = useCallback((v: boolean) => {
    setIsFullscreen(Boolean(v));
  }, []);

  return (
    <FullscreenContext.Provider value={{ isFullscreen, setFullscreen }}>
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  const ctx = useContext(FullscreenContext);
  if (!ctx) {
    throw new Error("useFullscreen must be used within a FullscreenProvider");
  }
  return ctx;
}

export default FullscreenContext;
