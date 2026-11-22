import React, {useEffect, useRef, useState} from 'react';
import {Dices, Rocket, Spade, Cherry} from 'lucide-react';
import {AppState, CasinoPlay} from '../types';
import {checkComplianceForWager, formatCredits} from '../utils/helpers';

interface CasinoViewProps {
  state: AppState;
  onReserveStake: (amount: number) => void;
  onSettleReserved: (
    wagerAmount: number,
    payoutAmount: number,
    historyItem: Omit<CasinoPlay, 'id' | 'ts'>,
    balanceLabel: string,
    extraCrashResult?: number,
    toastMessage?: string,
  ) => void;
}

interface Card {
  r: string;
  s: string;
}

const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];

function buildDeck(): Card[] {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const d: Card[] = [];
  for (const s of suits) for (const r of ranks) d.push({r, s});
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handScore(cards: Card[]): number {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.r === 'A') {
      sum += 11;
      aces++;
    } else if (['K', 'Q', 'J'].includes(c.r)) {
      sum += 10;
    } else {
      sum += Number(c.r);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

export function CasinoView({
  state,
  onReserveStake,
  onSettleReserved,
}: CasinoViewProps) {
  // Crash state
  const [crashStake, setCrashStake] = useState('50');
  const [crashPhase, setCrashPhase] = useState<'idle' | 'running' | 'cashed' | 'crashed'>('idle');
  const [crashMult, setCrashMult] = useState(1.0);
  const [crashStatus, setCrashStatus] = useState(
    'Prêt pour le décollage — Placez une mise en DEMO_HTG',
  );
  const [crashError, setCrashError] = useState('');
  const crashRef = useRef<{
    phase: 'idle' | 'running' | 'cashed' | 'crashed';
    stake: number;
    target: number;
    currentMult: number;
    startTime: number;
    rafId: number | null;
  }>({
    phase: 'idle',
    stake: 50,
    target: 2.0,
    currentMult: 1.0,
    startTime: 0,
    rafId: null,
  });

  // Roulette state
  const [rouletteChoice, setRouletteChoice] = useState<'red' | 'black' | 'green'>('red');
  const [rouletteStake, setRouletteStake] = useState('50');
  const [rouletteNum, setRouletteNum] = useState<string>('?');
  const [rouletteBg, setRouletteBg] = useState('#1f2a40');
  const [rouletteResult, setRouletteResult] = useState('Choisissez une couleur');
  const [rouletteError, setRouletteError] = useState('');
  const [rouletteSpinning, setRouletteSpinning] = useState(false);

  // Blackjack state
  const [bjStake, setBjStake] = useState('50');
  const [bjError, setBjError] = useState('');
  const [bjStatus, setBjStatus] = useState('Placez une mise pour distribuer les cartes.');
  const [bjActive, setBjActive] = useState(false);
  const [bjReveal, setBjReveal] = useState(false);
  const [bjPlayer, setBjPlayer] = useState<Card[]>([]);
  const [bjDealer, setBjDealer] = useState<Card[]>([]);
  const bjDeckRef = useRef<Card[]>([]);
  const bjCurrentStakeRef = useRef(50);

  // Slots state
  const [slotsStake, setSlotsStake] = useState('50');
  const [reels, setReels] = useState(['7️⃣', '💎', '🍒']);
  const [slotsStatus, setSlotsStatus] = useState(
    '2 identiques : x1.5 · 3 identiques : x6 · Triple 7️⃣ : x15',
  );
  const [slotsError, setSlotsError] = useState('');
  const [slotsSpinning, setSlotsSpinning] = useState(false);

  useEffect(() => {
    return () => {
      if (crashRef.current.rafId !== null) {
        cancelAnimationFrame(crashRef.current.rafId);
      }
    };
  }, []);

  // Crash SVG geometry
  const progress = Math.min(1, Math.max(0, (crashMult - 1) / 4));
  const endX = 20 + progress * 360;
  const endY = 165 - Math.min(145, Math.pow(progress, 0.85) * 145);
  const ctrlX = 20 + progress * 220;
  const ctrlY = 165 - Math.min(40, progress * 35);
  const lineD = `M20,165 Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
  const areaD = `${lineD} L${endX.toFixed(1)},165 L20,165 Z`;
  const strokeColor =
    crashPhase === 'crashed' ? '#ef4444' : crashPhase === 'cashed' ? '#10b981' : '#38bdf8';

  const startCrashRound = () => {
    if (crashRef.current.phase === 'running') return;
    setCrashError('');
    const stake = Math.floor(Number(crashStake));
    if (!stake || stake <= 0) {
      setCrashError('Mise invalide.');
      return;
    }
    const rgErr = checkComplianceForWager(state, stake);
    if (rgErr) {
      setCrashError(rgErr);
      return;
    }
    if (stake > state.balance) {
      setCrashError('Solde DEMO_HTG insuffisant.');
      return;
    }

    onReserveStake(stake);

    const r = Math.random();
    const target =
      r < 0.03 ? 1.0 : Math.min(35, Math.max(1.02, Math.floor((0.97 / (1 - r)) * 100) / 100));

    crashRef.current = {
      phase: 'running',
      stake,
      target,
      currentMult: 1.0,
      startTime: performance.now(),
      rafId: null,
    };

    setCrashPhase('running');
    setCrashMult(1.0);
    setCrashStatus(`En vol... Mise : ${formatCredits(stake)}`);

    const tick = (now: number) => {
      if (crashRef.current.phase !== 'running') return;
      const mult = Math.floor(Math.exp(0.00019 * (now - crashRef.current.startTime)) * 100) / 100;
      crashRef.current.currentMult = mult;

      if (mult >= crashRef.current.target) {
        const finalTarget = crashRef.current.target;
        crashRef.current.phase = 'crashed';
        setCrashPhase('crashed');
        setCrashMult(finalTarget);
        setCrashStatus(`CRASH à ${finalTarget.toFixed(2)}x ! Mise perdue.`);
        onSettleReserved(
          crashRef.current.stake,
          0,
          {
            game: 'Crash',
            detail: `Crash à ${finalTarget.toFixed(2)}x`,
            stake: crashRef.current.stake,
            payout: 0,
            mult: 0,
          },
          `Crash -${crashRef.current.stake}`,
          finalTarget,
        );
        return;
      }

      setCrashMult(mult);
      crashRef.current.rafId = requestAnimationFrame(tick);
    };

    crashRef.current.rafId = requestAnimationFrame(tick);
  };

  const cashoutCrash = () => {
    if (crashRef.current.phase !== 'running') return;
    if (crashRef.current.rafId !== null) {
      cancelAnimationFrame(crashRef.current.rafId);
    }
    crashRef.current.phase = 'cashed';
    const mult = crashRef.current.currentMult;
    const payout = Math.round(crashRef.current.stake * mult);
    const target = crashRef.current.target;

    setCrashPhase('cashed');
    setCrashMult(mult);
    setCrashStatus(
      `Encaissé à ${mult.toFixed(2)}x (+${formatCredits(payout)}) · Crash prévu à ${target.toFixed(2)}x`,
    );

    onSettleReserved(
      crashRef.current.stake,
      payout,
      {
        game: 'Crash',
        detail: `Encaissé à ${mult.toFixed(2)}x`,
        stake: crashRef.current.stake,
        payout,
        mult,
      },
      `Crash +${payout}`,
      target,
      `Crash encaissé à ${mult.toFixed(2)}x : +${formatCredits(payout)} !`,
    );
  };

  const spinRoulette = () => {
    setRouletteError('');
    const stake = Math.floor(Number(rouletteStake));
    if (!stake || stake <= 0) {
      setRouletteError('Mise invalide.');
      return;
    }
    const rgErr = checkComplianceForWager(state, stake);
    if (rgErr) {
      setRouletteError(rgErr);
      return;
    }
    if (stake > state.balance) {
      setRouletteError('Solde DEMO_HTG insuffisant.');
      return;
    }

    onReserveStake(stake);
    setRouletteSpinning(true);
    setRouletteResult('La bille tourne...');

    setTimeout(() => {
      const num = Math.floor(Math.random() * 37);
      const color: 'green' | 'red' | 'black' =
        num === 0 ? 'green' : RED_NUMS.has(num) ? 'red' : 'black';
      const colorFr = color === 'green' ? 'Vert' : color === 'red' ? 'Rouge' : 'Noir';
      setRouletteNum(String(num));
      setRouletteBg(color === 'green' ? '#059669' : color === 'red' ? '#dc2626' : '#111827');

      let payout = 0;
      if (color === rouletteChoice) {
        payout = stake * (color === 'green' ? 14 : 2);
        setRouletteResult(`${num} ${colorFr} — Gagné +${formatCredits(payout)} !`);
      } else {
        setRouletteResult(`${num} ${colorFr} — Perdu`);
      }

      onSettleReserved(
        stake,
        payout,
        {
          game: 'Roulette',
          detail: `Pari ${rouletteChoice.toUpperCase()} · ${num} (${colorFr})`,
          stake,
          payout,
          mult: payout ? payout / stake : 0,
        },
        payout > 0 ? `Roulette +${payout}` : `Roulette -${stake}`,
        undefined,
        payout > 0 ? `Roulette : ${num} ${colorFr} ! +${formatCredits(payout)}` : undefined,
      );
      setRouletteSpinning(false);
    }, 420);
  };

  const finishBj = (
    outcome: 'blackjack' | 'win' | 'push' | 'lose',
    msg: string,
    finalPlayer: Card[],
    finalDealer: Card[],
  ) => {
    setBjActive(false);
    setBjReveal(true);
    setBjPlayer(finalPlayer);
    setBjDealer(finalDealer);
    setBjStatus(msg);

    const stake = bjCurrentStakeRef.current;
    const payout =
      outcome === 'blackjack'
        ? Math.round(stake * 2.5)
        : outcome === 'win'
          ? stake * 2
          : outcome === 'push'
            ? stake
            : 0;

    onSettleReserved(
      stake,
      payout,
      {
        game: 'Blackjack',
        detail: msg,
        stake,
        payout,
        mult: payout / stake,
      },
      payout > 0 ? `BJ +${payout}` : `BJ -${stake}`,
    );
  };

  const dealBj = () => {
    setBjError('');
    const stake = Math.floor(Number(bjStake));
    if (!stake || stake <= 0) {
      setBjError('Mise invalide.');
      return;
    }
    const rgErr = checkComplianceForWager(state, stake);
    if (rgErr) {
      setBjError(rgErr);
      return;
    }
    if (stake > state.balance) {
      setBjError('Solde DEMO_HTG insuffisant.');
      return;
    }

    onReserveStake(stake);
    bjCurrentStakeRef.current = stake;
    const deck = buildDeck();
    const pHand = [deck.pop()!, deck.pop()!];
    const dHand = [deck.pop()!, deck.pop()!];
    bjDeckRef.current = deck;

    setBjPlayer(pHand);
    setBjDealer(dHand);

    const pScore = handScore(pHand);
    const dScore = handScore(dHand);

    if (pScore === 21) {
      finishBj(
        dScore === 21 ? 'push' : 'blackjack',
        dScore === 21
          ? 'Égalité Blackjack !'
          : `Blackjack ! +${formatCredits(Math.round(stake * 2.5))}`,
        pHand,
        dHand,
      );
    } else {
      setBjActive(true);
      setBjReveal(false);
      setBjStatus('Votre tour : Tirer ou Rester ?');
    }
  };

  const standBj = (overridePlayer?: Card[]) => {
    const pHand = overridePlayer || bjPlayer;
    const dHand = [...bjDealer];
    const deck = [...bjDeckRef.current];
    while (handScore(dHand) < 17 && deck.length > 0) {
      dHand.push(deck.pop()!);
    }
    bjDeckRef.current = deck;
    const p = handScore(pHand);
    const d = handScore(dHand);
    const stake = bjCurrentStakeRef.current;

    if (d > 21 || p > d) {
      finishBj('win', `Gagné (${p} vs ${d}) ! +${formatCredits(stake * 2)}`, pHand, dHand);
    } else if (p === d) {
      finishBj('push', `Égalité (${p} vs ${d}) — Remboursé.`, pHand, dHand);
    } else {
      finishBj('lose', `Croupier gagne (${d} vs ${p}).`, pHand, dHand);
    }
  };

  const hitBj = () => {
    if (!bjActive) return;
    const deck = [...bjDeckRef.current];
    const nextCard = deck.pop();
    if (!nextCard) return;
    bjDeckRef.current = deck;
    const nextPlayer = [...bjPlayer, nextCard];
    setBjPlayer(nextPlayer);

    const sc = handScore(nextPlayer);
    if (sc > 21) {
      finishBj('lose', `Dépassé (${sc}) — Perdu.`, nextPlayer, bjDealer);
    } else if (sc === 21) {
      standBj(nextPlayer);
    }
  };

  const spinSlots = () => {
    setSlotsError('');
    const stake = Math.floor(Number(slotsStake));
    if (!stake || stake <= 0) {
      setSlotsError('Mise invalide.');
      return;
    }
    const rgErr = checkComplianceForWager(state, stake);
    if (rgErr) {
      setSlotsError(rgErr);
      return;
    }
    if (stake > state.balance) {
      setSlotsError('Solde DEMO_HTG insuffisant.');
      return;
    }

    onReserveStake(stake);
    setSlotsSpinning(true);
    setSlotsStatus('Les rouleaux tournent...');

    setTimeout(() => {
      const r = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
      setReels(r);
      let mult = 0;
      if (r[0] === r[1] && r[1] === r[2]) mult = r[0] === '7️⃣' ? 15 : 6;
      else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) mult = 1.5;

      const payout = Math.round(stake * mult);
      if (payout > 0) {
        setSlotsStatus(`${r.join(' ')} — Gagné +${formatCredits(payout)} (x${mult}) !`);
      } else {
        setSlotsStatus(`${r.join(' ')} — Aucune combinaison.`);
      }

      onSettleReserved(
        stake,
        payout,
        {
          game: 'Slots Démo',
          detail: r.join(' '),
          stake,
          payout,
          mult,
        },
        payout > 0 ? `Slots +${payout}` : `Slots -${stake}`,
        undefined,
        payout > 0 ? `Slots : +${formatCredits(payout)} !` : undefined,
      );
      setSlotsSpinning(false);
    }, 420);
  };

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 items-start mb-6">
        {/* CRASH */}
        <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 inline-flex items-center gap-2">
                <Rocket className="w-5 h-5 text-sky-400" />
                <span>Mini-jeu Crash (Démo)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Encaissez vos crédits avant l’explosion du multiplicateur.
              </p>
            </div>
            <span className="text-xs font-semibold text-sky-300 tabular">RTP simulé : 97.0 %</span>
          </div>

          <div className="relative bg-gradient-to-b from-[#13213c] to-[#0b111f] border border-[#36486b] rounded-xl h-56 flex flex-col items-center justify-center overflow-hidden p-4">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#crashGrad)" />
              <path d={lineD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div
              className={`relative z-10 text-5xl font-black tracking-tight tabular ${
                crashPhase === 'running'
                  ? 'text-sky-400'
                  : crashPhase === 'cashed'
                    ? 'text-emerald-400'
                    : crashPhase === 'crashed'
                      ? 'text-rose-400'
                      : 'text-slate-100'
              }`}
            >
              {crashMult.toFixed(2)}x
            </div>
            <div className="relative z-10 text-xs text-slate-300 mt-1.5 text-center">
              {crashStatus}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">Derniers multiplicateurs :</div>
            <div className="flex flex-wrap gap-1.5">
              {state.crashHistory.slice(0, 12).map((m, idx) => (
                <span
                  key={`${m}-${idx}`}
                  className={`text-xs font-bold px-2 py-0.5 rounded-md tabular ${
                    m < 1.5
                      ? 'bg-rose-500/15 text-rose-300'
                      : m < 3
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {m.toFixed(2)}x
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="crashStakeInput">
                Mise (DEMO_HTG)
              </label>
              <input
                id="crashStakeInput"
                type="number"
                min={1}
                step={1}
                value={crashStake}
                onChange={(e) => setCrashStake(e.target.value)}
                disabled={crashPhase === 'running'}
                className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm font-bold tabular mb-1.5"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={crashPhase === 'running'}
                  onClick={() =>
                    setCrashStake(
                      String(Math.min(Math.floor(state.balance), Math.max(0, Number(crashStake) || 0) + 50)),
                    )
                  }
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1 rounded-md text-xs font-semibold cursor-pointer tabular"
                >
                  +50
                </button>
                <button
                  type="button"
                  disabled={crashPhase === 'running'}
                  onClick={() =>
                    setCrashStake(
                      String(Math.min(Math.floor(state.balance), Math.max(0, Number(crashStake) || 0) + 100)),
                    )
                  }
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1 rounded-md text-xs font-semibold cursor-pointer tabular"
                >
                  +100
                </button>
                <button
                  type="button"
                  disabled={crashPhase === 'running'}
                  onClick={() => setCrashStake(String(Math.max(0, Math.floor(state.balance))))}
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {crashPhase !== 'running' ? (
                <button
                  type="button"
                  onClick={startCrashRound}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-sm px-5 py-3 rounded-xl cursor-pointer whitespace-nowrap"
                >
                  Miser & Lancer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cashoutCrash}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-sm px-5 py-3 rounded-xl cursor-pointer whitespace-nowrap tabular"
                >
                  Encaisser ({formatCredits(crashRef.current.stake * crashMult)})
                </button>
              )}
            </div>
          </div>

          {crashError && (
            <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-3 py-2 rounded-lg">
              {crashError}
            </div>
          )}

          <div className="bg-[#111827] border border-[#26334d] rounded-xl px-3.5 py-2.5 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Règles démo :</strong> Le multiplicateur démarre à{' '}
            <code className="text-sky-300">1.00x</code>. Cliquez sur{' '}
            <strong className="text-slate-200">Encaisser</strong> avant le crash pour remporter{' '}
            <code className="text-emerald-300">Mise × Multiplicateur</code> (RTP simulé 97 %, sans argent réel).
          </div>
        </div>

        {/* ACTIVITÉ CASINO */}
        <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-100">Activité Casino & Mini-jeux</h3>
            <span className="text-xs text-slate-400">Mode démo</span>
          </div>

          {state.casinoHistory.length === 0 ? (
            <div className="border border-dashed border-[#36486b] rounded-xl p-8 text-center text-sm text-slate-400">
              Aucune partie jouée pour l’instant.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {state.casinoHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111827] border border-[#26334d] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.game}</div>
                    <div className="text-xs text-slate-400">{item.detail}</div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md tabular whitespace-nowrap ${
                      item.payout > 0
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {item.payout > 0 ? `+${formatCredits(item.payout)}` : `-${formatCredits(item.stake)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* JEUX DE TABLE & SLOTS */}
      <h2 className="text-lg font-bold text-slate-100 mb-3.5 flex items-center gap-2">
        <Dices className="w-5 h-5 text-emerald-400" />
        <span>Slots & Jeux de table (Mode Démo)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Roulette */}
        <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">Roulette Démo</h3>
            <span className="text-xs font-semibold text-sky-300 tabular">RTP ~97.3 %</span>
          </div>

          <div className="bg-[#0b111f] border border-[#36486b] rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-400">Dernier tirage</div>
              <div className="text-sm font-semibold text-slate-100">{rouletteResult}</div>
            </div>
            <div
              className="w-12 h-12 rounded-full grid place-items-center font-black text-lg border-2 border-[#36486b] shrink-0 tabular text-white"
              style={{backgroundColor: rouletteBg}}
            >
              {rouletteNum}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                {id: 'red', label: 'Rouge (x2)'},
                {id: 'black', label: 'Noir (x2)'},
                {id: 'green', label: 'Vert 0 (x14)'},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRouletteChoice(opt.id)}
                className={`py-2 px-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  rouletteChoice === opt.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-slate-100'
                    : 'bg-[#111827] border-[#26334d] text-slate-400 hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="rouletteStake">
              Mise (DEMO_HTG)
            </label>
            <input
              id="rouletteStake"
              type="number"
              min={1}
              step={1}
              value={rouletteStake}
              onChange={(e) => setRouletteStake(e.target.value)}
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm font-bold tabular"
            />
          </div>

          {rouletteError && (
            <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-3 py-2 rounded-lg">
              {rouletteError}
            </div>
          )}

          <button
            type="button"
            disabled={rouletteSpinning}
            onClick={spinRoulette}
            className="mt-auto w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-emerald-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            Tourner la roue
          </button>
        </div>

        {/* Blackjack */}
        <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 inline-flex items-center gap-1.5">
              <Spade className="w-4 h-4 text-emerald-400" />
              <span>Blackjack Démo</span>
            </h3>
            <span className="text-xs font-semibold text-sky-300 tabular">RTP ~98.5 %</span>
          </div>

          <div className="bg-[#0b111f] border border-[#36486b] rounded-xl p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">
                Croupier (
                <strong className="text-slate-100 tabular">
                  {bjDealer.length === 0
                    ? 0
                    : bjReveal
                      ? handScore(bjDealer)
                      : handScore([bjDealer[0]])}
                </strong>
                )
              </span>
              <div className="flex flex-wrap gap-1">
                {bjDealer.length === 0 ? (
                  <span className="text-slate-500">—</span>
                ) : (
                  bjDealer.map((c, idx) =>
                    !bjReveal && idx === 1 ? (
                      <span
                        key={idx}
                        className="bg-[#1f2a40] text-slate-300 border border-[#36486b] font-extrabold px-2 py-0.5 rounded"
                      >
                        ?
                      </span>
                    ) : (
                      <span
                        key={idx}
                        className={`bg-slate-50 font-extrabold px-2 py-0.5 rounded ${
                          c.s === '♥' || c.s === '♦' ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {c.r}
                        {c.s}
                      </span>
                    ),
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">
                Vous (
                <strong className="text-slate-100 tabular">
                  {bjPlayer.length === 0 ? 0 : handScore(bjPlayer)}
                </strong>
                )
              </span>
              <div className="flex flex-wrap gap-1">
                {bjPlayer.length === 0 ? (
                  <span className="text-slate-500">—</span>
                ) : (
                  bjPlayer.map((c, idx) => (
                    <span
                      key={idx}
                      className={`bg-slate-50 font-extrabold px-2 py-0.5 rounded ${
                        c.s === '♥' || c.s === '♦' ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {c.r}
                      {c.s}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#26334d] text-sky-300 font-semibold">{bjStatus}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="bjStake">
              Mise (DEMO_HTG)
            </label>
            <input
              id="bjStake"
              type="number"
              min={1}
              step={1}
              value={bjStake}
              disabled={bjActive}
              onChange={(e) => setBjStake(e.target.value)}
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm font-bold tabular"
            />
          </div>

          {bjError && (
            <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-3 py-2 rounded-lg">
              {bjError}
            </div>
          )}

          <div className="mt-auto flex gap-2">
            {!bjActive ? (
              <button
                type="button"
                onClick={dealBj}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
              >
                Distribuer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={hitBj}
                  className="flex-1 bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 font-bold text-sm py-2.5 rounded-xl cursor-pointer"
                >
                  Tirer
                </button>
                <button
                  type="button"
                  onClick={() => standBj()}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
                >
                  Rester
                </button>
              </>
            )}
          </div>
        </div>

        {/* Slots */}
        <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 inline-flex items-center gap-1.5">
              <Cherry className="w-4 h-4 text-rose-400" />
              <span>Slots Démo</span>
            </h3>
            <span className="text-xs font-semibold text-sky-300 tabular">RTP ~96.5 %</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 bg-[#0b111f] border border-[#36486b] rounded-xl p-3.5 text-center text-3xl">
            {reels.map((sym, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-[#26334d] rounded-xl py-2.5 select-none"
              >
                {sym}
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-300 text-center">{slotsStatus}</div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="slotsStake">
              Mise (DEMO_HTG)
            </label>
            <input
              id="slotsStake"
              type="number"
              min={1}
              step={1}
              value={slotsStake}
              onChange={(e) => setSlotsStake(e.target.value)}
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm font-bold tabular"
            />
          </div>

          {slotsError && (
            <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-3 py-2 rounded-lg">
              {slotsError}
            </div>
          )}

          <button
            type="button"
            disabled={slotsSpinning}
            onClick={spinSlots}
            className="mt-auto w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-emerald-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            Lancer les rouleaux
          </button>
        </div>
      </div>
    </section>
  );
}
