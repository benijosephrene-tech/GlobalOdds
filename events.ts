import {FakePlayer, MarketGroup, SportEvent} from '../types';

export const INITIAL_BALANCE = 1000;
export const UNIT = 'DEMO_HTG';
export const STORAGE_KEY = 'globalodds_demo_htg_v4';

export const CATEGORIES = [
  'Tous',
  'Football',
  'Basketball',
  'Tennis',
  'E-sport',
  'MMA & Boxe',
  'Sports mécaniques',
  'Événements mondiaux',
];

export const STATUSES = ['Tous', 'À venir', 'En cours', 'Terminés'];

export const QUICK_MARKETS = [
  {id: '1x2', label: '1N2'},
  {id: 'dc', label: 'Double chance'},
  {id: 'ou25', label: 'Total buts 2.5'},
  {id: 'btts', label: 'Les 2 équipes marquent'},
];

export const DETAIL_MARKET_CATS = [
  'Tous',
  'Résultat',
  'Nombre de buts',
  'Buts par équipe',
  'Handicap',
];

function r2(n: number): number {
  return Number(n.toFixed(2));
}

function buildFootballGroups(
  home: string,
  away: string,
  o1: number,
  ox: number,
  o2: number,
  tilt = 1.0,
): MarketGroup[] {
  const dc1x = Math.max(1.08, r2((1 / (1 / o1 + 1 / ox)) * 0.96));
  const dc12 = Math.max(1.08, r2((1 / (1 / o1 + 1 / o2)) * 0.96));
  const dcx2 = Math.max(1.08, r2((1 / (1 / ox + 1 / o2)) * 0.96));
  const hBias = o1 < o2 ? 0.88 : 1.12;
  const aBias = o2 < o1 ? 0.88 : 1.14;

  return [
    {
      id: 'grp-1x2',
      category: 'Résultat',
      title: 'Résultat du match (1N2)',
      quickTag: '1x2',
      lines: [
        {
          marketId: 'm-1x2',
          marketName: 'Résultat du match (1N2)',
          lineLabel: null,
          options: [
            {id: '1', label: `1 · ${home}`, shortLabel: home, odd: o1},
            {id: 'X', label: 'X · Nul', shortLabel: 'Nul', odd: ox},
            {id: '2', label: `2 · ${away}`, shortLabel: away, odd: o2},
          ],
        },
      ],
    },
    {
      id: 'grp-dc',
      category: 'Résultat',
      title: 'Double chance',
      quickTag: 'dc',
      lines: [
        {
          marketId: 'm-dc',
          marketName: 'Double chance',
          lineLabel: null,
          options: [
            {id: '1X', label: `1X (${home} ou Nul)`, shortLabel: '1X', odd: dc1x},
            {id: '12', label: `12 (${home} ou ${away})`, shortLabel: '12', odd: dc12},
            {id: 'X2', label: `X2 (Nul ou ${away})`, shortLabel: 'X2', odd: dcx2},
          ],
        },
      ],
    },
    {
      id: 'grp-btts',
      category: 'Résultat',
      title: 'Les deux équipes marquent',
      quickTag: 'btts',
      lines: [
        {
          marketId: 'm-btts',
          marketName: 'Les deux équipes marquent',
          lineLabel: null,
          options: [
            {id: 'yes', label: 'Oui', shortLabel: 'Oui', odd: r2(1.72 * tilt)},
            {id: 'no', label: 'Non', shortLabel: 'Non', odd: r2(2.05 / Math.sqrt(tilt))},
          ],
        },
      ],
    },
    {
      id: 'grp-ou-total',
      category: 'Nombre de buts',
      title: 'Nombre de buts (Total match)',
      lines: [
        {
          marketId: 'm-ou-05',
          marketName: 'Total match (0.5)',
          lineLabel: '0.5 buts',
          options: [
            {id: 'over', label: '> 0.5', odd: r2(1.05 * Math.sqrt(tilt))},
            {id: 'under', label: '< 0.5', odd: r2(9.5 / tilt)},
          ],
        },
        {
          marketId: 'm-ou-15',
          marketName: 'Total match (1.5)',
          lineLabel: '1.5 buts',
          options: [
            {id: 'over', label: '> 1.5', odd: r2(1.24 * tilt)},
            {id: 'under', label: '< 1.5', odd: r2(3.75 / tilt)},
          ],
        },
        {
          marketId: 'm-ou-25',
          marketName: 'Total match (2.5)',
          lineLabel: '2.5 buts',
          quickTag: 'ou25',
          options: [
            {id: 'over', label: '> 2.5', shortLabel: '> 2.5', odd: r2(1.82 * tilt)},
            {id: 'under', label: '< 2.5', shortLabel: '< 2.5', odd: r2(1.98 / Math.sqrt(tilt))},
          ],
        },
        {
          marketId: 'm-ou-35',
          marketName: 'Total match (3.5)',
          lineLabel: '3.5 buts',
          options: [
            {id: 'over', label: '> 3.5', odd: r2(3.05 * tilt)},
            {id: 'under', label: '< 3.5', odd: r2(1.36 / Math.sqrt(tilt))},
          ],
        },
      ],
    },
    {
      id: 'grp-home-goals',
      category: 'Buts par équipe',
      title: `Total de buts — Équipe à domicile (${home})`,
      lines: [
        {
          marketId: 'm-h-05',
          marketName: `${home} Total (0.5)`,
          lineLabel: '0.5 buts',
          options: [
            {id: 'over', label: '> 0.5', odd: r2(1.18 * hBias * Math.sqrt(tilt))},
            {id: 'under', label: '< 0.5', odd: r2(4.4 / hBias)},
          ],
        },
        {
          marketId: 'm-h-15',
          marketName: `${home} Total (1.5)`,
          lineLabel: '1.5 buts',
          options: [
            {id: 'over', label: '> 1.5', odd: r2(1.95 * hBias * tilt)},
            {id: 'under', label: '< 1.5', odd: r2(1.82 / hBias)},
          ],
        },
        {
          marketId: 'm-h-25',
          marketName: `${home} Total (2.5)`,
          lineLabel: '2.5 buts',
          options: [
            {id: 'over', label: '> 2.5', odd: r2(4.1 * hBias * tilt)},
            {id: 'under', label: '< 2.5', odd: r2(1.22 / Math.sqrt(hBias))},
          ],
        },
      ],
    },
    {
      id: 'grp-away-goals',
      category: 'Buts par équipe',
      title: `Total de buts — Équipe à l'extérieur (${away})`,
      lines: [
        {
          marketId: 'm-a-05',
          marketName: `${away} Total (0.5)`,
          lineLabel: '0.5 buts',
          options: [
            {id: 'over', label: '> 0.5', odd: r2(1.28 * aBias * Math.sqrt(tilt))},
            {id: 'under', label: '< 0.5', odd: r2(3.45 / aBias)},
          ],
        },
        {
          marketId: 'm-a-15',
          marketName: `${away} Total (1.5)`,
          lineLabel: '1.5 buts',
          options: [
            {id: 'over', label: '> 1.5', odd: r2(2.45 * aBias * tilt)},
            {id: 'under', label: '< 1.5', odd: r2(1.52 / Math.sqrt(aBias))},
          ],
        },
        {
          marketId: 'm-a-25',
          marketName: `${away} Total (2.5)`,
          lineLabel: '2.5 buts',
          options: [
            {id: 'over', label: '> 2.5', odd: r2(5.8 * aBias * tilt)},
            {id: 'under', label: '< 2.5', odd: r2(1.12 / Math.sqrt(aBias))},
          ],
        },
      ],
    },
    {
      id: 'grp-handicap',
      category: 'Handicap',
      title: 'Handicap / Écart de buts',
      lines: [
        {
          marketId: 'm-hcp-01',
          marketName: 'Handicap (0:1)',
          lineLabel: 'Hcp (0:1)',
          options: [
            {id: '1', label: '1 (0:1)', odd: r2(o1 * 1.85)},
            {id: 'X', label: 'X (0:1)', odd: 3.7},
            {id: '2', label: '2 (0:1)', odd: dcx2},
          ],
        },
        {
          marketId: 'm-hcp-10',
          marketName: 'Handicap (1:0)',
          lineLabel: 'Hcp (1:0)',
          options: [
            {id: '1', label: '1 (1:0)', odd: dc1x},
            {id: 'X', label: 'X (1:0)', odd: 4.1},
            {id: '2', label: '2 (1:0)', odd: r2(o2 * 1.92)},
          ],
        },
        {
          marketId: 'm-hcp-02',
          marketName: 'Handicap (0:2)',
          lineLabel: 'Hcp (0:2)',
          options: [
            {id: '1', label: '1 (0:2)', odd: r2(o1 * 3.45)},
            {id: 'X', label: 'X (0:2)', odd: 5.2},
            {id: '2', label: '2 (0:2)', odd: Math.max(1.12, r2(dcx2 * 0.72))},
          ],
        },
      ],
    },
  ];
}

