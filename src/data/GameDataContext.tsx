import React, { createContext, useContext, useMemo } from 'react';
import { DSP_ITEMS, type DSPItem } from './dspData';

const GameItemsContext = createContext<Record<string, DSPItem>>(DSP_ITEMS);
export function GameDataProvider({ items, children }: { items: Record<string, DSPItem>; children: React.ReactNode }) {
  const merged = useMemo(() => ({ ...DSP_ITEMS, ...items }), [items]);
  return <GameItemsContext.Provider value={merged}>{children}</GameItemsContext.Provider>;
}
export function useDSPItems() { return useContext(GameItemsContext); }
