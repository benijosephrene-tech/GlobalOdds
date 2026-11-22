import React from 'react';
import {Trophy} from 'lucide-react';
import {FAKE_PLAYERS} from '../data/events';
import {AppState, FakePlayer} from '../types';
import {formatCredits} from '../utils/helpers';

interface LeaderboardViewProps {
  state: AppState;
}

export function LeaderboardView({state}: LeaderboardViewProps) {
  const settled = state.bets.filter((b) => b.status !== 'pending');
  const won = settled.filter((b) => b.status === 'won').length;
  const yourRate = settled.length ? `${Math.round((won / settled.length) * 100)}%` : '—';

  const allPlayers: FakePlayer[] = [
    ...FAKE_PLAYERS,
    {
      name: 'Vous',
      avatar: '★',
      specialty: 'Multi-disciplines',
      winRate: yourRate,
      balance: Math.round(state.balance),
      isYou: true,
    },
  ].sort((a, b) => b.balance - a.balance);

  return (
    <section className="bg-[#161f30] border border-[#26334d] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[#26334d]">
        <h2 className="text-lg font-bold text-slate-100 inline-flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Classement mondial des pronostiqueurs (Démo)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Votre position évolue en temps réel selon votre solde en DEMO_HTG.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#111827] border-b border-[#26334d] text-left text-xs font-semibold text-slate-400">
              <th className="py-3 px-4 w-16">Rang</th>
              <th className="py-3 px-4">Joueur</th>
              <th className="py-3 px-4 hidden sm:table-cell">Spécialité</th>
              <th className="py-3 px-4 hidden sm:table-cell">Réussite</th>
              <th className="py-3 px-4 text-right">Crédits DEMO_HTG</th>
            </tr>
          </thead>
          <tbody>
            {allPlayers.map((p, idx) => (
              <tr
                key={p.name}
                className={`border-b border-[#26334d]/60 text-sm ${
                  p.isYou ? 'bg-emerald-500/10' : 'hover:bg-[#1b263b]/50'
                }`}
              >
                <td className="py-3.5 px-4 font-extrabold tabular text-slate-200">
                  {idx === 0 ? '#1' : idx === 1 ? '#2' : idx === 2 ? '#3' : `#${idx + 1}`}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5 font-semibold text-slate-100">
                    <span className="w-8 h-8 rounded-full bg-[#1f2a40] border border-[#36486b] grid place-items-center text-xs font-bold text-slate-200 shrink-0">
                      {p.avatar}
                    </span>
                    <span>
                      {p.name}{' '}
                      {p.isYou && <span className="text-emerald-400 text-xs">(Vous)</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 hidden sm:table-cell text-slate-400">{p.specialty}</td>
                <td className="py-3.5 px-4 hidden sm:table-cell tabular text-slate-300">
                  {p.winRate}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-extrabold tabular ${
                    p.isYou ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {formatCredits(p.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