export const EVENTS: SportEvent[] = [
  {
    id: 'ev-1',
    category: 'Football',
    region: 'Europe',
    competition: 'Ligue des Champions UEFA',
    title: 'Real Madrid vs Bayern Munich',
    schedule: "En cours · 64'",
    status: 'En cours',
    scoreInfo: 'Score actuel : 1 - 1 · Santiago Bernabéu',
    marketGroups: buildFootballGroups('Real Madrid', 'Bayern Munich', 2.15, 3.1, 3.45, 0.92),
    analysis:
      "Le Real pousse fortement dans le couloir gauche (62 % de possession sur le dernier quart d'heure), tandis que le Bayern exploite chaque transition rapide.",
  },
  {
    id: 'ev-2',
    category: 'Football',
    region: 'Amérique du Sud',
    competition: 'Copa Libertadores',
    title: 'Flamengo vs River Plate',
    schedule: "Aujourd'hui · 21:30",
    status: 'À venir',
    scoreInfo: 'Estadio Maracanã, Rio de Janeiro',
    marketGroups: buildFootballGroups('Flamengo', 'River Plate', 1.92, 3.35, 3.9, 1.02),
    analysis:
      'Invaincu à domicile sur ses 8 derniers matchs continentaux, Flamengo aligne son trio offensif titulaire. River reste très solide sur coups de pied arrêtés.',
  },
  {
    id: 'ev-3',
    category: 'Football',
    region: 'Caraïbes & CONCACAF',
    competition: 'Ligue des Nations CONCACAF',
    title: 'Haïti vs Jamaïque',
    schedule: 'Demain · 20:00',
    status: 'À venir',
    scoreInfo: 'Match international · Groupe A',
    marketGroups: buildFootballGroups('Haïti', 'Jamaïque', 2.35, 3.15, 2.95, 0.98),
    analysis:
      "Duel très disputé dans la zone Caraïbes : les Grenadiers s'appuient sur des transitions rapides face au bloc physique des Reggae Boyz.",
  },
  {
    id: 'ev-4',
    category: 'Basketball',
    region: 'Amérique du Nord',
    competition: 'NBA · Conférence Ouest',
    title: 'Denver Nuggets vs Los Angeles Lakers',
    schedule: 'Demain · 02:00',
    status: 'À venir',
    scoreInfo: 'Ball Arena, Denver',
    marketGroups: [
      {
        id: 'grp-b-win',
        category: 'Résultat',
        title: 'Vainqueur (prolongations incluses)',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur du match',
            lineLabel: null,
            options: [
              {id: '1', label: 'Denver Nuggets', odd: 1.68},
              {id: '2', label: 'LA Lakers', odd: 2.25},
            ],
          },
        ],
      },
      {
        id: 'grp-b-pts',
        category: 'Nombre de buts',
        title: 'Total de points du match',
        lines: [
          {
            marketId: 'm-pts-218',
            marketName: 'Total points (218.5)',
            lineLabel: '218.5 pts',
            options: [
              {id: 'over', label: '> 218.5', odd: 1.55},
              {id: 'under', label: '< 218.5', odd: 2.38},
            ],
          },
          {
            marketId: 'm-pts-224',
            marketName: 'Total points (224.5)',
            lineLabel: '224.5 pts',
            quickTag: 'ou25',
            options: [
              {id: 'over', label: '> 224.5', odd: 1.88},
              {id: 'under', label: '< 224.5', odd: 1.92},
            ],
          },
          {
            marketId: 'm-pts-230',
            marketName: 'Total points (230.5)',
            lineLabel: '230.5 pts',
            options: [
              {id: 'over', label: '> 230.5', odd: 2.4},
              {id: 'under', label: '< 230.5', odd: 1.54},
            ],
          },
        ],
      },
      {
        id: 'grp-b-team',
        category: 'Buts par équipe',
        title: 'Total points par équipe',
        lines: [
          {
            marketId: 'm-den-114',
            marketName: 'Nuggets Total (114.5)',
            lineLabel: 'Nuggets 114.5',
            options: [
              {id: 'over', label: '> 114.5', odd: 1.85},
              {id: 'under', label: '< 114.5', odd: 1.95},
            ],
          },
          {
            marketId: 'm-lal-109',
            marketName: 'Lakers Total (109.5)',
            lineLabel: 'Lakers 109.5',
            options: [
              {id: 'over', label: '> 109.5', odd: 1.9},
              {id: 'under', label: '< 109.5', odd: 1.9},
            ],
          },
        ],
      },
      {
        id: 'grp-b-hcp',
        category: 'Handicap',
        title: 'Handicap de points',
        lines: [
          {
            marketId: 'm-hcp-45',
            marketName: 'Handicap (+/- 4.5)',
            lineLabel: 'Hcp 4.5',
            options: [
              {id: 'den', label: 'Nuggets -4.5', odd: 1.95},
              {id: 'lal', label: 'Lakers +4.5', odd: 1.85},
            ],
          },
          {
            marketId: 'm-hcp-75',
            marketName: 'Handicap (+/- 7.5)',
            lineLabel: 'Hcp 7.5',
            options: [
              {id: 'den', label: 'Nuggets -7.5', odd: 2.45},
              {id: 'lal', label: 'Lakers +7.5', odd: 1.52},
            ],
          },
        ],
      },
    ],
    analysis:
      "L'avantage de l'altitude et l'efficacité intérieure de Denver pèsent face à des Lakers en back-to-back.",
  },
  {
    id: 'ev-5',
    category: 'Tennis',
    region: 'Asie-Pacifique',
    competition: 'ATP Masters · Tokyo',
    title: 'Carlos Alcaraz vs Jannik Sinner',
    schedule: 'En cours · Set 2 (4-3)',
    status: 'En cours',
    scoreInfo: '1er set : 6-7 pour Sinner',
    marketGroups: [
      {
        id: 'grp-t-win',
        category: 'Résultat',
        title: 'Vainqueur du match',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur du match',
            lineLabel: null,
            options: [
              {id: '1', label: 'C. Alcaraz', odd: 2.3},
              {id: '2', label: 'J. Sinner', odd: 1.62},
            ],
          },
        ],
      },
      {
        id: 'grp-t-sets',
        category: 'Nombre de buts',
        title: 'Total de sets & jeux',
        lines: [
          {
            marketId: 'm-sets',
            marketName: 'Nombre de sets',
            lineLabel: 'Sets',
            quickTag: 'ou25',
            options: [
              {id: '2s', label: '2 sets', odd: 2.15},
              {id: '3s', label: '3 sets', odd: 1.68},
            ],
          },
          {
            marketId: 'm-games',
            marketName: 'Total jeux (22.5)',
            lineLabel: '22.5 jeux',
            options: [
              {id: 'over', label: '> 22.5', odd: 1.8},
              {id: 'under', label: '< 22.5', odd: 1.98},
            ],
          },
        ],
      },
      {
        id: 'grp-t-hcp',
        category: 'Handicap',
        title: 'Handicap de jeux',
        lines: [
          {
            marketId: 'm-thcp',
            marketName: 'Handicap jeux (+/- 2.5)',
            lineLabel: 'Hcp 2.5',
            options: [
              {id: 'alc', label: 'Alcaraz +2.5', odd: 1.85},
              {id: 'sin', label: 'Sinner -2.5', odd: 1.92},
            ],
          },
        ],
      },
    ],
    analysis:
      'Sinner affiche 81 % de points gagnés derrière sa première balle. Alcaraz multiplie les amorties pour casser le rythme.',
  },
  {
    id: 'ev-6',
    category: 'MMA & Boxe',
    region: 'Amérique du Nord / Monde',
    competition: 'UFC · Main Event Poids Légers',
    title: 'Islam Makhachev vs Arman Tsarukyan',
    schedule: 'Samedi · 23:45',
    status: 'À venir',
    scoreInfo: '5 rounds · T-Mobile Arena',
    marketGroups: [
      {
        id: 'grp-mma-win',
        category: 'Résultat',
        title: 'Vainqueur & Méthode',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur du combat',
            lineLabel: 'Vainqueur',
            options: [
              {id: '1', label: 'Makhachev', odd: 1.54},
              {id: '2', label: 'Tsarukyan', odd: 2.55},
            ],
          },
          {
            marketId: 'm-method',
            marketName: 'Méthode',
            lineLabel: 'Issue',
            options: [
              {id: 'ko', label: 'KO / Soumission', odd: 1.95},
              {id: 'dec', label: 'Décision', odd: 1.85},
            ],
          },
        ],
      },
      {
        id: 'grp-mma-rnd',
        category: 'Nombre de buts',
        title: 'Total de rounds',
        lines: [
          {
            marketId: 'm-rnd',
            marketName: 'Rounds (3.5)',
            lineLabel: '3.5 rounds',
            quickTag: 'ou25',
            options: [
              {id: 'over', label: '> 3.5', odd: 1.72},
              {id: 'under', label: '< 3.5', odd: 2.1},
            ],
          },
        ],
      },
    ],
    analysis:
      "Duel de lutte d'élite : les phases de scramble au sol et le cardio sur 5 rounds feront la différence.",
  },
  {
    id: 'ev-7',
    category: 'Sports mécaniques',
    region: 'Asie',
    competition: 'Formule 1 · Grand Prix de Suzuka',
    title: 'GP du Japon : Course Principale',
    schedule: 'Dimanche · 07:00',
    status: 'À venir',
    scoreInfo: '53 tours · Circuit de Suzuka',
    marketGroups: [
      {
        id: 'grp-f1-win',
        category: 'Résultat',
        title: 'Vainqueur du Grand Prix',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur GP',
            lineLabel: null,
            options: [
              {id: 'ver', label: 'Verstappen', odd: 2.1},
              {id: 'nor', label: 'Norris', odd: 2.85},
              {id: 'lec', label: 'Leclerc', odd: 4.5},
            ],
          },
        ],
      },
      {
        id: 'grp-f1-sc',
        category: 'Nombre de buts',
        title: 'Événements de course',
        lines: [
          {
            marketId: 'm-sc',
            marketName: 'Safety Car',
            lineLabel: 'Safety Car',
            options: [
              {id: 'yes', label: 'Oui', odd: 1.62},
              {id: 'no', label: 'Non', odd: 2.25},
            ],
          },
        ],
      },
    ],
    analysis:
      'Les enchaînements rapides du secteur 1 favorisent les monoplaces à fort appui aérodynamique.',
  },
  {
    id: 'ev-8',
    category: 'E-sport',
    region: 'Asie / Monde',
    competition: 'League of Legends · Worlds',
    title: 'T1 vs Gen.G',
    schedule: 'Demain · 11:00',
    status: 'À venir',
    scoreInfo: 'Bo5 · Demi-finale internationale',
    marketGroups: [
      {
        id: 'grp-es-win',
        category: 'Résultat',
        title: 'Vainqueur de la série',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur Bo5',
            lineLabel: null,
            options: [
              {id: '1', label: 'T1', odd: 2.05},
              {id: '2', label: 'Gen.G', odd: 1.78},
            ],
          },
        ],
      },
      {
        id: 'grp-es-maps',
        category: 'Nombre de buts',
        title: 'Total de parties',
        lines: [
          {
            marketId: 'm-maps',
            marketName: 'Total parties',
            lineLabel: 'Parties',
            quickTag: 'ou25',
            options: [
              {id: 'under', label: '< 4.5', odd: 1.55},
              {id: 'over', label: '5 parties', odd: 2.4},
            ],
          },
        ],
      },
      {
        id: 'grp-es-hcp',
        category: 'Handicap',
        title: 'Handicap de cartes',
        lines: [
          {
            marketId: 'm-ehcp',
            marketName: 'Handicap (+/- 1.5)',
            lineLabel: 'Hcp 1.5',
            options: [
              {id: 't1', label: 'T1 +1.5', odd: 1.42},
              {id: 'geng', label: 'Gen.G -1.5', odd: 2.65},
            ],
          },
        ],
      },
    ],
    analysis:
      'Gen.G domine le contrôle des objectifs neutres cette saison, mais T1 conserve un bilan supérieur en Bo5.',
  },
  {
    id: 'ev-9',
    category: 'Événements mondiaux',
    region: 'International',
    competition: 'Cinéma · Oscars',
    title: 'Cérémonie des Oscars : Palmarès',
    schedule: 'Clôture dans 4 jours',
    status: 'À venir',
    scoreInfo: 'Dolby Theatre, Los Angeles',
    marketGroups: [
      {
        id: 'grp-osc-win',
        category: 'Résultat',
        title: 'Meilleur Film',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-film',
            marketName: 'Meilleur Film',
            lineLabel: null,
            options: [
              {id: '1', label: "L'Horizon Silencieux", odd: 1.85},
              {id: '2', label: 'Ombres de Kyoto', odd: 2.9},
              {id: '3', label: 'Autre', odd: 4.5},
            ],
          },
        ],
      },
    ],
    analysis:
      'Après avoir remporté les prix des syndicats de producteurs et réalisateurs, « L’Horizon Silencieux » part favori.',
  },
  {
    id: 'ev-10',
    category: 'E-sport',
    region: 'Europe',
    competition: 'CS2 · Major de Cologne',
    title: 'Team Vitality vs FaZe Clan',
    schedule: 'Terminé · Score 2 - 1',
    status: 'Terminés',
    scoreInfo: 'Vainqueur : Team Vitality',
    marketGroups: [
      {
        id: 'grp-cs-win',
        category: 'Résultat',
        title: 'Vainqueur de la série',
        quickTag: '1x2',
        lines: [
          {
            marketId: 'm-win',
            marketName: 'Vainqueur Bo3',
            lineLabel: null,
            options: [
              {id: '1', label: 'Team Vitality', odd: 1.65},
              {id: '2', label: 'FaZe Clan', odd: 2.2},
            ],
          },
        ],
      },
    ],
    analysis:
      'Vitality a conclu la série sur Mirage grâce à une solide défense sur le site A.',
  },
];

export const FAKE_PLAYERS: FakePlayer[] = [
  {name: 'Kaito_Tokyo', avatar: 'JP', specialty: 'E-sport & Tennis', winRate: '64%', balance: 2840},
  {name: 'JeanLuc_PAP', avatar: 'HT', specialty: 'CONCACAF & Crash', winRate: '62%', balance: 2310},
  {name: 'ElenaV_Madrid', avatar: 'ES', specialty: 'Football européen', winRate: '60%', balance: 1990},
  {name: 'Marcus_NOLA', avatar: 'US', specialty: 'NBA & UFC', winRate: '58%', balance: 1650},
  {name: 'Sofia_Rio', avatar: 'BR', specialty: 'Copa Libertadores', winRate: '55%', balance: 1280},
  {name: 'Lucas_Paris', avatar: 'FR', specialty: 'Multi-marchés F1', winRate: '52%', balance: 920},
];
