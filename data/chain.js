/**
 * The AI supply chain, company by company: from raw materials to the people
 * who buy the compute and what they build with it.
 *
 * Two kinds of record, and the difference is the whole point:
 *
 *   COMPANIES — who sits at each stage and what they make, in the company's
 *               own words from its latest annual report. This is CAPABILITY.
 *               It says nothing about who buys from whom.
 *
 *   LINKS     — a named company-to-company relationship that one of the two
 *               companies has disclosed. Every link quotes the sentence that
 *               establishes it. Two companies in adjacent stages are NOT
 *               linked unless a document says so: "TSMC makes chips" and
 *               "NVIDIA sells chips" do not make TSMC an NVIDIA supplier —
 *               NVIDIA's 10-K saying so does.
 *
 * Stage ids are CHAIN_STAGES ids from data/chainstages.js.
 */

/** What flows along a link. Kept small so the map can colour by it. */
export const LINK_KINDS = {
  supplies: { label: 'Supplies', definition: 'The disclosing company names the other as a supplier of a product or service.' },
  contract: { label: 'Contract', definition: 'A named, signed agreement for capacity, compute or power.' },
  lease: { label: 'Lease', definition: 'Data-centre capacity leased to a named tenant.' },
  backing: { label: 'Credit backing', definition: 'A third party guarantees or supports another company\'s payment obligations.' },
  partnership: { label: 'Partnership', definition: 'A disclosed strategic or engineering partnership. Not, by itself, a purchase.' }
};

const C = (id, o) => ({ id, ...o });

