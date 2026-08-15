/**
 * Company profiles: who these businesses are, who runs them, and where to find
 * their official material.
 *
 * SOURCING RULES ENFORCED HERE
 * - A current executive must cite an official source and carry verifiedAt.
 * - Co-CEO structures are first-class; nothing is forced into a single-CEO field.
 * - A social account appears ONLY if it was found linked from an official company
 *   domain. Every entry below was extracted from the company's own site on the
 *   accessed date — none were guessed, and a platform badge alone is not evidence.
 *   Where no official link could be found, the platform is simply absent.
 * - Disclosed customers appear only where the relationship is publicly stated in a
 *   source already in the register.
 * - Descriptions carry no numeric claims; numbers live in the capacity records
 *   where they can be sourced individually.
 */

const V = '2026-08-15';

/** Verified from an official company domain on the checked date. */
const social = (platform, label, handle, url, sourceId) => ({
  platform, label, handle, url,
  verifiedThroughOfficialSite: true,
  sourceId,
  lastCheckedAt: V
});

const exec = ({ id, name, title, roleType, roleStartedAt = null, isCurrent = true, biography = null, sourceIds, officialProfileUrl = null }) => ({
  id, name, title, roleType, roleStartedAt, roleEndedAt: null, isCurrent,
  biography, sourceIds, verifiedAt: V, officialProfileUrl, socials: []
});

