"use client";

import type { ReactNode } from 'react';
import { StampsProvider as Provider } from '../lib/useStamps';

export default function StampsProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}