export const CHAIN_COMPANIES = [
  /* ---------- 1. Raw materials ---------- */
  C('freeport', { name: 'Freeport-McMoRan', ticker: 'FCX', stage: 'materials',
    makes: 'Copper — the metal in every power cable, busbar and transformer winding.',
    excerpt: 'One of the world\'s "largest publicly traded copper producers."', sourceId: 'ar-fcx' }),
  C('mp-materials', { name: 'MP Materials', ticker: 'MP', stage: 'materials',
    makes: 'Rare earths, used in the magnets inside motors, fans, pumps and generators.',
    excerpt: '"The largest producer of rare earth materials in the Western Hemisphere."', sourceId: 'ar-mp' }),
  C('axt', { name: 'AXT', ticker: 'AXTI', stage: 'materials',
    makes: 'Compound-semiconductor wafers — the indium phosphide that optical lasers are grown on.',
    excerpt: '"Develops and produces high-performance compound and single element semiconductor substrates, also known as wafers."', sourceId: 'ar-axti' }),

  /* ---------- 2. Specialty processes ---------- */
  C('tsmc', { name: 'TSMC', ticker: 'TSM', stage: 'processes',
    makes: 'Manufactures other companies\' chip designs — the foundry behind most AI accelerators.',
    excerpt: '"As a foundry, we manufacture semiconductors using our manufacturing processes for our customers based on proprietary integrated circuit designs provided by them."', sourceId: 'ar-tsm' }),
  C('asml', { name: 'ASML', ticker: 'ASML', stage: 'processes',
    makes: 'Lithography machines, including the EUV systems used to print the most advanced chips.',
    excerpt: '"EUV lithography, a method that requires only one exposure per layer."', sourceId: 'ar-asml' }),
  C('applied-materials', { name: 'Applied Materials', ticker: 'AMAT', stage: 'processes',
    makes: 'The deposition, etch and inspection equipment chip factories run on.',
    excerpt: '"We provide equipment, services and software to the semiconductor and related industries."', sourceId: 'ar-amat' }),
  C('amkor', { name: 'Amkor', ticker: 'AMKR', stage: 'processes',
    makes: 'Packages and tests finished chips for other companies.',
    excerpt: '"The world\'s largest U.S. headquartered outsourced semiconductor assembly and test service provider."', sourceId: 'ar-amkr' }),

  /* ---------- 3. Photonics and interconnect ---------- */
  C('lumentum', { name: 'Lumentum', ticker: 'LITE', stage: 'photonics',
    makes: 'Lasers and optical components that carry data between AI servers as light.',
    excerpt: '"A global leader in optical and photonic technologies."', sourceId: 'ar-lite' }),
  C('coherent', { name: 'Coherent', ticker: 'COHR', stage: 'photonics',
    makes: 'Optical transceivers and lasers for AI data-centre networks.',
    excerpt: '"A leading supplier of optical transceivers for AI datacenter and networking applications."', sourceId: 'ar-cohr' }),
  C('fabrinet', { name: 'Fabrinet', ticker: 'FN', stage: 'photonics',
    makes: 'Builds optical and electronic products for the companies that design them.',
    excerpt: '"Advanced optical packaging and precision optical, electro-mechanical and electronic manufacturing services."', sourceId: 'ar-fn' }),
  C('marvell', { name: 'Marvell', ticker: 'MRVL', stage: 'photonics',
    makes: 'The signal-processing chips inside optical links, plus custom data-centre silicon.',
    excerpt: '"A leading supplier of data infrastructure semiconductor solutions, spanning the data center core to network edge."', sourceId: 'ar-mrvl' }),
  C('broadcom', { name: 'Broadcom', ticker: 'AVGO', stage: 'photonics',
    makes: 'Network switch chips and custom AI accelerators.',
    excerpt: '"Designs, develops and supplies a broad range of semiconductor and semiconductor-based solutions."', sourceId: 'ar-avgo' }),

  /* ---------- 4. Compute silicon and systems ---------- */
  C('nvidia', { name: 'NVIDIA', ticker: 'NVDA', stage: 'compute',
    makes: 'The GPUs, networking and rack-scale systems most AI runs on.',
    excerpt: '"Our data-center-scale offerings feature extreme co-design where the infrastructure\'s chips, networking, systems, software, and algorithms are holistically architected."', sourceId: 'ar-nvda' }),
  C('amd', { name: 'AMD', ticker: 'AMD', stage: 'compute',
    makes: 'Instinct AI accelerators and server CPUs.',
    excerpt: '"Instinct MI350X Series GPUs."', sourceId: 'ar-amd' }),
  C('micron', { name: 'Micron', ticker: 'MU', stage: 'compute',
    makes: 'Memory, including the high-bandwidth memory (HBM) stacked beside AI chips.',
    excerpt: '"HBM3E 12-high represented the majority of our HBM shipments."', sourceId: 'ar-mu' }),
  C('sk-hynix', { name: 'SK hynix', ticker: null, stage: 'compute',
    makes: 'Memory, including HBM for AI accelerators.',
    excerpt: 'Named by NVIDIA as a memory supplier: "We purchase memory from SK Hynix Inc., Micron Technology, Inc., and Samsung."', sourceId: 'ar-nvda' }),
  C('samsung', { name: 'Samsung Electronics', ticker: null, stage: 'compute',
    makes: 'Memory, and a foundry that manufactures chips for others.',
    excerpt: 'Named by NVIDIA as both a foundry and a memory supplier.', sourceId: 'ar-nvda' }),
  C('supermicro', { name: 'Supermicro', ticker: 'SMCI', stage: 'compute',
    makes: 'Assembles GPUs into complete servers and racks.',
    excerpt: '"We deliver rack-scale solutions optimized for various workloads, including artificial intelligence."', sourceId: 'ar-smci' }),
  C('dell', { name: 'Dell Technologies', ticker: 'DELL', stage: 'compute',
    makes: 'AI servers, storage and networking.',
    excerpt: '"Infrastructure solutions across servers, networking, and storage."', sourceId: 'ar-dell' }),

  /* ---------- 5. Power ---------- */
  C('ge-vernova', { name: 'GE Vernova', ticker: 'GEV', stage: 'power',
    makes: 'Gas turbines, grid equipment and the hardware that moves electricity.',
    excerpt: '"Gas turbines for utilities, independent power producers, and numerous industrial applications."', sourceId: 'ar-gev' }),
  C('eaton', { name: 'Eaton', ticker: 'ETN', stage: 'power',
    makes: 'Switchgear, UPS and power distribution inside the data centre.',
    excerpt: '"We make products for the data center, utility, industrial, commercial ... markets."', sourceId: 'ar-etn' }),
  C('constellation', { name: 'Constellation Energy', ticker: 'CEG', stage: 'power',
    makes: 'Electricity, largely from nuclear plants, sold to big users including data centres.',
    excerpt: '"We are also the largest nuclear energy company in the U.S."', sourceId: 'ar-ceg' }),
  C('bloom', { name: 'Bloom Energy', ticker: 'BE', stage: 'power',
    makes: 'Fuel cells that generate power on site, without waiting for the grid.',
    excerpt: '"A global leader in onsite power generation."', sourceId: 'ar-be' }),

  /* ---------- 6. Cooling and thermal ---------- */
  C('vertiv', { name: 'Vertiv', ticker: 'VRT', stage: 'cooling',
    makes: 'Liquid and air cooling, plus power equipment, for data-centre halls.',
    excerpt: '"We pioneer and deliver end-to-end power and cooling technologies."', sourceId: 'ar-vrt' }),
  C('nvent', { name: 'nVent', ticker: 'NVT', stage: 'cooling',
    makes: 'Enclosures, liquid-cooling and electrical protection for racks.',
    excerpt: '"A leading global provider of electrical connection and protection solutions."', sourceId: 'ar-nvt' }),
  C('modine', { name: 'Modine', ticker: 'MOD', stage: 'cooling',
    makes: 'Chillers and cooling systems, with a dedicated data-centre business.',
    excerpt: '"Data center growth fueled by artificial intelligence (AI), resulting in a commensurate need for data center cooling solutions."', sourceId: 'ar-mod' }),

  /* ---------- 7. Facility and construction ---------- */
  C('quanta', { name: 'Quanta Services', ticker: 'PWR', stage: 'facility',
    makes: 'Builds the transmission lines, substations and electrical work that connect sites to the grid.',
    excerpt: 'Serves "data center, advanced manufacturing, healthcare, pharmaceutical and industrial facilities."', sourceId: 'ar-pwr' }),
  C('emcor', { name: 'EMCOR', ticker: 'EME', stage: 'facility',
    makes: 'Electrical and mechanical construction inside the building.',
    excerpt: '"One of the largest specialty contractors in the United States."', sourceId: 'ar-eme' }),
  C('comfort-systems', { name: 'Comfort Systems USA', ticker: 'FIX', stage: 'facility',
    makes: 'Installs the mechanical, electrical and plumbing systems — cooling included.',
    excerpt: '"Mechanical and electrical systems are necessary to virtually all commercial, industrial and institutional buildings."', sourceId: 'ar-fix' }),

  /* ---------- 8. Operators (each has a full company page) ---------- */
  C('iren', { name: 'IREN', ticker: 'IREN', stage: 'operators', href: '/companies/iren/',
    makes: 'Builds its own data centres and rents out the GPUs inside them.', sourceId: 'iren-10k-fy26' }),
  C('coreweave', { name: 'CoreWeave', ticker: 'CRWV', stage: 'operators', href: '/companies/coreweave/',
    makes: 'An AI cloud: rents GPU compute by the hour to labs and big tech.', sourceId: 'ar-crwv' }),
  C('nebius', { name: 'Nebius', ticker: 'NBIS', stage: 'operators', href: '/companies/nebius/',
    makes: 'An AI cloud with its own data centres in Europe and the US.', sourceId: 'ar-nbis' }),
  C('terawulf', { name: 'TeraWulf', ticker: 'WULF', stage: 'operators', href: '/companies/terawulf/',
    makes: 'Builds powered data-centre halls and leases them to AI clouds.', sourceId: 'ar-wulf' }),
  C('applied-digital', { name: 'Applied Digital', ticker: 'APLD', stage: 'operators', href: '/companies/applied-digital/',
    makes: 'Builds AI data-centre campuses and leases them to hyperscalers.', sourceId: 'apld-10k-20260531' }),

  /* ---------- 9. Compute buyers ---------- */
  C('microsoft', { name: 'Microsoft', ticker: 'MSFT', stage: 'buyers',
    makes: 'Buys capacity for Azure and its own AI products.', sourceId: 'ar-msft' }),
  C('meta', { name: 'Meta', ticker: 'META', stage: 'buyers',
    makes: 'Buys capacity to train and run its own models across its apps.', sourceId: 'ar-meta' }),
  C('openai', { name: 'OpenAI', ticker: null, stage: 'buyers',
    makes: 'Buys compute to train and serve its GPT models.', sourceId: 'ar-crwv' }),
  C('google', { name: 'Google', ticker: 'GOOGL', stage: 'buyers',
    makes: 'Builds its own TPU chips and backs other companies\' capacity deals.', sourceId: 'ar-googl' }),
  C('anthropic', { name: 'Anthropic', ticker: null, stage: 'buyers',
    makes: 'Buys compute to train and serve its Claude models.', sourceId: 'wulf-anthropic-lease' }),
  C('fluidstack', { name: 'Fluidstack', ticker: null, stage: 'buyers',
    makes: 'An AI cloud that leases halls and resells the compute.', sourceId: 'ar-wulf' }),
  C('amazon', { name: 'Amazon', ticker: 'AMZN', stage: 'buyers',
    makes: 'Runs AWS, and buys optical manufacturing for its own network hardware.', sourceId: 'ar-amzn' }),

  /* ---------- 10. What it gets used for ---------- */
  C('app-copilot', { name: 'Copilot', ticker: null, stage: 'applications', owner: 'microsoft',
    makes: 'Microsoft\'s AI assistant across Windows, Office and GitHub.',
    excerpt: '"Copilot, Microsoft Teams, Microsoft 365 Consumer ..."', sourceId: 'ar-msft' }),
  C('app-azure-openai', { name: 'GPT models on Azure', ticker: null, stage: 'applications', owner: 'openai',
    makes: 'OpenAI\'s models, which Microsoft also hosts and sells through Azure.', sourceId: 'msft-azure-openai-models' }),
  C('app-meta-ai', { name: 'Meta AI and Llama', ticker: null, stage: 'applications', owner: 'meta',
    makes: 'Meta\'s assistant across its apps and glasses, built on its open Llama models.',
    excerpt: '"Meta AI is an assistant that\'s available across our apps, as a stand-alone app, on our AI glasses, and on the web."', sourceId: 'ar-meta' }),
  C('app-gemini', { name: 'Gemini', ticker: null, stage: 'applications', owner: 'google',
    makes: 'Google\'s models, used in Search and the Gemini app.',
    excerpt: '"Across our product ecosystem, including Search and the Gemini app."', sourceId: 'ar-googl' }),
  C('app-claude', { name: 'Claude', ticker: null, stage: 'applications', owner: 'anthropic',
    makes: 'Anthropic\'s models, sold directly and through cloud partners.', sourceId: 'anthropic-model-index' })
];

