import { createContext, useContext } from 'react';
import type { SkillDetailContextValue } from './types';

export const DetailContext = createContext<SkillDetailContextValue | null>(null);

export const useDetailContext = () => {
  const context = useContext(DetailContext);
  if (!context) {
    throw new Error('useDetailContext must be used within DetailContext.Provider');
  }
  return context;
};
