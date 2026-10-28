import { DoorOpen, Droplets, Flame, Hammer, KeyRound, Waves, WashingMachine, Zap, type LucideIcon } from 'lucide-react-native';

import type { Trade } from '@/domain/catalog';

/** One icon per trade, used on tiles, filters and job cards. */
export const TRADE_ICONS: Record<Trade, LucideIcon> = {
  plumbing: Droplets,
  electrical: Zap,
  heating: Flame,
  drains: Waves,
  locksmith: KeyRound,
  handyman: Hammer,
  carpentry: DoorOpen,
  appliances: WashingMachine,
};
