/**
 * Source registry. Every figure on the site cites one of these by id.
 *
 * Keeping sources in one table means a document is described once, and a reader
 * can see every figure that rests on it. `isPrimary` marks documents published by
 * the company or a regulator — only a primary source can support a `confirmed`
 * value. All URLs were checked reachable on the audit date below.
 */
export const AUDIT_CUTOFF = '2026-08-15';

const S = (id, o) => ({ id, accessedAt: AUDIT_CUTOFF, ...o });

export const SOURCES = [

  /* ---------------- Company profiles, leadership and official links ----------------
     Each of these is an official company-controlled page. Socials were verified by
     extracting the links FROM these domains on the accessed date, not by searching
     for handles — an account we could not find linked from an official site is not
     displayed at all. */
  S('iren-official-site', {
    title: 'IREN Limited — official website',
    url: 'https://iren.com/', publisher: 'IREN Limited', sourceType: 'company-profile',
    publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official site footer links to linkedin.com/company/iren, x.com/IREN_Ltd and youtube.com/@iren_co.'
  }),
  S('crwv-exec-management', {
    title: 'CoreWeave — Executive Management',
    url: 'https://investors.coreweave.com/governance/executive-management/default.aspx',
    publisher: 'CoreWeave, Inc.', sourceType: 'company-profile', publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official investor-relations governance page listing executive management, including Michael Intrator as Chief Executive Officer.'
  }),
  S('nbis-volozh-profile', {
    title: 'Nebius Group — Arkady Volozh',
    url: 'https://nebius.com/board-of-directors/arkady-volozh',
    publisher: 'Nebius Group N.V.', sourceType: 'company-profile', publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official company profile page for Arkady Volozh, founder and Chief Executive Officer.'
  }),
  S('wulf-about', {
    title: 'TeraWulf — About Us',
    url: 'https://www.terawulf.com/about', publisher: 'TeraWulf Inc.', sourceType: 'company-profile',
    publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official about page describing the leadership team, including Paul B. Prager as co-founder, Chairman and Chief Executive Officer.'
  }),
  S('keel-gagnon-appointment', {
    title: 'Bitfarms Appoints Ben Gagnon as Chief Executive Officer',
    url: 'https://investor.bitfarms.com/news-releases/news-release-details/bitfarms-appoints-ben-gagnon-chief-executive-officer',
    publisher: 'Bitfarms Ltd (now Keel Infrastructure)', sourceType: 'company-ir',
    publishedAt: '2024-07-08', effectiveAt: '2024-07-08', isPrimary: true,
    supportingExcerpt: 'Official appointment release naming Ben Gagnon Chief Executive Officer.'
  }),
  S('keel-rebrand-release', {
    title: 'Bitfarms Officially Rebrands as Keel Infrastructure; Completes U.S. Redomiciliation',
    url: 'https://investor.bitfarms.com/news-releases/news-release-details/bitfarms-officially-rebrands-keel-infrastructure-completes-us',
    publisher: 'Keel Infrastructure', sourceType: 'company-ir',
    publishedAt: '2026-04-01', effectiveAt: '2026-04-01', isPrimary: true,
    supportingExcerpt: 'Rebrand from Bitfarms to Keel Infrastructure and redomiciliation from Canada to the United States; common stock began trading as KEEL on Nasdaq and TSX on 6 April 2026.'
  }),
  S('apld-exec-team', {
    title: 'Applied Digital — Executive Team',
    url: 'https://ir.applieddigital.com/company-information/executive-team',
    publisher: 'Applied Digital Corporation', sourceType: 'company-profile', publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official investor-relations executive team page listing Wes Cummins as Chairman and Chief Executive Officer.'
  }),
  S('cifr-team', {
    title: 'Cipher Mining — Executive Management',
    url: 'https://www.ciphermining.com/team', publisher: 'Cipher Mining Inc.', sourceType: 'company-profile',
    publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official executive management page listing Tyler Page as Chief Executive Officer.'
  }),
  S('nvda-board', {
    title: 'NVIDIA — Board of Directors',
    url: 'https://www.nvidia.com/en-us/about-nvidia/board-of-directors/',
    publisher: 'NVIDIA Corporation', sourceType: 'company-profile', publishedAt: '2026-08-15', isPrimary: true,
    supportingExcerpt: 'Official board page listing Jensen Huang as founder, President and Chief Executive Officer.'
  }),

  /* ---------------- CoreWeave ---------------- */
  S('crwv-q2-2026-release', {
    title: 'CoreWeave Reports Strong Second Quarter 2026 Results',
    url: 'https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx',
    publisher: 'CoreWeave, Inc.',
    sourceType: 'company-ir',
    publishedAt: '2026-08-11',
    effectiveAt: '2026-06-30',
    isPrimary: true,
    supportingExcerpt:
      'Expanded active power by nearly 500 MWs to reach 1.5 GW. Grew total contracted power to ' +
      'approximately 3.7 GW. Revenue backlog was approximately $104bn as of June 30, 2026.'
  }),
  S('crwv-q2-2026-call', {
    title: 'CoreWeave Second Quarter 2026 Earnings Conference Call',
    url: 'https://investors.coreweave.com/events-and-presentations/event-details/2026/CoreWeave-Second-Quarter-2026-Earnings-Conference-Call/default.aspx',
    publisher: 'CoreWeave, Inc.',
    sourceType: 'company-ir',
    publishedAt: '2026-08-11',
    effectiveAt: '2026-08-11',
    isPrimary: true,
    pageOrSection: 'Management remarks',
    supportingExcerpt:
      'Contracted power stated as approximately 4.2 GW on the call, above the 3.7 GW reported as of the 30 June quarter end.'
  }),

  /* ---------------- IREN ---------------- */
  S('iren-q3-fy26-results', {
    title: 'IREN Reports Q3 FY26 Results',
    url: 'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000025/irenreportsq3fy26results.htm',
    publisher: 'IREN Limited (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-03-31',
    effectiveAt: '2026-03-31',
    isPrimary: true,
    supportingExcerpt:
      '"...as we scale across our global 5GW secured power portfolio." Also: "2026 expansion to 480MW ' +
      'on track — Horizon 1-4 on track for delivery by year-end", and "2028+ expansion across 5GW ' +
      'secured power underway". Confirms 480 MW is a 2026 expansion target across multiple sites, not ' +
      'construction at one site.'
  }),
  S('iren-10q-20260331', {
    title: 'IREN Limited quarterly report, period ended 31 March 2026',
    url: 'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000026/iren-20260331.htm',
    publisher: 'IREN Limited (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-03-31',
    effectiveAt: '2026-03-31',
    isPrimary: true
  }),
  S('iren-8k-microsoft', {
    title: 'IREN Limited Form 8-K — Microsoft AI cloud agreement',
    url: 'https://www.sec.gov/Archives/edgar/data/1878848/000114036125040072/ef20058139_8k.htm',
    publisher: 'IREN Limited (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2025-11-03',
    isPrimary: true,
    supportingExcerpt: 'Microsoft contract for 200 MW of critical IT capacity, approximately $9.7bn, five-year average term.'
  }),
  S('iren-ex991-nvidia', {
    title: 'IREN Limited Exhibit 99.1 — NVIDIA agreement and AI cloud contracts',
    url: 'https://www.sec.gov/Archives/edgar/data/1878848/000114036126028871/ef20078253_ex99-1.htm',
    publisher: 'IREN Limited (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-06-01',
    isPrimary: true,
    supportingExcerpt: 'NVIDIA agreement for 60 MW, approximately $3.4bn over a five-year term. Additional AI developer contracts totalling approximately $2.8bn.'
  }),
  S('iren-horizon1-delivery', {
    title: 'IREN Delivers Horizon 1 to Microsoft and Achieves NVIDIA Exemplar Cloud Status on GB300 NVL72',
    url: 'https://www.globenewswire.com/news-release/2026/08/13/3344413/0/en/iren-delivers-horizon-1-to-microsoft-and-achieves-nvidia-exemplar-cloud-status-on-gb300-nvl72.html',
    publisher: 'IREN Limited via GlobeNewswire',
    sourceType: 'company-ir',
    publishedAt: '2026-08-13',
    effectiveAt: '2026-08-13',
    isPrimary: true,
    supportingExcerpt: 'Horizon 1, 50 MW of critical IT capacity, delivered to and accepted by Microsoft.'
  }),

  /* ---------------- Nebius ---------------- */
  S('nbis-q2-2026-ex992', {
    title: 'Nebius Group Exhibit 99.2 — Q2 2026 results',
    url: 'https://www.sec.gov/Archives/edgar/data/1513845/000110465926059872/tm2614392d1_ex99-2.htm',
    publisher: 'Nebius Group N.V. (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-08-07',
    effectiveAt: '2026-06-30',
    isPrimary: true
  }),
  S('nbis-q2-2026-shareholder-letter', {
    title: 'Nebius Group Q2 2026 shareholder letter',
    url: 'https://assets.nebius.com/assets/a6ecfd85-a6cb-4967-8ef7-9a25bd261f9c/SHLQ226.pdf',
    publisher: 'Nebius Group N.V.',
    sourceType: 'company-ir',
    publishedAt: '2026-08-07',
    effectiveAt: '2026-06-30',
    isPrimary: true,
    supportingExcerpt: 'Year-end contracted power target raised to 5 GW.'
  }),
  S('nbis-meta-agreement', {
    title: 'Nebius signs new AI infrastructure agreement with Meta',
    url: 'https://nebius.com/newsroom/nebius-signs-new-ai-infrastructure-agreement-with-meta',
    publisher: 'Nebius Group N.V.',
    sourceType: 'company-ir',
    publishedAt: '2026-06-01',
    isPrimary: true,
    supportingExcerpt:
      '$12bn dedicated-capacity commitment over five years, with up to a further $15bn relating to ' +
      'additional or otherwise unsold capacity — a maximum possible value of approximately $27bn.'
  }),
  S('nbis-q1-2026-ex991', {
    title: 'Nebius Group Exhibit 99.1 — Q1 2026 results',
    url: 'https://www.sec.gov/Archives/edgar/data/1513845/000110465926027886/tm268879d1_ex99-1.htm',
    publisher: 'Nebius Group N.V. (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-05-01',
    effectiveAt: '2026-03-31',
    isPrimary: true,
    supportingExcerpt: 'Contracted power stated as more than 3.5 GW.'
  }),

  /* ---------------- TeraWulf ---------------- */
  S('wulf-q2-2026-results', {
    title: 'TeraWulf Reports Second Quarter 2026 Results',
    url: 'https://investors.terawulf.com/news-events/press-releases/detail/144/terawulf-reports-second-quarter-2026-results',
    publisher: 'TeraWulf Inc.',
    sourceType: 'company-ir',
    publishedAt: '2026-08-11',
    effectiveAt: '2026-06-30',
    isPrimary: true,
    supportingExcerpt:
      'Lake Mariner: 102 MW of revenue-generating critical IT capacity, with a further 336 MW of ' +
      'critical IT under construction.'
  }),
  S('wulf-anthropic-lease', {
    title: 'TeraWulf Announces Anthropic Lease at Justified Data Campus and Sale of Majority Interest in Abernathy Joint Venture to Fluidstack',
    url: 'https://investors.terawulf.com/news-events/press-releases/detail/142/terawulf-announces-anthropic-lease-at-justified-data-campus-and-sale-of-majority-interest-in-abernathy-joint-venture-to-fluidstack',
    publisher: 'TeraWulf Inc.',
    sourceType: 'company-ir',
    publishedAt: '2026-08-04',
    isPrimary: true,
    supportingExcerpt:
      'Approximately 401 MW of critical IT capacity under a 20-year initial lease term, approximately ' +
      '$19bn of contracted revenue over the initial term. Initial capacity expected in H2 2027 with ' +
      'full delivery expected in early 2028. Sale of TeraWulf\'s 50.1% interest in the Abernathy joint venture.'
  }),
  S('wulf-kentucky-maryland', {
    title: 'TeraWulf Expands Digital and Power Infrastructure Portfolio with Strategic Acquisitions in Kentucky and Maryland',
    url: 'https://investors.terawulf.com/news-events/press-releases/detail/129/terawulf-expands-digital-and-power-infrastructure-portfolio-with-strategic-acquisitions-in-kentucky-and-maryland',
    publisher: 'TeraWulf Inc.',
    sourceType: 'company-ir',
    publishedAt: '2026-02-01',
    effectiveAt: '2026-02-01',
    isPrimary: true,
    supportingExcerpt:
      'Muskie: up to 1 GW of contracted electric service. Chesapeake: approximately 210 MW of ' +
      'operational generation with potential future campus scale of up to 1 GW.'
  }),

  S('ferc-ec26-58-morgantown', {
    title: 'FERC Order authorising acquisition of Morgantown Power LLC — 196 FERC ¶ 61,075, Docket EC26-58-000',
    url: 'https://elibrary.ferc.gov/eLibrary/filelist?accession_number=20260729-3047',
    publisher: 'Federal Energy Regulatory Commission',
    sourceType: 'regulator',
    publishedAt: '2026-07-29',
    effectiveAt: '2026-07-29',
    isPrimary: true,
    pageOrSection: 'Docket EC26-58-000, accession 20260729-3047',
    supportingExcerpt:
      'Authorises Chesapeake Data LLC, a wholly owned TeraWulf subsidiary, to acquire 100% of Morgantown ' +
      'Power LLC from Lanyard Power Holdings LLC, finding the transfer consistent with the public interest. ' +
      'Morgantown Power owns four operating oil-fired generating units totalling approximately 216 MW. ' +
      'The authorisation covers the ownership transfer ONLY: data centre development, new generation, gas ' +
      'infrastructure, battery storage and changes to PJM participation each require separate review.'
  }),

  /* ---------------- Keel Infrastructure ---------------- */
  S('keel-10k-bitfarms', {
    title: 'Bitfarms / Keel Infrastructure annual report (Form 10-K)',
    url: 'https://www.sec.gov/Archives/edgar/data/1812477/000121390026037514/ea0282809-10k_bitfarms.htm',
    publisher: 'Keel Infrastructure (formerly Bitfarms) (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-03-01',
    isPrimary: true
  }),
  S('keel-10q', {
    title: 'Keel Infrastructure quarterly report (Form 10-Q)',
    url: 'https://www.sec.gov/Archives/edgar/data/1812477/000121390026054166/ea0288134-10q_keel.htm',
    publisher: 'Keel Infrastructure (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-08-11',
    effectiveAt: '2026-06-30',
    isPrimary: true,
    pageOrSection: 'Capacity metrics table and definitions',
    supportingExcerpt:
      'Current Energized Capacity 341 MW; Secured Growth Capacity 430 MW; Secured Gross Data Center ' +
      'Capacity 648 MW; Identified Additional Gross Data Center Capacity 1,513 MW; Total Pipeline ' +
      '2,161 MW. "Secured Gross Data Center Capacity represents the total amount of gross power ' +
      'capacity that is subject to electric supply agreements with utilities, including both power ' +
      'capacity currently available on site and power capacity that utilities have agreed to deliver ' +
      'at a future date." Footnote: "The current energized capacity at the Panther Creek and Scrubgrass ' +
      'site of 60 MW and 63 MW, respectively, are not under an energy service agreement. The capacity ' +
      'is therefore excluded from Secured Gross Data Center Capacity."'
  }),
  S('keel-q2-2026-results', {
    title: 'Keel Infrastructure Reports Second Quarter 2026 Results',
    url: 'https://investor.bitfarms.com/news-releases/news-release-details/keel-infrastructure-reports-second-quarter-2026-results',
    publisher: 'Keel Infrastructure',
    sourceType: 'company-ir',
    publishedAt: '2026-08-11',
    effectiveAt: '2026-06-30',
    isPrimary: true,
    supportingExcerpt:
      '"With a development pipeline of 2.2 gigawatts and established grid interconnections in place." ' +
      'Also: "uncommitted 2027 capacity across PJM and Washington", zoning and land development ' +
      'approvals secured at Panther Creek, environmental permit applications progressing at Sharon, ' +
      'and first Vertiv modules delivered at Moses Lake. This release carries the rounded pipeline and ' +
      'the permitting narrative only; the itemised capacity table is in the Form 10-Q.'
  }),
  S('bitfarms-6k-2026', {
    title: 'Bitfarms Ltd Form 6-K — management discussion and analysis',
    url: 'https://www.sec.gov/Archives/edgar/data/1812477/000121390025074626/ea025191601ex99-2_bitfarms.htm',
    publisher: 'Bitfarms Ltd (now Keel Infrastructure) (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2025-08-01',
    isPrimary: true,
    supportingExcerpt:
      'Names the PJM Interconnection Service Agreement for Scrubgrass — ISA No. 1795 — in connection ' +
      'with a 19 November 2021 PJM notice of breach alleging failure to give advance notice of plant ' +
      'modifications. Also characterises the Stronghold transaction as adding "up to 307 MW of ' +
      'potential power capacity, with an additional 648 MW of incremental potential power capacity", ' +
      'i.e. the 648 MW originated as a POTENTIAL figure and was only later reported as secured under ' +
      'executed supply agreements.'
  }),

  S('keel-investor-deck', {
    title: 'Keel Infrastructure investor presentation',
    url: 'https://ir.keelinfra.com/static-files/85345ed0-556d-4889-98d0-89808f8eb1df',
    publisher: 'Keel Infrastructure',
    sourceType: 'company-ir',
    publishedAt: '2026-08-11',
    isPrimary: true,
    supportingExcerpt:
      'Sharon 110 MW gross site capacity, of which 30 MW existing energised utility capacity and 80 MW ' +
      'under an energy-services agreement. Panther Creek 350 MW contracted firm power. Moses Lake 18 MW ' +
      'gross project capacity. Sherbrooke 96 MW conditional transfer and operation agreement.'
  }),

  /* ---------------- Applied Digital ---------------- */
  S('apld-10k-20260531', {
    title: 'Applied Digital Corporation annual report, fiscal year ended 31 May 2026',
    url: 'https://www.sec.gov/Archives/edgar/data/1144879/000114487926000048/apld-20260531.htm',
    publisher: 'Applied Digital Corporation (SEC EDGAR)',
    sourceType: 'sec-filing',
    publishedAt: '2026-07-15',
    effectiveAt: '2026-05-31',
    isPrimary: true,
    supportingExcerpt:
      '1,410 MW of contracted critical IT capacity across five campuses, approximately $36.2bn of ' +
      'contracted revenue over initial base terms, approximately 2.15 GW of gross grid-connected ' +
      'utility power, approximately 100 MW operational and revenue-generating, and approximately ' +
      '1.5 GW operating or under construction.'
  }),
  S('apld-delta-forge-2', {
    title: 'Applied Digital Signs 210 MW Lease at Delta Forge 2',
    url: 'https://ir.applieddigital.com/news-events/press-releases/detail/154/applied-digital-signs-210-mw-lease-at-delta-forge-2',
    publisher: 'Applied Digital Corporation',
    sourceType: 'company-ir',
    publishedAt: '2026-08-05',
    isPrimary: true,
    supportingExcerpt:
      '210 MW lease with a high investment-grade hyperscaler, approximately $5.2bn over a 15-year ' +
      'initial term, under construction with expected delivery in H1 2028.'
  }),

  /* ---------------- Customer model families ----------------
     Each of these is the customer's OWN published model index. They are primary
     evidence for one narrow thing: which model families that company publishes.
     They say nothing about capacity, contracts or where a model runs, and are
     never cited for any of those. */
  S('anthropic-model-index', {
    accessedAt: '2026-08-16',
    title: 'Claude models overview',
    url: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    publisher: 'Anthropic PBC', sourceType: 'company-profile',
    publishedAt: '2026-08-16', isPrimary: true,
    supportingExcerpt:
      'Anthropic\'s own model index, describing Claude as its family of large language models and ' +
      'listing the currently available members of that family.'
  }),
  S('meta-llama-index', {
    accessedAt: '2026-08-16',
    title: 'Llama model cards and prompt formats',
    url: 'https://developer.meta.com/ai/docs/model-cards-and-prompt-formats/',
    publisher: 'Meta Platforms, Inc.', sourceType: 'company-profile',
    publishedAt: '2026-08-16', isPrimary: true,
    supportingExcerpt:
      'Meta\'s own model-card index for the Llama family of open-weight models.'
  }),
  S('msft-azure-openai-models', {
    accessedAt: '2026-08-16',
    title: 'Azure OpenAI in Foundry Models',
    url: 'https://azure.microsoft.com/en-us/products/ai-foundry/models/openai',
    publisher: 'Microsoft Corporation', sourceType: 'company-profile',
    publishedAt: '2026-08-16', isPrimary: true,
    supportingExcerpt:
      'Microsoft\'s own product page for OpenAI models hosted and operated by Azure and billed through ' +
      'an Azure subscription.'
  }),
  S('msft-phi-models', {
    accessedAt: '2026-08-16',
    title: 'Phi open models',
    url: 'https://azure.microsoft.com/en-us/products/phi',
    publisher: 'Microsoft Corporation', sourceType: 'company-profile',
    publishedAt: '2026-08-16', isPrimary: true,
    supportingExcerpt:
      'Microsoft\'s own product page describing Phi as its family of small language models, released ' +
      'openly under the MIT licence.'
  }),
  S('nvidia-nemotron-models', {
    accessedAt: '2026-08-16',
    title: 'NVIDIA Nemotron open models',
    url: 'https://www.nvidia.com/en-us/ai-data-science/foundation-models/nemotron/',
    publisher: 'NVIDIA Corporation', sourceType: 'company-profile',
    publishedAt: '2026-08-16', isPrimary: true,
    supportingExcerpt:
      'NVIDIA\'s own product page for Nemotron, described as a family of open models with open weights, ' +
      'training data and recipes for building AI agents.'
  })
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s]));

export const sourcesFor = ids => (ids || []).map(id => SOURCE_BY_ID[id]).filter(Boolean);

/** True when at least one cited source is company/regulator-published. */
export const hasPrimary = ids => sourcesFor(ids).some(s => s.isPrimary);
