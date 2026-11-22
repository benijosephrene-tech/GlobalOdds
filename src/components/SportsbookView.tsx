import React, {useMemo, useState} from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ReceiptText,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  DETAIL_MARKET_CATS,
  EVENTS,
  QUICK_MARKETS,
  STATUSES,
} from '../data/events';
import {AppState, SportEvent, TicketSelection} from '../types';
import {
  checkComplianceForWager,
  countEventMarkets,
  findOptionInfo,
  formatCredits,
  getQuickMarketLine,
} from '../utils/helpers';

interface SportsbookViewProps {
  state: AppState;
  searchQuery: string;
  ticketSelections: TicketSelection[];
  setTicketSelections: React.Dispatch<React.SetStateAction<TicketSelection[]>>;
  onPlaceBets: (
    mode: 'single' | 'combo',
    globalStake: string,
  ) => void;
}

export function SportsbookView({
  state,
  searchQuery,
  ticketSelections,
  setTicketSelections,
  onPlaceBets,
}: SportsbookViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState('Tous');
  const [selectedQuickMarket, setSelectedQuickMarket] = useState('1x2');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [detailMarketCat, setDetailMarketCat] = useState('Tous');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [openAnalysisIds, setOpenAnalysisIds] = useState<Set<string>>(new Set());

  const [slipMode, setSlipMode] = useState<'single' | 'combo'>('single');
  const [globalStakeVal, setGlobalStakeVal] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EVENTS.filter((ev) => {
      const matchCat = selectedCategory === 'Tous' || ev.category === selectedCategory;
      const matchStatus = selectedStatus === 'Tous' || ev.status === selectedStatus;
      const matchQuery =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.competition.toLowerCase().includes(q) ||
        ev.region.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q);
      return matchCat && matchStatus && matchQuery;
    });
  }, [searchQuery, selectedCategory, selectedStatus]);

  const activeMatch: SportEvent | undefined = useMemo(() => {
    if (!activeMatchId) return undefined;
    return EVENTS.find((e) => e.id === activeMatchId);
  }, [activeMatchId]);

  const isSelected = (eventId: string, marketId: string, optionId: string) => {
    const key = `${eventId}__${marketId}__${optionId}`;
    return ticketSelections.some((s) => s.key === key);
  };

  const toggleSelection = (eventId: string, marketId: string, optionId: string) => {
    const info = findOptionInfo(eventId, marketId, optionId);
    if (!info) return;
    const {ev, market, opt} = info;
    if (ev.status === 'Terminés') return;
    const key = `${ev.id}__${market.marketId}__${opt.id}`;

    setTicketSelections((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx !== -1) {
        return prev.filter((s) => s.key !== key);
      }
      const defaultStake =
        globalStakeVal !== ''
          ? globalStakeVal
          : state.balance >= 50
            ? '50'
            : String(Math.max(0, Math.floor(state.balance)));
      return [
        ...prev,
        {
          key,
          eventId: ev.id,
          marketId: market.marketId,
          optionId: opt.id,
          eventTitle: ev.title,
          competition: ev.competition,
          marketName: market.marketName,
          label: opt.label,
          odd: opt.odd,
          stake: defaultStake,
        },
      ];
    });
  };

  const toggleAnalysis = (evId: string) => {
    setOpenAnalysisIds((prev) => {
      const next = new Set(prev);
      if (next.has(evId)) next.delete(evId);
      else next.add(evId);
      return next;
    });
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const hasSameMarketConflict = useMemo(() => {
    const seen = new Set<string>();
    for (const sel of ticketSelections) {
      const mkKey = `${sel.eventId}__${sel.marketId}`;
      if (seen.has(mkKey)) return true;
      seen.add(mkKey);
    }
    return false;
  }, [ticketSelections]);

  const slipCalculations = useMemo(() => {
    if (ticketSelections.length === 0) {
      return {
        totalStake: 0,
        totalWin: 0,
        comboOdds: 1,
        error: null as string | null,
        canSubmit: false,
        submitLabel: 'Valider le ticket',
      };
    }

    if (slipMode === 'single') {
      let totalStake = 0;
      let totalWin = 0;
      let hasInvalid = false;

      for (const sel of ticketSelections) {
        const st = Number(sel.stake);
        if (!Number.isFinite(st) || st < 0) hasInvalid = true;
        if (st > 0) {
          totalStake += st;
          totalWin += Math.round(st * sel.odd);
        }
      }

      const rgBlock = totalStake > 0 ? checkComplianceForWager(state, totalStake) : null;
      let error: string | null = null;
      let canSubmit = false;

      if (hasInvalid || totalStake <= 0) {
        canSubmit = false;
      } else if (rgBlock) {
        error = rgBlock;
      } else if (totalStake > state.balance) {
        error = 'Solde DEMO_HTG insuffisant pour le total des mises.';
      } else {
        canSubmit = true;
      }

      const validCount = ticketSelections.filter((s) => Number(s.stake) > 0).length;
      return {
        totalStake,
        totalWin,
        comboOdds: 1,
        error,
        canSubmit,
        submitLabel: validCount > 1 ? `Valider ${validCount} paris simples` : 'Valider le pari',
      };
    }

    const comboOdds = ticketSelections.reduce((acc, s) => acc * s.odd, 1);
    const stake = Number(globalStakeVal);
    const totalStake = Number.isFinite(stake) && stake > 0 ? stake : 0;
    const totalWin = Math.round(totalStake * comboOdds);
    const rgBlock = totalStake > 0 ? checkComplianceForWager(state, totalStake) : null;

    let error: string | null = null;
    let canSubmit = false;

    if (ticketSelections.length < 2) {
      error = 'Ajoutez au moins 2 sélections pour placer un pari combiné.';
    } else if (hasSameMarketConflict) {
      error =
        'Combiné impossible : deux issues d’un même marché sont sélectionnées. Passez en « Paris simples » ou retirez un doublon.';
    } else if (totalStake <= 0) {
      canSubmit = false;
    } else if (rgBlock) {
      error = rgBlock;
    } else if (totalStake > state.balance) {
      error = 'Solde DEMO_HTG insuffisant pour cette mise.';
    } else {
      canSubmit = true;
    }

    return {
      totalStake,
      totalWin,
      comboOdds,
      error,
      canSubmit,
      submitLabel: 'Valider le combiné',
    };
  }, [ticketSelections, slipMode, globalStakeVal, state, hasSameMarketConflict]);

  const handleGlobalStakeChange = (val: string) => {
    setGlobalStakeVal(val);
    if (slipMode === 'single') {
      setTicketSelections((prev) => prev.map((s) => ({...s, stake: val})));
    }
  };

  const handleQuickStake = (addAmount?: number, isMax?: boolean) => {
    if (slipMode === 'single') {
      const count = Math.max(1, ticketSelections.length);
      const maxPerItem = Math.floor(state.balance / count);
      const nextVal = isMax
        ? String(maxPerItem)
        : String(Math.min(maxPerItem, Math.max(0, Number(globalStakeVal) || 0) + (addAmount || 0)));
      setGlobalStakeVal(nextVal);
      setTicketSelections((prev) => prev.map((s) => ({...s, stake: nextVal})));
    } else {
      const maxBal = Math.max(0, Math.floor(state.balance));
      const nextVal = isMax
        ? String(maxBal)
        : String(Math.min(maxBal, Math.max(0, Number(globalStakeVal) || 0) + (addAmount || 0)));
      setGlobalStakeVal(nextVal);
    }
  };

  const handleModeSwitch = (mode: 'single' | 'combo') => {
    setSlipMode(mode);
    if (mode === 'combo' && !globalStakeVal) {
      setGlobalStakeVal(
        state.balance >= 50 ? '50' : String(Math.max(0, Math.floor(state.balance))),
      );
    }
  };

  const handleSubmitTicket = () => {
    if (!slipCalculations.canSubmit) return;
    onPlaceBets(slipMode, globalStakeVal);
    setGlobalStakeVal('');
    setMobileDrawerOpen(false);
  };

  const renderStatusText = (ev: SportEvent) => {
    if (ev.status === 'En cours') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
          {ev.schedule}
        </span>
      );
    }
    if (ev.status === 'À venir') {
      return <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{ev.schedule}</span>;
    }
    return <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{ev.schedule}</span>;
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <div>
        {/* NIVEAU 1 : LISTE COMPACTE */}
        {!activeMatch ? (
          <div>
            <div className="flex flex-col gap-2.5 mb-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold'
                        : 'bg-[#111827] border-[#26334d] text-slate-400 hover:text-slate-100 hover:border-[#36486b]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedStatus === st
                        ? 'bg-sky-500/15 border-sky-400 text-sky-300 font-semibold'
                        : 'bg-transparent border-[#26334d] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111827] border border-[#26334d] rounded-xl p-2.5 mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-semibold text-slate-400 pl-1.5">Marché affiché :</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_MARKETS.map((qm) => (
                  <button
                    key={qm.id}
                    type="button"
                    onClick={() => setSelectedQuickMarket(qm.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedQuickMarket === qm.id
                        ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                        : 'bg-[#161f30] border-[#26334d] text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {qm.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-[#161f30] border border-dashed border-[#36486b] rounded-xl p-10 text-center text-slate-400 text-sm">
                Aucun événement ne correspond à votre recherche ou à vos filtres actuels.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredEvents.map((ev) => {
                  const isFinished = ev.status === 'Terminés';
                  const {line, caption} = getQuickMarketLine(ev, selectedQuickMarket);
                  const totalOptions = countEventMarkets(ev);
                  const isAnalysisOpen = openAnalysisIds.has(ev.id);

                  return (
                    <article
                      key={ev.id}
                      className="bg-[#161f30] border border-[#26334d] hover:border-[#36486b] rounded-xl p-4 flex flex-col gap-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                          <span className="text-sky-400 font-semibold">{ev.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ev.region}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300">{ev.competition}</span>
                        </div>
                        {renderStatusText(ev)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[minmax(210px,1.15fr)_minmax(240px,1.45fr)_auto] gap-3.5 items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMatchId(ev.id);
                            setDetailMarketCat('Tous');
                            window.scrollTo({top: 0, behavior: 'smooth'});
                          }}
                          className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-md"
                        >
                          <div className="text-base font-bold text-slate-100 group-hover:text-sky-300 group-hover:underline underline-offset-4 leading-snug">
                            {ev.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{ev.scoreInfo}</div>
                        </button>

                        <div className="flex flex-col gap-1">
                          <div className="text-[11px] font-medium text-slate-400">{caption}</div>
                          <div
                            className="grid gap-1.5"
                            style={{gridTemplateColumns: `repeat(${line.options.length}, minmax(0, 1fr))`}}
                          >
                            {line.options.map((opt) => {
                              const sel = isSelected(ev.id, line.marketId, opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={isFinished}
                                  onClick={() => toggleSelection(ev.id, line.marketId, opt.id)}
                                  className={`rounded-lg px-2 py-2 border flex flex-col items-center justify-center gap-0.5 text-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    sel
                                      ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500'
                                      : 'bg-[#111827] border-[#26334d] hover:border-emerald-500/60 hover:bg-emerald-500/5'
                                  }`}
                                >
                                  <span
                                    className={`text-[11px] font-medium leading-tight truncate max-w-full ${
                                      sel ? 'text-emerald-200' : 'text-slate-400'
                                    }`}
                                  >
                                    {opt.shortLabel || opt.label}
                                  </span>
                                  <span className="text-[14px] font-extrabold text-emerald-400 tabular">
                                    {opt.odd.toFixed(2)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMatchId(ev.id);
                            setDetailMarketCat('Tous');
                            window.scrollTo({top: 0, behavior: 'smooth'});
                          }}
                          className="bg-[#1f2a40] border border-[#36486b] hover:border-sky-400 hover:bg-sky-500/10 text-slate-100 px-3.5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                        >
                          <span>+{totalOptions} marchés</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-[#26334d]/70 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAnalysis(ev.id)}
                          className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Analyse rapide</span>
                          {isAnalysisOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isAnalysisOpen && (
                          <div className="bg-[#0f172a] border border-[#26334d] rounded-lg px-3.5 py-2.5 text-xs text-slate-300 leading-relaxed">
                            {ev.analysis}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* NIVEAU 2 : FICHE DÉTAILLÉE D'UN MATCH */
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveMatchId(null)}
                className="bg-[#111827] border border-[#36486b] hover:border-sky-400 hover:bg-[#1f2a40] text-slate-100 px-3.5 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux matchs</span>
              </button>
              <span className="text-xs text-slate-400 tabular">
                {countEventMarkets(activeMatch)} possibilités de paris disponibles
              </span>
            </div>

            <div className="bg-gradient-to-br from-[#162238] to-[#111827] border border-[#36486b] rounded-2xl p-5 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                  <span className="text-sky-400 font-semibold">{activeMatch.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeMatch.region}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">{activeMatch.competition}</span>
                </div>
                {renderStatusText(activeMatch)}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100">
                {activeMatch.title}
              </h2>
              <p className="text-sm text-slate-400">{activeMatch.scoreInfo}</p>

              <div className="pt-2 border-t border-[#26334d]/70 flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => toggleAnalysis(activeMatch.id)}
                  className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyse rapide</span>
                  {openAnalysisIds.has(activeMatch.id) ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {openAnalysisIds.has(activeMatch.id) && (
                  <div className="bg-[#0f172a] border border-[#26334d] rounded-lg px-3.5 py-2.5 text-xs text-slate-300 leading-relaxed">
                    {activeMatch.analysis}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-[#111827] border border-[#26334d] p-2.5 rounded-xl">
              {DETAIL_MARKET_CATS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDetailMarketCat(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    detailMarketCat === cat
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold'
                      : 'bg-[#161f30] border-[#26334d] text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {activeMatch.marketGroups
                .filter((g) => detailMarketCat === 'Tous' || g.category === detailMarketCat)
                .map((grp) => {
                  const gKey = `${activeMatch.id}__${grp.id}`;
                  const isCollapsed = collapsedGroupIds.has(gKey);
                  const optsInGrp = grp.lines.reduce((s, l) => s + l.options.length, 0);
                  const isFinished = activeMatch.status === 'Terminés';

                  return (
                    <div
                      key={grp.id}
                      className="bg-[#161f30] border border-[#26334d] rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(gKey)}
                        className={`w-full px-4 py-3 bg-[#111827]/70 hover:bg-[#1f2a40] flex items-center justify-between text-left text-sm font-bold text-slate-100 cursor-pointer ${
                          isCollapsed ? '' : 'border-b border-[#26334d]'
                        }`}
                      >
                        <span>{grp.title}</span>
                        <span className="flex items-center gap-2.5 text-xs font-medium text-slate-400 tabular">
                          <span>{optsInGrp} options</span>
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div className="p-3.5 flex flex-col gap-2.5">
                          {grp.lines.map((line) => (
                            <div
                              key={line.marketId}
                              className={
                                line.lineLabel
                                  ? 'grid grid-cols-1 sm:grid-cols-[118px_1fr] gap-2.5 items-center'
                                  : ''
                              }
                            >
                              {line.lineLabel && (
                                <div className="text-xs font-bold text-slate-300 bg-[#111827] border border-[#26334d] rounded-lg px-2.5 py-2 text-center sm:text-center">
                                  {line.lineLabel}
                                </div>
                              )}
                              <div
                                className="grid gap-2"
                                style={{
                                  gridTemplateColumns: `repeat(${line.options.length}, minmax(0, 1fr))`,
                                }}
                              >
                                {line.options.map((opt) => {
                                  const sel = isSelected(activeMatch.id, line.marketId, opt.id);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      disabled={isFinished}
                                      onClick={() =>
                                        toggleSelection(activeMatch.id, line.marketId, opt.id)
                                      }
                                      className={`rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                        line.lineLabel
                                          ? 'px-3 py-2.5 flex items-center justify-between gap-2'
                                          : 'px-2.5 py-2.5 flex flex-col items-center justify-center gap-0.5 text-center'
                                      } ${
                                        sel
                                          ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500'
                                          : 'bg-[#111827] border-[#26334d] hover:border-emerald-500/60 hover:bg-emerald-500/5'
                                      }`}
                                    >
                                      <span
                                        className={`text-xs font-medium ${
                                          sel ? 'text-emerald-200' : 'text-slate-300'
                                        }`}
                                      >
                                        {opt.label}
                                      </span>
                                      <span className="text-sm font-extrabold text-emerald-400 tabular">
                                        {opt.odd.toFixed(2)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* TICKET MULTI-SÉLECTIONS (Desktop sticky + Mobile drawer) */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <aside
        aria-label="Ticket de pari"
        className={`bg-[#161f30] border border-[#26334d] rounded-2xl p-4 shadow-2xl flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] ${
          mobileDrawerOpen
            ? 'fixed bottom-0 left-0 right-0 z-50 rounded-b-none max-h-[88vh] translate-y-0 transition-transform duration-200'
            : 'hidden lg:flex'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#26334d] shrink-0">
          <div className="flex items-center gap-2 font-bold text-base text-slate-100">
            <ReceiptText className="w-4 h-4 text-emerald-400" />
            <span>Ticket</span>
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-extrabold px-2 py-0.5 rounded-md tabular">
              {ticketSelections.length}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {ticketSelections.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTicketSelections([]);
                  setGlobalStakeVal('');
                }}
                className="text-xs text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tout effacer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden bg-[#1f2a40] border border-[#36486b] text-slate-200 px-2.5 py-1 rounded-lg text-xs cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {ticketSelections.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 text-sm flex flex-col items-center gap-2.5">
            <Target className="w-7 h-7 text-slate-500" />
            <p>
              Cliquez sur une ou plusieurs cotes (depuis la liste ou la fiche détaillée d’un match)
              pour constituer votre ticket.
            </p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="grid grid-cols-2 gap-1.5 bg-[#111827] p-1 rounded-xl border border-[#26334d] mb-3 shrink-0">
              <button
                type="button"
                onClick={() => handleModeSwitch('single')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  slipMode === 'single'
                    ? 'bg-[#1f2a40] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paris simples
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('combo')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  slipMode === 'combo'
                    ? 'bg-[#1f2a40] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Combiné
              </button>
            </div>

            <div className="overflow-y-auto pr-0.5 mb-3 flex flex-col gap-2.5">
              {ticketSelections.map((sel) => (
                <div
                  key={sel.key}
                  className="bg-[#111827] border border-[#26334d] rounded-xl p-2.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-100 leading-snug">
                        {sel.eventTitle}
                      </div>
                      <div className="text-[11px] text-slate-400">{sel.marketName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTicketSelections((prev) => prev.filter((s) => s.key !== sel.key))
                      }
                      aria-label="Retirer cette sélection"
                      className="w-6 h-6 rounded-md bg-white/5 border border-[#26334d] text-slate-400 hover:text-rose-400 grid place-items-center shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#1f2a40] px-2.5 py-1.5 rounded-lg text-xs">
                    <span className="font-semibold text-slate-100">{sel.label}</span>
                    <span className="text-emerald-400 font-extrabold tabular">
                      {sel.odd.toFixed(2)}
                    </span>
                  </div>

                  {slipMode === 'single' && (
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>
                        Gain :{' '}
                        <strong className="text-emerald-400 tabular">
                          {formatCredits((Number(sel.stake) || 0) * sel.odd)}
                        </strong>
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={sel.stake}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTicketSelections((prev) =>
                            prev.map((item) => (item.key === sel.key ? {...item, stake: v} : item)),
                          );
                        }}
                        placeholder="Mise"
                        className="w-24 bg-[#161f30] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-right tabular"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-[#111827] border border-[#26334d] rounded-xl p-2.5 mb-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 gap-2">
                <span>
                  {slipMode === 'single'
                    ? 'Mise globale (chaque pari)'
                    : 'Mise globale du combiné'}
                </span>
                <span className="tabular">Dispo : {formatCredits(state.balance)}</span>
              </div>
              <input
                type="number"
                min={1}
                step={1}
                value={globalStakeVal}
                onChange={(e) => handleGlobalStakeChange(e.target.value)}
                placeholder="Ex : 50"
                className="w-full bg-[#161f30] border border-[#26334d] focus:border-sky-400 focus:outline-none text-slate-100 px-3 py-2 rounded-lg text-sm font-bold tabular mb-2"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickStake(50)}
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1.5 rounded-lg text-xs font-semibold cursor-pointer tabular"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStake(100)}
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1.5 rounded-lg text-xs font-semibold cursor-pointer tabular"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStake(undefined, true)}
                  className="bg-[#1f2a40] hover:bg-[#283652] border border-[#26334d] text-slate-100 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            {slipMode === 'combo' && (
              <div className="flex items-center justify-between bg-sky-500/10 border border-sky-400/30 rounded-lg px-3 py-2 mb-2.5 text-xs shrink-0">
                <span className="text-sky-200">Cote totale du combiné</span>
                <strong className="text-sky-300 text-sm font-extrabold tabular">
                  {slipCalculations.comboOdds.toFixed(2)}
                </strong>
              </div>
            )}

            <div className="bg-[#111827] rounded-xl px-3 py-2.5 mb-2.5 flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Mise totale engagée</span>
                <strong className="text-slate-100 tabular">
                  {formatCredits(slipCalculations.totalStake)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Gain potentiel total</span>
                <strong className="text-emerald-400 text-base font-extrabold tabular">
                  {formatCredits(slipCalculations.totalWin)}
                </strong>
              </div>
            </div>

            {slipCalculations.error && (
              <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-3 py-2 rounded-lg mb-2.5 shrink-0">
                {slipCalculations.error}
              </div>
            )}

            <button
              type="button"
              disabled={!slipCalculations.canSubmit}
              onClick={handleSubmitTicket}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-950 font-extrabold text-sm py-3 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {slipCalculations.submitLabel}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile bottom floating bar */}
      {ticketSelections.length > 0 && !mobileDrawerOpen && (
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="lg:hidden fixed bottom-3 left-3.5 right-3.5 z-30 bg-[#1f2a40] border border-emerald-500 rounded-xl px-4 py-2.5 shadow-2xl flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <div className="text-[11px] text-slate-400">Votre ticket multi-sélections</div>
            <div className="text-sm font-bold text-slate-100 truncate max-w-[200px]">
              {ticketSelections.length === 1
                ? `1 sélection : ${ticketSelections[0].label} (${ticketSelections[0].odd.toFixed(2)})`
                : `${ticketSelections.length} sélections dans le ticket`}
            </div>
          </div>
          <span className="bg-emerald-500 text-emerald-950 px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap">
            Voir le ticket →
          </span>
        </button>
      )}
    </section>
  );
}
