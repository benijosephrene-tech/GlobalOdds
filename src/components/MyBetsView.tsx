import React from 'react';
import {Check, Clock, History, TrendingUp, X} from 'lucide-react';
import {INITIAL_BALANCE, UNIT} from '../data/events';
import {AppState, SportBet} from '../types';
import {formatCredits} from '../utils/helpers';

interface MyBetsViewProps {
  state: AppState;
  onSimulateBet: (betId: string, outcome: 'won' | 'lost') => void;
}

export function MyBetsView({state, onSimulateBet}: MyBetsViewProps) {
  const pending = state.bets.filter((b) => b.status === 'pending');
  const settled = state.bets.filter((b) => b.status !== 'pending');
  const totalStaked = state.bets.reduce((s, b) => s + b.stake, 0);
  const wonCount = settled.filter((b) => b.status === 'won').length;
  const winRate = settled.length ? Math.round((wonCount / settled.length) * 100) : 0;
  const netProfit = settled.reduce(
    (s, b) => s + (b.status === 'won' ? b.potentialWin - b.stake : -b.stake),
    0,
  );

  // SVG Chart
  const pts = state.balanceHistory;
  const width = 760;
  const height = 190;
  const padL = 62;
  const padR = 20;
  const padT = 18;
  const padB = 28;
  const vals = pts.map((p) => p.balance);
  const minVal = Math.min(...vals, INITIAL_BALANCE);
  const maxVal = Math.max(...vals, INITIAL_BALANCE + 100);
  const range = Math.max(100, maxVal - minVal);
  const yMin = Math.max(0, minVal - range * 0.12);
  const yMax = maxVal + range * 0.12;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const coords = pts.map((p, idx) => ({
    x: pts.length === 1 ? padL + plotW / 2 : padL + (idx / (pts.length - 1)) * plotW,
    y: padT + (1 - (p.balance - yMin) / (yMax - yMin)) * plotH,
    ...p,
  }));

  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const areaD =
    coords.length > 1
      ? `${pathD} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
      : '';

  const renderBetCard = (b: SportBet) => {
    const isCombo = b.type === 'combo' && Array.isArray(b.legs);
    return (
      <div
        key={b.id}
        className="bg-[#161f30] border border-[#26334d] rounded-xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-sky-400 mb-1">
              {isCombo ? `Combiné (${b.legs?.length} sélections)` : 'Pari simple'}
            </div>

            {isCombo && b.legs ? (
              <div className="flex flex-col gap-1.5">
                {b.legs.map((l, idx) => (
                  <div
                    key={idx}
                    className="bg-[#111827] border border-[#26334d] rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <div className="text-slate-400 text-[11px]">
                      {l.eventTitle} · {l.marketName}
                    </div>
                    <div className="font-semibold text-slate-100">
                      {l.optionLabel}{' '}
                      <span className="text-emerald-400 tabular">({l.odd.toFixed(2)})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="text-xs text-slate-400">
                  {b.competition} · {b.marketName || ''}
                </div>
                <div className="text-sm font-bold text-slate-100">{b.eventTitle}</div>
                <div className="text-xs text-sky-300 mt-0.5">
                  Pronostic : <strong>{b.optionLabel}</strong>
                </div>
              </div>
            )}
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md border whitespace-nowrap ${
              b.status === 'pending'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : b.status === 'won'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/35'
            }`}
          >
            {b.status === 'pending' ? 'En attente' : b.status === 'won' ? 'Gagné' : 'Perdu'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-[#111827] px-3 py-2 rounded-lg text-xs">
          <div>
            <span className="block text-[11px] text-slate-500">Mise</span>
            <strong className="text-slate-100 tabular">{formatCredits(b.stake)}</strong>
          </div>
          <div>
            <span className="block text-[11px] text-slate-500">Cote</span>
            <strong className="text-slate-100 tabular">{b.odd.toFixed(2)}</strong>
          </div>
          <div>
            <span className="block text-[11px] text-slate-500">
              {b.status === 'won'
                ? 'Gain reçu'
                : b.status === 'lost'
                  ? 'Gain'
                  : 'Gain potentiel'}
            </span>
            <strong
              className={`tabular ${b.status === 'lost' ? 'text-rose-400' : 'text-emerald-400'}`}
            >
              {b.status === 'lost' ? `0 ${UNIT}` : formatCredits(b.potentialWin)}
            </strong>
          </div>
        </div>

        {b.status === 'pending' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSimulateBet(b.id, 'won')}
              className="py-2 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-emerald-950 border border-emerald-500/35 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simuler Gagné</span>
            </button>
            <button
              type="button"
              onClick={() => onSimulateBet(b.id, 'lost')}
              className="py-2 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/35 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Simuler Perdu</span>
            </button>
          </div>
        ) : (
          b.settledAt && (
            <div className="text-[11px] text-slate-500">
              Réglé le{' '}
              {new Date(b.settledAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#161f30] border border-[#26334d] rounded-xl p-4">
          <div className="text-xs text-slate-400">Paris sportifs</div>
          <div className="text-xl font-extrabold text-slate-100 mt-1 tabular">
            {state.bets.length}
          </div>
        </div>
        <div className="bg-[#161f30] border border-[#26334d] rounded-xl p-4">
          <div className="text-xs text-slate-400">Total misé</div>
          <div className="text-xl font-extrabold text-slate-100 mt-1 tabular">
            {formatCredits(totalStaked)}
          </div>
        </div>
        <div className="bg-[#161f30] border border-[#26334d] rounded-xl p-4">
          <div className="text-xs text-slate-400">Taux de réussite</div>
          <div className="text-xl font-extrabold text-sky-400 mt-1 tabular">{winRate}%</div>
        </div>
        <div className="bg-[#161f30] border border-[#26334d] rounded-xl p-4">
          <div className="text-xs text-slate-400">Profit net simulé</div>
          <div
            className={`text-xl font-extrabold mt-1 tabular ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netProfit > 0 ? '+' : ''}
            {formatCredits(netProfit)}
          </div>
        </div>
      </div>

      <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-base font-bold text-slate-100 inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Évolution du solde (DEMO_HTG)</span>
            </div>
            <div className="text-xs text-slate-400">
              Suivi chronologique depuis votre capital de test initial de 1 000 DEMO_HTG
            </div>
          </div>
          <span className="text-xs font-bold text-sky-300 tabular">
            Actuel : {formatCredits(state.balance)}
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 block">
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line
              x1={padL}
              y1={padT}
              x2={width - padR}
              y2={padT}
              stroke="#26334d"
              strokeDasharray="4 4"
            />
            <line
              x1={padL}
              y1={padT + plotH / 2}
              x2={width - padR}
              y2={padT + plotH / 2}
              stroke="#26334d"
              strokeDasharray="4 4"
            />
            <line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke="#26334d" />
            <text x={padL - 8} y={padT + 4} textAnchor="end" fill="#64748b" fontSize="11">
              {Math.round(yMax)}
            </text>
            <text
              x={padL - 8}
              y={padT + plotH / 2 + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
            >
              {Math.round((yMin + yMax) / 2)}
            </text>
            <text x={padL - 8} y={padT + plotH + 4} textAnchor="end" fill="#64748b" fontSize="11">
              {Math.round(yMin)}
            </text>
            {areaD && <path d={areaD} fill="url(#balGrad)" />}
            {coords.length > 1 && (
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            )}
            {coords.map((c, idx) => (
              <circle
                key={idx}
                cx={c.x}
                cy={c.y}
                r={idx === coords.length - 1 ? 5 : 3.5}
                fill="#10b981"
                stroke="#090d16"
                strokeWidth="2"
              >
                <title>
                  {c.label} : {formatCredits(c.balance)}
                </title>
              </circle>
            ))}
            <text x={padL} y={height - 6} fill="#64748b" fontSize="11">
              Départ ({INITIAL_BALANCE} DEMO_HTG)
            </text>
            <text x={width - padR} y={height - 6} textAnchor="end" fill="#94a3b8" fontSize="11">
              {pts.length} relevé{pts.length > 1 ? 's' : ''}
            </text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Paris sportifs en cours</span>
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-extrabold px-2 py-0.5 rounded-md tabular">
              {pending.length}
            </span>
          </h2>
          {pending.length === 0 ? (
            <div className="bg-[#161f30] border border-dashed border-[#36486b] rounded-xl p-8 text-center text-sm text-slate-400">
              Aucun pari en attente.
            </div>
          ) : (
            <div className="flex flex-col gap-3">{pending.map(renderBetCard)}</div>
          )}
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <span>Historique des paris réglés</span>
          </h2>
          {settled.length === 0 ? (
            <div className="bg-[#161f30] border border-dashed border-[#36486b] rounded-xl p-8 text-center text-sm text-slate-400">
              Aucun pari réglé pour le moment.
            </div>
          ) : (
            <div className="flex flex-col gap-3">{settled.map(renderBetCard)}</div>
          )}
        </div>
      </div>
    </section>
  );
}