export const CHAIN_COMPANY_BY_ID = Object.fromEntries(CHAIN_COMPANIES.map(c => [c.id, c]));

const L = (from, to, o) => ({ id: `${from}>${to}`, from, to, ...o });

/**
 * `from` supplies or serves `to`. `discloser` is whose document says so —
 * usually the buyer, since suppliers rarely name customers.
 */
export const CHAIN_LINKS = [
  /* chips */
  L('tsmc', 'nvidia', { kind: 'supplies', what: 'Chip manufacturing', sourceId: 'ar-nvda',
    excerpt: '"We utilize foundries, such as Taiwan Semiconductor Manufacturing Company Limited, or TSMC, and Samsung ... to produce our semiconductor wafers."' }),
  L('samsung', 'nvidia', { kind: 'supplies', what: 'Chip manufacturing and memory', sourceId: 'ar-nvda',
    excerpt: '"We utilize foundries, such as ... TSMC, and Samsung" and "We purchase memory from SK Hynix Inc., Micron Technology, Inc., and Samsung."' }),
  L('sk-hynix', 'nvidia', { kind: 'supplies', what: 'Memory', sourceId: 'ar-nvda',
    excerpt: '"We purchase memory from SK Hynix Inc., Micron Technology, Inc., and Samsung."' }),
  L('micron', 'nvidia', { kind: 'supplies', what: 'Memory', sourceId: 'ar-nvda',
    excerpt: '"We purchase memory from SK Hynix Inc., Micron Technology, Inc., and Samsung."' }),
  L('fabrinet', 'nvidia', { kind: 'supplies', what: 'Assembly, test and packaging', sourceId: 'ar-nvda',
    excerpt: '"Contract manufacturers such as Hon Hai Precision Industry Co., Ltd., Wistron Corporation, and Fabrinet to perform assembly, testing and packaging of our final products."' }),
  L('tsmc', 'amd', { kind: 'supplies', what: 'Chip manufacturing', sourceId: 'ar-amd',
    excerpt: '"We rely on Taiwan Semiconductor Manufacturing Company Limited (TSMC) for the production of all wafers for microprocessor and GPU products at 7 nanometer (nm) or smaller nodes."' }),
  L('tsmc', 'broadcom', { kind: 'supplies', what: 'Chip manufacturing', sourceId: 'ar-avgo',
    excerpt: '"During fiscal year 2025, approximately 95% of the wafers manufactured by our CMs were produced by TSMC."' }),

  /* optics */
  L('axt', 'lumentum', { kind: 'contract', what: 'Indium phosphide wafers', sourceId: 'axt-lumentum-inp-agreement',
    excerpt: 'Definitive supplier agreement running to 31 December 2031, with a reserved minimum annual commitment of indium phosphide.' }),
  L('coherent', 'nvidia', { kind: 'contract', what: 'Lasers and optical networking', sourceId: 'ar-cohr',
    excerpt: '"Entered into a strategic multi-year supply agreement with NVIDIA for advanced lasers and optical networking products."' }),
  L('fabrinet', 'amazon', { kind: 'supplies', what: 'Manufacturing services', sourceId: 'ar-fn',
    excerpt: 'Amazon accounted for 11.5% of Fabrinet\'s accounts receivable at 26 June 2026, under "a commercial agreement".' }),

  /* hardware into the operators */
  L('nvidia', 'iren', { kind: 'supplies', what: 'GPUs', sourceId: 'iren-10k-fy26',
    excerpt: '"We source certain hardware solutions (such as GPUs, networking and storage equipment utilized for AI Cloud Services) from a limited number of suppliers, including NVIDIA, AMD, Dell Technologies..."' }),
  L('amd', 'iren', { kind: 'supplies', what: 'GPUs', sourceId: 'iren-10k-fy26',
    excerpt: 'Named among IREN\'s hardware suppliers: "including NVIDIA, AMD, Dell Technologies, Lenovo, Supermicro, Gigabyte."' }),
  L('dell', 'iren', { kind: 'supplies', what: 'Servers', sourceId: 'iren-10k-fy26',
    excerpt: 'Named among IREN\'s hardware suppliers: "including NVIDIA, AMD, Dell Technologies, Lenovo, Supermicro, Gigabyte."' }),
  L('supermicro', 'iren', { kind: 'supplies', what: 'Servers', sourceId: 'iren-10k-fy26',
    excerpt: 'Named among IREN\'s hardware suppliers: "including NVIDIA, AMD, Dell Technologies, Lenovo, Supermicro, Gigabyte."' }),
  L('nvidia', 'coreweave', { kind: 'supplies', what: 'GPU systems', sourceId: 'ar-crwv',
    excerpt: '"Deploy the industry\'s most advanced hardware and architectures first including NVIDIA GB200 and GB300 NVL72 systems."' }),
  L('nvidia', 'nebius', { kind: 'supplies', what: 'GPUs', sourceId: 'ar-nbis',
    excerpt: '"Our long-standing partnerships and collaboration with leading chipmakers and OEMs, such as NVIDIA."' }),
  L('vertiv', 'nvidia', { kind: 'partnership', what: 'Power and cooling designs for NVIDIA systems', sourceId: 'ar-vrt',
    excerpt: '"Our partnership with NVIDIA supports the development of advanced power and thermal infrastructure aligned with next-generation AI."' }),

  /* power */
  L('constellation', 'microsoft', { kind: 'contract', what: '20-year nuclear power purchase', sourceId: 'ar-ceg',
    excerpt: '"The restart is supported by a 20-year PPA with Microsoft to purchase the output generated from the renewed plant."' }),

  /* operators to buyers */
  L('iren', 'microsoft', { kind: 'contract', what: '200 MW of GPU cloud, ~$9.7bn over 5 years', sourceId: 'iren-8k-microsoft',
    excerpt: 'Five-year AI cloud services contract with Microsoft for capacity at Childress, Texas.' }),
  L('coreweave', 'openai', { kind: 'contract', what: 'GPU cloud, up to ~$6.5bn', sourceId: 'ar-crwv',
    excerpt: '"OpenAI has committed to pay us up to approximately $6.5 billion through May 31, 2031."' }),
  L('coreweave', 'meta', { kind: 'contract', what: 'GPU cloud, up to ~$14.2bn', sourceId: 'ar-crwv',
    excerpt: '"Meta Platforms, Inc. ("Meta") initially committed to pay us up to approximately $14.2 billion through December 2031."' }),
  L('nebius', 'microsoft', { kind: 'contract', what: 'Long-term GPU cloud', sourceId: 'ar-nbis',
    excerpt: '"We have secured longer-term customer contracts with Meta and Microsoft."' }),
  L('nebius', 'meta', { kind: 'contract', what: 'Five-year GPU cloud orders', sourceId: 'ar-nbis',
    excerpt: '"Entered into an Infrastructure Services Agreement with Meta Platforms, Inc. ... a series of orders, each for a duration of five years."' }),
  L('terawulf', 'fluidstack', { kind: 'lease', what: '378 MW at Lake Mariner', sourceId: 'ar-wulf',
    excerpt: '"Under the Akela Fluidstack Leases, we will provide 378 MW of critical IT load at the Lake Mariner Data Campus."' }),
  L('google', 'fluidstack', { kind: 'backing', what: 'Guarantees Fluidstack\'s lease payments', sourceId: 'ar-wulf',
    excerpt: '"The Akela Fluidstack Leases benefit from substantial credit support provided by Google, which supports Fluidstack\'s payment and performance obligations."' }),
  L('terawulf', 'anthropic', { kind: 'lease', what: '~401 MW at Justified Data Campus', sourceId: 'wulf-anthropic-lease',
    excerpt: 'Anthropic lease at the Justified Data Campus.' }),
  L('applied-digital', 'coreweave', { kind: 'lease', what: '400 MW at Polaris Forge 1', sourceId: 'apld-10k-20260531',
    excerpt: 'Applied Digital\'s 10-K: leases with CoreWeave "to deliver an aggregate of 250 MW," then "an additional 150 MW" at Polaris Forge 1.' }),
  L('amd', 'openai', { kind: 'contract', what: '6 GW of AMD GPUs', sourceId: 'ar-amd',
    excerpt: '"We entered into a product purchase agreement with OpenAI OpCo, LLC, (OpenAI) to deploy 6 gigawatts of AMD GPUs."' }),

  /* buyers to what they build */
  L('microsoft', 'app-copilot', { kind: 'supplies', what: 'Runs Copilot', sourceId: 'ar-msft', excerpt: 'Microsoft\'s own product.' }),
  L('openai', 'app-azure-openai', { kind: 'supplies', what: 'Builds the GPT models', sourceId: 'msft-azure-openai-models', excerpt: 'OpenAI\'s models, hosted by Azure.' }),
  L('microsoft', 'openai', { kind: 'partnership', what: 'Long-term strategic partnership', sourceId: 'ar-msft',
    excerpt: '"We have a long-term strategic partnership with OpenAI which was originally established in 2019."' }),
  L('meta', 'app-meta-ai', { kind: 'supplies', what: 'Builds Meta AI and Llama', sourceId: 'ar-meta', excerpt: 'Meta\'s own product.' }),
  L('google', 'app-gemini', { kind: 'supplies', what: 'Builds Gemini', sourceId: 'ar-googl', excerpt: 'Google\'s own product.' }),
  L('anthropic', 'app-claude', { kind: 'supplies', what: 'Builds Claude', sourceId: 'anthropic-model-index', excerpt: 'Anthropic\'s own product.' })
];

/**
 * The one sentence every surface that joins buyers to products repeats:
 * a link from Microsoft to Copilot says what Microsoft builds, never that
 * Copilot runs on IREN's halls. No document says which product runs where.
 */
export const USE_CAVEAT =
  'What a buyer builds is from its own reports. No company discloses which product runs in which ' +
  'data centre, so T2C never draws that line.';
