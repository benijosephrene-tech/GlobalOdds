import React, {useState} from 'react';
import {ShieldCheck, UserCheck} from 'lucide-react';
import {UNIT} from '../data/events';
import {AppState} from '../types';
import {
  formatCredits,
  getDailyWagered,
  getWeeklyWagered,
  isCoolOffActive,
} from '../utils/helpers';

interface ComplianceViewProps {
  state: AppState;
  onSubmitKyc: (docType: string, docNumber: string, ageConfirmed: boolean) => void;
  onSimulateKycStatus: (status: 'verified' | 'unverified') => void;
  onSaveLimits: (daily: number, weekly: number) => void;
  onActivateCoolOff: () => void;
  onActivateSelfExclude: () => void;
  onResetRgTest: () => void;
}

export function ComplianceView({
  state,
  onSubmitKyc,
  onSimulateKycStatus,
  onSaveLimits,
  onActivateCoolOff,
  onActivateSelfExclude,
  onResetRgTest,
}: ComplianceViewProps) {
  const c = state.compliance;
  const [docType, setDocType] = useState(c.docType || 'CIN');
  const [docNumber, setDocNumber] = useState(c.docNumber || '');
  const [ageChecked, setAgeChecked] = useState(Boolean(c.ageConfirmed));
  const [dailyInput, setDailyInput] = useState(String(c.dailyLimit));
  const [weeklyInput, setWeeklyInput] = useState(String(c.weeklyLimit));

  const dUsed = getDailyWagered(state);
  const wUsed = getWeeklyWagered(state);
  const dPct = Math.min(100, Math.round((dUsed / Math.max(1, c.dailyLimit)) * 100));
  const wPct = Math.min(100, Math.round((wUsed / Math.max(1, c.weeklyLimit)) * 100));

  const handleKycFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageChecked || !docNumber.trim()) return;
    onSubmitKyc(docType, docNumber.trim(), ageChecked);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* KYC 18+ */}
      <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 inline-flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-400" />
              <span>Contrôle d’âge 18+ & KYC (Simulé)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulation de vérification — ne saisissez aucune donnée personnelle réelle.
            </p>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${
              c.kycStatus === 'verified'
                ? 'bg-emerald-500/15 text-emerald-300'
                : c.kycStatus === 'pending'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {c.kycStatus === 'verified'
              ? 'Vérifié (18+ Démo)'
              : c.kycStatus === 'pending'
                ? 'En attente'
                : 'Non vérifié'}
          </span>
        </div>

        <form onSubmit={handleKycFormSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="kycDocType">
              Type de pièce d’identité (démo)
            </label>
            <select
              id="kycDocType"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm"
            >
              <option value="CIN">CIN (Carte d’Identité Nationale)</option>
              <option value="Passeport">Passeport</option>
              <option value="Permis">Permis de conduire</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1" htmlFor="kycDocNumber">
              Numéro de document simulé
            </label>
            <input
              id="kycDocNumber"
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Ex : DEMO-CIN-2026-001"
              className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
            />
            <span>
              Je certifie avoir <strong className="text-slate-100">18 ans ou plus</strong> et
              j’utilise cet environnement de test sans argent réel.
            </span>
          </label>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-sm py-2.5 rounded-xl cursor-pointer"
          >
            Soumettre pour vérification (Démo)
          </button>
        </form>

        <div className="pt-3 border-t border-[#26334d] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Contrôles de test KYC :</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!docNumber.trim()) setDocNumber('DEMO-KYC-VERIFIE');
                setAgeChecked(true);
                onSimulateKycStatus('verified');
              }}
              className="bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Simuler Vérifié
            </button>
            <button
              type="button"
              onClick={() => {
                setAgeChecked(false);
                onSimulateKycStatus('unverified');
              }}
              className="bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Remettre Non vérifié
            </button>
          </div>
        </div>
      </div>

      {/* JEU RESPONSABLE */}
      <div className="bg-[#161f30] border border-[#26334d] rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-100 inline-flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Outils de Jeu responsable</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Limites de mise simulées et protection contre le jeu excessif.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-semibold text-slate-400" htmlFor="dailyLimitInput">
              Limite quotidienne de mise (DEMO_HTG)
            </label>
            <span className="text-slate-300 tabular">
              {dUsed.toLocaleString('fr-FR')} / {c.dailyLimit.toLocaleString('fr-FR')} {UNIT}
            </span>
          </div>
          <input
            id="dailyLimitInput"
            type="number"
            min={50}
            step={50}
            value={dailyInput}
            onChange={(e) => setDailyInput(e.target.value)}
            className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm tabular mb-1.5"
          />
          <div className="w-full h-2 bg-[#111827] border border-[#26334d] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                dPct >= 95 ? 'bg-rose-500' : dPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{width: `${dPct}%`}}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-semibold text-slate-400" htmlFor="weeklyLimitInput">
              Limite hebdomadaire de mise (DEMO_HTG)
            </label>
            <span className="text-slate-300 tabular">
              {wUsed.toLocaleString('fr-FR')} / {c.weeklyLimit.toLocaleString('fr-FR')} {UNIT}
            </span>
          </div>
          <input
            id="weeklyLimitInput"
            type="number"
            min={100}
            step={100}
            value={weeklyInput}
            onChange={(e) => setWeeklyInput(e.target.value)}
            className="w-full bg-[#111827] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm tabular mb-1.5"
          />
          <div className="w-full h-2 bg-[#111827] border border-[#26334d] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                wPct >= 95 ? 'bg-rose-500' : wPct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{width: `${wPct}%`}}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const dl = Math.max(50, Math.floor(Number(dailyInput) || 500));
            const wl = Math.max(dl, Math.floor(Number(weeklyInput) || 2000));
            setDailyInput(String(dl));
            setWeeklyInput(String(wl));
            onSaveLimits(dl, wl);
          }}
          className="w-full bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
        >
          Enregistrer les limites simulées ({formatCredits(Math.max(50, Number(dailyInput) || 500))} / jour)
        </button>

        <div className="pt-3 border-t border-[#26334d] flex flex-col gap-2.5">
          <div className="text-xs font-bold text-slate-200">Protection & Pauses volontaires</div>
          <div className="bg-[#111827] border border-[#26334d] rounded-xl px-3.5 py-2.5 text-xs text-slate-300">
            {c.selfExcluded ? (
              <span>
                <strong className="text-rose-300">Auto-exclusion activée.</strong> Nouveaux paris et
                mini-jeux bloqués.
              </span>
            ) : isCoolOffActive(state) && c.coolOffUntil ? (
              <span>
                <strong className="text-amber-300">Pause temporaire active</strong> jusqu’au{' '}
                {new Date(c.coolOffUntil).toLocaleString('fr-FR')}.
              </span>
            ) : (
              <span>
                <strong className="text-emerald-400">Statut : Actif.</strong> Aucune pause ou
                exclusion en cours.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onActivateCoolOff}
              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer"
            >
              Pause temporaire (24h)
            </button>
            <button
              type="button"
              onClick={onActivateSelfExclude}
              className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer"
            >
              Auto-exclusion (Démo)
            </button>
          </div>

          <button
            type="button"
            onClick={onResetRgTest}
            className="bg-[#1f2a40] hover:bg-[#283652] border border-[#36486b] text-slate-100 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réinitialiser restrictions & compteurs (Mode Test)
          </button>
        </div>
      </div>
    </section>
  );
}
