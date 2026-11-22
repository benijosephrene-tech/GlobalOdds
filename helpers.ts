import {EVENTS, FAKE_PLAYERS, INITIAL_BALANCE, STORAGE_KEY, UNIT} from '../data/events';
import {AppState, MarketLine, MarketOption, SportEvent} from '../types';

export function defaultState(): AppState {
  return {
    balance: INITIAL_BALANCE,
    bets: [],
    balanceHistory: [{label: 'Départ', balance: INITIAL_BALANCE}],
    casinoHistory: [],
    crashHistory: [2.14, 1.32, 4.85, 1.08, 2.76, 1.91],
    compliance: {
      kycStatus: 'unverified',
      docType: 'CIN',
      docNumber: '',
      ageConfirmed: false,
      dailyLimit: 500,
      weeklyLimit: 2000,
      coolOffUntil: null,
      selfExcluded: false,
      wagerLog: [],
    },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      const def = defaultState();
      return {
        ...def,
        ...parsed,
        compliance: {
          ...def.compliance,
          ...(parsed.compliance || {}),
        },
      };
    }
  } catch {
    // Fallback to default state if storage is unavailable or corrupted
  }
  return defaultState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatCredits(val: number): string {
  return `${Math.round(val).toLocaleString('fr-FR')} ${UNIT}`;
}

export function getDailyWagered(state: AppState): number {
  const dayAgo = Date.now() - 86400000;
  return state.compliance.wagerLog
    .filter((w) => w.ts >= dayAgo)
    .reduce((sum, w) => sum + w.amount, 0);
}

export function getWeeklyWagered(state: AppState): number {
  const weekAgo = Date.now() - 7 * 86400000;
  return state.compliance.wagerLog
    .filter((w) => w.ts >= weekAgo)
    .reduce((sum, w) => sum + w.amount, 0);
}

export function isCoolOffActive(state: AppState): boolean {
  return Boolean(state.compliance.coolOffUntil && Date.now() < state.compliance.coolOffUntil);
}

export function checkComplianceForWager(state: AppState, amount: number): string | null {
  if (state.compliance.selfExcluded) {
    return 'Action bloquée : auto-exclusion active dans Compte & Conformité.';
  }
  if (isCoolOffActive(state) && state.compliance.coolOffUntil) {
    const mins = Math.max(1, Math.ceil((state.compliance.coolOffUntil - Date.now()) / 60000));
    return `Action bloquée : pause temporaire active (~${mins} min restantes).`;
  }
  const dailyUsed = getDailyWagered(state);
  if (dailyUsed + amount > state.compliance.dailyLimit) {
    return `Limite quotidienne dépassée ! Reste autorisé aujourd'hui : ${formatCredits(
      Math.max(0, state.compliance.dailyLimit - dailyUsed),
    )}.`;
  }
  const weeklyUsed = getWeeklyWagered(state);
  if (weeklyUsed + amount > state.compliance.weeklyLimit) {
    return `Limite hebdomadaire dépassée ! Reste autorisé cette semaine : ${formatCredits(
      Math.max(0, state.compliance.weeklyLimit - weeklyUsed),
    )}.`;
  }
  return null;
}

export function getUserRank(balance: number): number {
  return (
    [...FAKE_PLAYERS, {name: 'Vous', avatar: 'YOU', specialty: '', winRate: '', balance, isYou: true}]
      .sort((a, b) => b.balance - a.balance)
      .findIndex((p) => p.isYou) + 1
  );
}

export function countEventMarkets(ev: SportEvent): number {
  let optionsCount = 0;
  ev.marketGroups.forEach((g) => g.lines.forEach((l) => {
    optionsCount += l.options.length;
  }));
  return optionsCount;
}

export function getQuickMarketLine(
  ev: SportEvent,
  selectedQuickMarket: string,
): {line: MarketLine; caption: string} {
  for (const g of ev.marketGroups) {
    if (g.quickTag === selectedQuickMarket && g.lines[0]) {
      return {line: g.lines[0], caption: g.title};
    }
    for (const l of g.lines) {
      if (l.quickTag === selectedQuickMarket) {
        return {line: l, caption: l.marketName};
      }
    }
  }
  const fallbackGroup = ev.marketGroups[0];
  return {line: fallbackGroup.lines[0], caption: fallbackGroup.title};
}

export function findOptionInfo(
  evId: string,
  marketId: string,
  optionId: string,
): {ev: SportEvent; market: MarketLine; opt: MarketOption} | null {
  const ev = EVENTS.find((x) => x.id === evId);
  if (!ev) return null;
  for (const g of ev.marketGroups) {
    for (const l of g.lines) {
      if (l.marketId === marketId) {
        const opt = l.options.find((o) => o.id === optionId);
        if (opt) return {ev, market: l, opt};
      }
    }
  }
  return null;
}
