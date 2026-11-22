import React, {useEffect, useRef, useState} from 'react';
import {
  Dices,
  Globe,
  RotateCcw,
  Search,
  Shield,
  Trophy,
  X,
} from 'lucide-react';
import {CasinoView} from './components/CasinoView';
import {ComplianceView} from './components/ComplianceView';
import {LeaderboardView} from './components/LeaderboardView';
import {MyBetsView} from './components/MyBetsView';
import {SportsbookView} from './components/SportsbookView';
import {INITIAL_BALANCE, UNIT} from './data/events';
import {AppState, CasinoPlay, SportBet, TabId, TicketSelection} from './types';
import {
  checkComplianceForWager,
  formatCredits,
  getUserRank,
  isCoolOffActive,
  loadState,
  saveState,
} from './utils/helpers';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<TabId>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2700);
  };

  const appendHistoryAndWager = (
    prev: AppState,
    newBalance: number,
    historyLabel: string,
    wagerAmount?: number,
  ): AppState => {
    const weekAgo = Date.now() - 7 * 86400000;
    const nextWagerLog =
      wagerAmount && wagerAmount > 0
        ? [
            ...prev.compliance.wagerLog.filter((w) => w.ts >= weekAgo),
            {amount: Math.round(wagerAmount), ts: Date.now()},
          ]
        : prev.compliance.wagerLog;

    const nextHistory = [
      ...prev.balanceHistory,
      {label: historyLabel, balance: Math.round(newBalance)},
    ];
    const trimmedHistory =
      nextHistory.length > 35
        ? [nextHistory[0], ...nextHistory.slice(-34)]
        : nextHistory;

    return {
      ...prev,
      balance: newBalance,
      balanceHistory: trimmedHistory,
      compliance: {
        ...prev.compliance,
        wagerLog: nextWagerLog,
      },
    };
  };

  const handleResetBalance = () => {
    setState((prev) => appendHistoryAndWager(prev, INITIAL_BALANCE, 'Réinit.'));
    showToast(`Solde réinitialisé à 1 000 ${UNIT}`);
  };

  const handlePlaceBets = (mode: 'single' | 'combo', globalStake: string) => {
    if (ticketSelections.length === 0) return;

    if (mode === 'single') {
      const validBets = ticketSelections.filter((s) => Math.floor(Number(s.stake)) > 0);
      const totalStake = validBets.reduce((sum, s) => sum + Math.floor(Number(s.stake)), 0);
      if (
        validBets.length === 0 ||
        totalStake > state.balance ||
        checkComplianceForWager(state, totalStake)
      ) {
        return;
      }

      let totalPotential = 0;
      const newBets: SportBet[] = validBets.map((sel) => {
        const stake = Math.floor(Number(sel.stake));
        const potentialWin = Math.round(stake * sel.odd);
        totalPotential += potentialWin;
        return {
          id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'single',
          eventId: sel.eventId,
          eventTitle: sel.eventTitle,
          competition: sel.competition,
          marketName: sel.marketName,
          optionLabel: sel.label,
          odd: sel.odd,
          stake,
          potentialWin,
          status: 'pending',
          createdAt: Date.now(),
          settledAt: null,
        };
      });

      setState((prev) => {
        const nextBal = prev.balance - totalStake;
        const updated = appendHistoryAndWager(prev, nextBal, `-${totalStake} ${UNIT}`, totalStake);
        return {
          ...updated,
          bets: [...newBets, ...updated.bets],
        };
      });

      setTicketSelections([]);
      showToast(
        `${validBets.length} pari${validBets.length > 1 ? 's' : ''} validé${
          validBets.length > 1 ? 's' : ''
        } ! Gain potentiel : ${formatCredits(totalPotential)}`,
      );
    } else {
      const stake = Math.floor(Number(globalStake));
      if (
        ticketSelections.length < 2 ||
        !stake ||
        stake <= 0 ||
        stake > state.balance ||
        checkComplianceForWager(state, stake)
      ) {
        return;
      }

      const totalOdd = Number(
        ticketSelections.reduce((acc, s) => acc * s.odd, 1).toFixed(2),
      );
      const potentialWin = Math.round(stake * totalOdd);

      const newCombo: SportBet = {
        id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'combo',
        legs: ticketSelections.map((s) => ({
          eventTitle: s.eventTitle,
          marketName: s.marketName,
          optionLabel: s.label,
          odd: s.odd,
        })),
        odd: totalOdd,
        stake,
        potentialWin,
        status: 'pending',
        createdAt: Date.now(),
        settledAt: null,
      };

      setState((prev) => {
        const nextBal = prev.balance - stake;
        const updated = appendHistoryAndWager(prev, nextBal, `Combiné -${stake}`, stake);
        return {
          ...updated,
          bets: [newCombo, ...updated.bets],
        };
      });

      setTicketSelections([]);
      showToast(
        `Combiné validé (cote ${totalOdd.toFixed(2)}) ! Gain potentiel : ${formatCredits(
          potentialWin,
        )}`,
      );
    }
  };

  const handleSimulateBet = (betId: string, outcome: 'won' | 'lost') => {
    const targetBet = state.bets.find((b) => b.id === betId);
    if (!targetBet || targetBet.status !== 'pending') return;

    setState((prev) => {
      const bet = prev.bets.find((b) => b.id === betId);
      if (!bet || bet.status !== 'pending') return prev;
      const nextBets = prev.bets.map((b) =>
        b.id === betId ? {...b, status: outcome, settledAt: Date.now()} : b,
      );
      const nextBal = outcome === 'won' ? prev.balance + bet.potentialWin : prev.balance;
      const label = outcome === 'won' ? `+${bet.potentialWin}` : 'Pari perdu';
      const updated = appendHistoryAndWager(prev, nextBal, label);
      return {
        ...updated,
        bets: nextBets,
      };
    });

    if (outcome === 'won') {
      showToast(`Pari gagné ! +${formatCredits(targetBet.potentialWin)} ajoutés au solde.`);
    } else {
      showToast('Pari réglé comme perdu.');
    }
  };

  const handleReserveCasinoStake = (amount: number) => {
    setState((prev) => {
      const weekAgo = Date.now() - 7 * 86400000;
      return {
        ...prev,
        balance: prev.balance - amount,
        compliance: {
          ...prev.compliance,
          wagerLog: [
            ...prev.compliance.wagerLog.filter((w) => w.ts >= weekAgo),
            {amount: Math.round(amount), ts: Date.now()},
          ],
        },
      };
    });
  };

  const handleSettleCasinoReserved = (
    _wagerAmount: number,
    payoutAmount: number,
    historyItem: Omit<CasinoPlay, 'id' | 'ts'>,
    balanceLabel: string,
    extraCrashResult?: number,
    toastMessage?: string,
  ) => {
    setState((prev) => {
      const nextBal = prev.balance + payoutAmount;
      const updated = appendHistoryAndWager(prev, nextBal, balanceLabel);
      const newEntry: CasinoPlay = {
        ...historyItem,
        id: `cas-${Date.now()}`,
        ts: Date.now(),
      };
      return {
        ...updated,
        casinoHistory: [newEntry, ...updated.casinoHistory].slice(0, 25),
        crashHistory:
          extraCrashResult !== undefined
            ? [extraCrashResult, ...updated.crashHistory].slice(0, 14)
            : updated.crashHistory,
      };
    });
    if (toastMessage) showToast(toastMessage);
  };

  const pendingCount = state.bets.filter((b) => b.status === 'pending').length;
  const userRank = getUserRank(state.balance);
  const kycStatus = state.compliance.kycStatus;
  const coolOffActive = isCoolOffActive(state);
  const coolOffHours =
    coolOffActive && state.compliance.coolOffUntil
      ? Math.max(1, Math.ceil((state.compliance.coolOffUntil - Date.now()) / 3600000))
      : 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-sky-500/10 border-b border-sky-400/25 text-sky-200 text-xs text-center py-1.5 px-3">
        Environnement de test & démonstration — Crédits virtuels{' '}
        <strong className="font-bold">DEMO_HTG</strong> sans valeur monétaire. Aucun argent réel
        n’est engagé.
      </div>

      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-[#26334d]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 grid place-items-center text-white shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <span>GlobalOdds</span>
            <span className="text-[11px] font-semibold text-sky-300">Démo</span>
          </div>

          <div className="flex-1 min-w-[220px] max-w-md relative order-3 sm:order-none w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'events') setActiveTab('events');
              }}
              placeholder="Rechercher équipe, compétition, région..."
              aria-label="Rechercher un événement"
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 pl-9 pr-9 py-2 rounded-xl text-sm"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 bg-[#111827] border border-[#26334d] pl-3.5 pr-2 py-1.5 rounded-xl shrink-0">
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold text-slate-400">Crédits démo</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 tabular">
                {formatCredits(state.balance)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetBalance}
              title="Réinitialiser le solde à 1 000 DEMO_HTG"
              className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-300 hover:text-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-5 py-5">
        {(state.compliance.selfExcluded || coolOffActive) && (
          <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
            <div>
              {state.compliance.selfExcluded ? (
                <span>
                  <strong>Auto-exclusion activée (Mode Démo)</strong> — La validation de nouveaux
                  paris et mini-jeux est bloquée.
                </span>
              ) : (
                <span>
                  <strong>Pause temporaire (Cool-off) active</strong> — Nouveaux paris bloqués
                  pendant ~{coolOffHours} h.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('compliance')}
              className="bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Gérer dans Compte & Conformité
            </button>
          </div>
        )}

        <nav
          aria-label="Navigation principale"
          className="flex flex-wrap gap-2 mb-5 pb-3 border-b border-[#26334d]"
        >
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'events'
                ? 'bg-[#161f30] text-slate-100 border-[#36486b]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-100 hover:bg-[#111827]'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Paris Sportifs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('casino')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'casino'
                ? 'bg-[#161f30] text-slate-100 border-[#36486b]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-100 hover:bg-[#111827]'
            }`}
          >
            <Dices className="w-4 h-4 text-sky-400" />
            <span>Casino & Mini-jeux</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mybets')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'mybets'
                ? 'bg-[#161f30] text-slate-100 border-[#36486b]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-100 hover:bg-[#111827]'
            }`}
          >
            <span>Mes paris</span>
            <span className="bg-emerald-500 text-emerald-950 text-xs font-extrabold px-1.5 py-0.5 rounded-md tabular">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboard'
                ? 'bg-[#161f30] text-slate-100 border-[#36486b]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-100 hover:bg-[#111827]'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Classement</span>
            <span className="bg-sky-500/15 text-sky-300 text-xs font-bold px-1.5 py-0.5 rounded-md tabular">
              #{userRank}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'compliance'
                ? 'bg-[#161f30] text-slate-100 border-[#36486b]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-100 hover:bg-[#111827]'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Compte & Conformité</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                kycStatus === 'verified'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : kycStatus === 'pending'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {kycStatus === 'verified'
                ? '18+ Vérifié'
                : kycStatus === 'pending'
                  ? 'En attente'
                  : 'Non vérifié'}
            </span>
          </button>
        </nav>

        {activeTab === 'events' && (
          <SportsbookView
            state={state}
            searchQuery={searchQuery}
            ticketSelections={ticketSelections}
            setTicketSelections={setTicketSelections}
            onPlaceBets={handlePlaceBets}
          />
        )}

        {activeTab === 'casino' && (
          <CasinoView
            state={state}
            onReserveStake={handleReserveCasinoStake}
            onSettleReserved={handleSettleCasinoReserved}
          />
        )}

        {activeTab === 'mybets' && (
          <MyBetsView state={state} onSimulateBet={handleSimulateBet} />
        )}

        {activeTab === 'leaderboard' && <LeaderboardView state={state} />}

        {activeTab === 'compliance' && (
          <ComplianceView
            state={state}
            onSubmitKyc={(docType, docNumber, ageConfirmed) => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  docType,
                  docNumber,
                  ageConfirmed,
                  kycStatus: 'pending',
                },
              }));
              showToast('Dossier KYC démo soumis (En attente).');
            }}
            onSimulateKycStatus={(status) => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  ageConfirmed: status === 'verified',
                  docNumber:
                    status === 'verified' && !prev.compliance.docNumber
                      ? 'DEMO-KYC-VERIFIE'
                      : prev.compliance.docNumber,
                  kycStatus: status,
                },
              }));
              showToast(
                status === 'verified'
                  ? 'Statut KYC passé à Vérifié (18+ Démo).'
                  : 'Statut KYC remis à Non vérifié.',
              );
            }}
            onSaveLimits={(dailyLimit, weeklyLimit) => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  dailyLimit,
                  weeklyLimit,
                },
              }));
              showToast(`Limites enregistrées (${formatCredits(dailyLimit)} / jour).`);
            }}
            onActivateCoolOff={() => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  coolOffUntil: Date.now() + 86400000,
                },
              }));
              showToast('Pause temporaire (cool-off 24h) activée.');
            }}
            onActivateSelfExclude={() => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  selfExcluded: true,
                },
              }));
              showToast('Auto-exclusion démo activée.');
            }}
            onResetRgTest={() => {
              setState((prev) => ({
                ...prev,
                compliance: {
                  ...prev.compliance,
                  coolOffUntil: null,
                  selfExcluded: false,
                  wagerLog: [],
                },
              }));
              showToast('Restrictions et compteurs réinitialisés (Mode Test).');
            }}
          />
        )}
      </main>

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-50 bg-[#0f172a] border border-emerald-500 text-slate-100 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl text-center sm:text-left"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