export const PROFILES = [
  /* ==================== IREN ==================== */
  {
    id: 'iren', ticker: 'IREN', legalName: 'IREN Limited', tradingName: 'IREN',
    exchange: 'NASDAQ', cik: '1878848', foundedYear: null,
    headquarters: { city: 'Sydney', region: 'New South Wales', country: 'Australia' },
    websiteUrl: 'https://iren.com/',
    investorRelationsUrl: 'https://investors.iren.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001878848&type=&dateb=&owner=include&count=40',
    shortDescription:
      'IREN owns and operates data centres powered by a large secured electricity portfolio, and sells ' +
      'AI cloud capacity to hyperscalers and AI developers.',
    longDescription:
      'IREN is an Australian-listed operator that secures grid power at scale, builds data centres on ' +
      'that power, and increasingly sells finished GPU compute rather than leasing empty space. It ' +
      'converted from bitcoin mining infrastructure toward AI cloud, and is currently the only company ' +
      'tracked here with a hyperscaler tranche formally delivered and accepted.',
    businessModel: 'fullStack',
    primaryProductsOrServices: [
      'AI cloud compute sold by contract to hyperscalers and AI developers',
      'Owned and operated data centres built on self-secured grid power',
      'Bitcoin mining from earlier operations'
    ],
    geographicFootprint: ['United States (Texas)', 'Canada (British Columbia)', 'Australia', 'Spain'],
    disclosedKeyCustomers: ['Microsoft', 'NVIDIA'],
    leadership: [
      exec({
        id: 'iren-daniel-roberts', name: 'Daniel Roberts', title: 'Co-Founder and Co-Chief Executive Officer',
        roleType: 'co-ceo', sourceIds: ['iren-official-site', 'iren-q3-fy26-results'],
        biography: 'Co-founder and co-CEO of IREN, and a director of the company. Background in finance, infrastructure and renewables.'
      }),
      exec({
        id: 'iren-will-roberts', name: 'Will Roberts', title: 'Co-Founder and Co-Chief Executive Officer',
        roleType: 'co-ceo', sourceIds: ['iren-official-site', 'iren-q3-fy26-results'],
        biography: 'Co-founder and co-CEO of IREN, and a director of the company. Background in finance, real assets and commodities markets.'
      })
    ],
    socials: [
      social('linkedin', 'IREN Limited on LinkedIn', 'iren', 'https://linkedin.com/company/iren', 'iren-official-site'),
      social('x', 'IREN Limited on X', '@IREN_Ltd', 'https://x.com/IREN_Ltd', 'iren-official-site'),
      social('youtube', 'IREN Limited on YouTube', '@iren_co', 'https://www.youtube.com/@iren_co', 'iren-official-site')
    ],
    sourceIds: ['iren-official-site', 'iren-q3-fy26-results', 'iren-10q-20260331'],
    asOf: V, verifiedAt: V
  },

  /* ==================== CoreWeave ==================== */
  {
    id: 'coreweave', ticker: 'CRWV', legalName: 'CoreWeave, Inc.', tradingName: 'CoreWeave',
    exchange: 'NASDAQ', cik: '1769628', foundedYear: null,
    headquarters: { city: 'Livingston', region: 'New Jersey', country: 'United States' },
    websiteUrl: 'https://www.coreweave.com/',
    investorRelationsUrl: 'https://investors.coreweave.com/overview/default.aspx',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001769628&type=&dateb=&owner=include&count=40',
    shortDescription:
      'CoreWeave rents GPU compute by the hour from data centres it operates, selling finished AI ' +
      'infrastructure rather than empty powered space.',
    longDescription:
      'CoreWeave is a specialised AI cloud provider. It contracts power at scale, fills data centres ' +
      'with accelerators it owns, and sells that capacity to AI labs and enterprises under long-term ' +
      'commitments. It is the largest tracked operator by contracted power, and the only one that ' +
      'publishes both an active-power and a contracted-power figure in the same disclosure.',
    businessModel: 'fullStack',
    primaryProductsOrServices: [
      'GPU cloud compute sold under long-term customer contracts',
      'Managed AI infrastructure and Kubernetes-based services',
      'Owned accelerator fleet across leased and operated data centres'
    ],
    geographicFootprint: ['United States'],
    disclosedKeyCustomers: [],
    leadership: [
      exec({
        id: 'crwv-intrator', name: 'Michael Intrator', title: 'Co-Founder, Chairman and Chief Executive Officer',
        roleType: 'ceo', sourceIds: ['crwv-exec-management'],
        officialProfileUrl: 'https://investors.coreweave.com/governance/executive-management/default.aspx',
        biography: 'Co-founder of CoreWeave, serving as Chairman and Chief Executive Officer.'
      })
    ],
    socials: [
      social('x', 'CoreWeave on X', '@CoreWeave', 'https://x.com/CoreWeave', 'crwv-exec-management')
    ],
    sourceIds: ['crwv-exec-management', 'crwv-q2-2026-release'],
    asOf: V, verifiedAt: V
  },

  /* ==================== Nebius ==================== */
  {
    id: 'nebius', ticker: 'NBIS', legalName: 'Nebius Group N.V.', tradingName: 'Nebius',
    exchange: 'NASDAQ', cik: '1513845', foundedYear: null,
    headquarters: { city: 'Amsterdam', region: null, country: 'Netherlands' },
    websiteUrl: 'https://nebius.com/',
    investorRelationsUrl: 'https://group.nebius.com/investor-relations',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001513845&type=&dateb=&owner=include&count=40',
    shortDescription:
      'Nebius builds and operates AI cloud infrastructure in Europe and the United States, selling ' +
      'GPU compute to AI developers and large technology customers.',
    longDescription:
      'Nebius is a European full-stack AI infrastructure operator. It builds its own data centres, ' +
      'owns the accelerators inside them and sells compute capacity directly. Its original Finnish ' +
      'site is being expanded while a large US campus is developed, and management has set a ' +
      'materially raised contracted-power target for year end.',
    businessModel: 'fullStack',
    primaryProductsOrServices: [
      'AI cloud compute and GPU clusters',
      'Owned and operated AI data centres',
      'Developer platform and managed services'
    ],
    geographicFootprint: ['Finland', 'United States (Missouri)', 'Netherlands'],
    disclosedKeyCustomers: ['Meta Platforms'],
    leadership: [
      exec({
        id: 'nbis-volozh', name: 'Arkady Volozh', title: 'Founder and Chief Executive Officer',
        roleType: 'ceo', roleStartedAt: '2024-08-01',
        sourceIds: ['nbis-volozh-profile'],
        officialProfileUrl: 'https://nebius.com/board-of-directors/arkady-volozh',
        biography: 'Founder of the group and Chief Executive Officer since August 2024.'
      })
    ],
    socials: [
      social('x', 'Nebius on X', '@nebiusai', 'https://x.com/nebiusai', 'nbis-volozh-profile'),
      social('youtube', 'Nebius on YouTube', '@nebiusofficial', 'https://www.youtube.com/@nebiusofficial', 'nbis-volozh-profile'),
      social('facebook', 'Nebius on Facebook', 'nebiusofficial', 'https://www.facebook.com/nebiusofficial', 'nbis-volozh-profile')
    ],
    sourceIds: ['nbis-volozh-profile', 'nbis-q2-2026-shareholder-letter'],
    asOf: V, verifiedAt: V
  },

  /* ==================== TeraWulf ==================== */
  {
    id: 'terawulf', ticker: 'WULF', legalName: 'TeraWulf Inc.', tradingName: 'TeraWulf',
    exchange: 'NASDAQ', cik: null, foundedYear: 2021,
    headquarters: { city: 'Easton', region: 'Maryland', country: 'United States' },
    websiteUrl: 'https://www.terawulf.com/',
    investorRelationsUrl: 'https://investors.terawulf.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=terawulf&type=&dateb=&owner=include&count=40',
    shortDescription:
      'TeraWulf develops powered data-centre campuses and leases them to compute tenants under ' +
      'long-term agreements, rather than owning the accelerators itself.',
    longDescription:
      'TeraWulf converts sites with strong power positions into data-centre capacity and leases that ' +
      'capacity to customers on long terms. Its Lake Mariner campus in New York is generating revenue, ' +
      'and a very large lease at its Justified campus does not begin delivering until the second half ' +
      'of 2027 — the gap between contracted and delivered is the central question for the company.',
    businessModel: 'poweredShell',
    primaryProductsOrServices: [
      'Long-term data-centre leases to compute tenants',
      'Powered campus development on owned and acquired sites',
      'Power generation assets supporting those campuses'
    ],
    geographicFootprint: ['United States (New York, Maryland, Kentucky)'],
    disclosedKeyCustomers: ['Anthropic'],
    leadership: [
      exec({
        id: 'wulf-prager', name: 'Paul B. Prager', title: 'Co-Founder, Chairman and Chief Executive Officer',
        roleType: 'ceo', roleStartedAt: '2021-02-01',
        sourceIds: ['wulf-about'],
        officialProfileUrl: 'https://www.terawulf.com/about',
        biography: 'Co-founder of TeraWulf, serving as Chairman and Chief Executive Officer since February 2021. Previously founded and led Beowulf Electricity & Data.'
      })
    ],
    socials: [
      social('x', 'TeraWulf on X', '@terawulfinc', 'https://x.com/terawulfinc', 'wulf-about'),
      social('youtube', 'TeraWulf on YouTube', null, 'https://www.youtube.com/channel/UCE1jAE1nyqU6HedxgtdA4lQ', 'wulf-about'),
      social('instagram', 'TeraWulf on Instagram', 'terawulf', 'https://www.instagram.com/terawulf', 'wulf-about')
    ],
    sourceIds: ['wulf-about', 'wulf-q2-2026-results'],
    asOf: V, verifiedAt: V
  },

  /* ==================== Keel Infrastructure ==================== */
  {
    id: 'keel', ticker: 'KEEL', legalName: 'Keel Infrastructure Corp.', tradingName: 'Keel Infrastructure',
    exchange: 'NASDAQ', cik: '1812477', foundedYear: null,
    headquarters: { city: null, region: null, country: 'United States' },
    websiteUrl: 'https://www.keelinfra.com/',
    investorRelationsUrl: 'https://ir.keelinfra.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001812477&type=&dateb=&owner=include&count=40',
    shortDescription:
      'Keel Infrastructure develops powered data-centre sites in Pennsylvania, Washington State and ' +
      'Québec, converting former power-generation and mining sites toward AI and HPC use.',
    longDescription:
      'Formerly Bitfarms, Keel rebranded and redomiciled to the United States in April 2026 and now ' +
      'develops digital infrastructure on sites with established grid interconnections. Its portfolio ' +
      'is weighted toward development rather than operation: a substantially smaller amount of power ' +
      'is secured under executed supply agreements than the headline pipeline suggests, and no ' +
      'customer lease has been announced.',
    businessModel: 'poweredShell',
    primaryProductsOrServices: [
      'Powered data-centre site development for AI and HPC tenants',
      'Sites with established grid interconnections in the PJM market',
      'Bitcoin mining from earlier operations'
    ],
    geographicFootprint: ['United States (Pennsylvania, Washington)', 'Canada (Québec)'],
    disclosedKeyCustomers: [],
    leadership: [
      exec({
        id: 'keel-gagnon', name: 'Ben Gagnon', title: 'Chief Executive Officer',
        roleType: 'ceo', roleStartedAt: '2024-07-08',
        sourceIds: ['keel-gagnon-appointment', 'keel-rebrand-release'],
        biography: 'Appointed Chief Executive Officer in July 2024, and a director of the company. Led the rebrand from Bitfarms to Keel Infrastructure and the redomiciliation to the United States.'
      })
    ],
    socials: [
      social('x', 'Keel Infrastructure on X', '@keelinfra_', 'https://x.com/keelinfra_', 'keel-rebrand-release'),
      social('youtube', 'Keel Infrastructure on YouTube', '@keel-infra', 'https://www.youtube.com/@keel-infra', 'keel-rebrand-release')
    ],
    sourceIds: ['keel-rebrand-release', 'keel-gagnon-appointment', 'keel-10q'],
    asOf: V, verifiedAt: V
  },

  /* ==================== Applied Digital ==================== */
  {
    id: 'applied-digital', ticker: 'APLD', legalName: 'Applied Digital Corporation', tradingName: 'Applied Digital',
    exchange: 'NASDAQ', cik: '1144879', foundedYear: null,
    headquarters: { city: 'Dallas', region: 'Texas', country: 'United States' },
    websiteUrl: 'https://www.applieddigital.com/',
    investorRelationsUrl: 'https://ir.applieddigital.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001144879&type=&dateb=&owner=include&count=40',
    shortDescription:
      'Applied Digital builds large data-centre campuses and leases them to hyperscale customers on ' +
      'long initial terms, with the tenant supplying its own compute hardware.',
    longDescription:
      'Applied Digital develops purpose-built AI data centres across five named campuses and leases ' +
      'them under long initial terms. It has the largest disclosed customer-contracted critical IT ' +
      'figure of any company tracked here, and unlike several peers it publishes an exhaustive total ' +
      'rather than a set of individual deals.',
    businessModel: 'poweredShell',
    primaryProductsOrServices: [
      'Long-term data-centre leases to hyperscale customers',
      'Purpose-built AI campuses developed and operated in-house',
      'Cloud services from earlier operations'
    ],
    geographicFootprint: ['United States (North Dakota, Texas)'],
    disclosedKeyCustomers: ['CoreWeave'],
    leadership: [
      exec({
        id: 'apld-cummins', name: 'Wes Cummins', title: 'Chairman and Chief Executive Officer',
        roleType: 'ceo', sourceIds: ['apld-exec-team'],
        officialProfileUrl: 'https://ir.applieddigital.com/company-information/executive-team',
        biography: 'Chairman and Chief Executive Officer of Applied Digital, with a background as a technology investor.'
      })
    ],
    socials: [
      social('x', 'Applied Digital on X', '@APLDDigital', 'https://x.com/APLDDigital', 'apld-exec-team')
    ],
    sourceIds: ['apld-exec-team', 'apld-10k-20260531'],
    asOf: V, verifiedAt: V
  },

  /* ==================== Cipher Mining (watch-only) ==================== */
  {
    id: 'cipher', ticker: 'CIFR', legalName: 'Cipher Mining Inc.', tradingName: 'Cipher Mining',
    exchange: 'NASDAQ', cik: null, foundedYear: null,
    headquarters: { city: 'New York', region: 'New York', country: 'United States' },
    websiteUrl: 'https://www.ciphermining.com/',
    investorRelationsUrl: 'https://investors.ciphermining.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=cipher+mining&type=&dateb=&owner=include&count=40',
    shortDescription:
      'Cipher Mining develops and operates industrial-scale data centres in the United States, with ' +
      'operations rooted in bitcoin mining and an expanding HPC focus.',
    longDescription:
      'Cipher Mining is tracked on the watchlist for price and news context. T2C does not yet maintain ' +
      'sourced infrastructure-delivery records for the company.',
    businessModel: 'poweredShell',
    primaryProductsOrServices: ['Industrial-scale data centre operations', 'Bitcoin mining'],
    geographicFootprint: ['United States (Texas)'],
    disclosedKeyCustomers: [],
    leadership: [
      exec({
        id: 'cifr-page', name: 'Tyler Page', title: 'Chief Executive Officer',
        roleType: 'ceo', sourceIds: ['cifr-team'],
        officialProfileUrl: 'https://www.ciphermining.com/team',
        biography: 'Chief Executive Officer of Cipher Mining, with a background in institutional finance and fintech.'
      })
    ],
    socials: [
      social('x', 'Cipher Mining on X', '@CipherInc', 'https://x.com/CipherInc', 'cifr-team')
    ],
    sourceIds: ['cifr-team'],
    asOf: V, verifiedAt: V,
    deliveryTracked: false
  },

  /* ==================== NVIDIA (watch-only) ==================== */
  {
    id: 'nvidia', ticker: 'NVDA', legalName: 'NVIDIA Corporation', tradingName: 'NVIDIA',
    exchange: 'NASDAQ', cik: null, foundedYear: 1993,
    headquarters: { city: 'Santa Clara', region: 'California', country: 'United States' },
    websiteUrl: 'https://www.nvidia.com/',
    investorRelationsUrl: 'https://investor.nvidia.com/',
    secFilingsUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=nvidia&type=&dateb=&owner=include&count=40',
    shortDescription:
      'NVIDIA designs the accelerators, networking and software that most of the AI infrastructure ' +
      'tracked on this site is built around.',
    longDescription:
      'NVIDIA is tracked on the watchlist as the supplier underpinning the sector rather than as an ' +
      'infrastructure operator. T2C does not maintain infrastructure-delivery records for it.',
    businessModel: 'fullStack',
    primaryProductsOrServices: ['GPUs and AI accelerators', 'Networking and interconnect', 'AI software platforms'],
    geographicFootprint: ['United States', 'Global'],
    disclosedKeyCustomers: [],
    leadership: [
      exec({
        id: 'nvda-huang', name: 'Jensen Huang', title: 'Founder, President and Chief Executive Officer',
        roleType: 'ceo', sourceIds: ['nvda-board'],
        officialProfileUrl: 'https://www.nvidia.com/en-us/about-nvidia/board-of-directors/',
        biography: 'Founder of NVIDIA, serving as President and Chief Executive Officer.'
      })
    ],
    socials: [
      social('x', 'NVIDIA on X', '@nvidia', 'https://twitter.com/nvidia', 'nvda-board'),
      social('youtube', 'NVIDIA on YouTube', 'nvidia', 'https://www.youtube.com/user/nvidia', 'nvda-board'),
      social('instagram', 'NVIDIA on Instagram', 'nvidia', 'https://www.instagram.com/nvidia', 'nvda-board'),
      social('facebook', 'NVIDIA on Facebook', 'NVIDIA', 'https://www.facebook.com/NVIDIA', 'nvda-board')
    ],
    sourceIds: ['nvda-board'],
    asOf: V, verifiedAt: V,
    deliveryTracked: false
  }
];

export const PROFILE_BY_ID = Object.fromEntries(PROFILES.map(p => [p.id, p]));
export const PROFILE_BY_TICKER = Object.fromEntries(PROFILES.map(p => [p.ticker, p]));

export const PLATFORM_LABEL = {
  linkedin: 'LinkedIn', x: 'X', youtube: 'YouTube',
  instagram: 'Instagram', facebook: 'Facebook', other: 'Website'
};

/** Current executives only, co-CEOs preserved in order. */
export const currentLeadership = profile =>
  (profile.leadership || []).filter(e => e.isCurrent && !e.roleEndedAt);

export const chiefExecutives = profile =>
  currentLeadership(profile).filter(e => ['ceo', 'co-ceo'].includes(e.roleType));
