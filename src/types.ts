export type TabId = 'events' | 'casino' | 'mybets' | 'leaderboard' | 'compliance';

export type EventStatus = 'En cours' | 'À venir' | 'Terminés';

export interface MarketOption {
  id: string;
  label: string;
  shortLabel?: string;
  odd: number;
}

export interface MarketLine {
  marketId: string;
  marketName: string;
  lineLabel: string | null;
  quickTag?: string;
  options: MarketOption[];
}

export interface MarketGroup {
  id: string;
  category: string;
  title: string;
  quickTag?: string;
  lines: MarketLine[];
}

export interface SportEvent {
  id: string;
  category: string;
  region: string;
  competition: string;
  title: string;
  schedule: string;
  status: EventStatus;
  scoreInfo: string;
  marketGroups: MarketGroup[];
  analysis: string;
}

export interface TicketSelection {
  key: string;
  eventId: string;
  marketId: string;
  optionId: string;
  eventTitle: string;
  competition: string;
  marketName: string;
  label: string;
  odd: number;
  stake: string;
}

export interface BetLeg {
  eventTitle: string;
  marketName: string;
  optionLabel: string;
  odd: number;
}

export interface SportBet {
  id: string;
  type: 'single' | 'combo';
  eventId?: string;
  eventTitle?: string;
  competition?: string;
  marketName?: string;
  optionLabel?: string;
  legs?: BetLeg[];
  odd: number;
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: number;
  settledAt: number | null;
}

export interface CasinoPlay {
  id: string;
  game: string;
  detail: string;
  stake: number;
  payout: number;
  mult: number;
  ts: number;
}

export interface BalancePoint {
  label: string;
  balance: number;
}

export interface WagerLogEntry {
  amount: number;
  ts: number;
}

export type KycStatus = 'unverified' | 'pending' | 'verified';

export interface ComplianceState {
  kycStatus: KycStatus;
  docType: string;
  docNumber: string;
  ageConfirmed: boolean;
  dailyLimit: number;
  weeklyLimit: number;
  coolOffUntil: number | null;
  selfExcluded: boolean;
  wagerLog: WagerLogEntry[];
}

export interface AppState {
  balance: number;
  bets: SportBet[];
  balanceHistory: BalancePoint[];
  casinoHistory: CasinoPlay[];
  crashHistory: number[];
  compliance: ComplianceState;
}

export interface FakePlayer {
  name: string;
  avatar: string;
  specialty: string;
  winRate: string;
  balance: number;
  isYou?: boolean;
}
