export type Tone = 'neutral' | 'lime' | 'cyan' | 'amber';

export type ResponsiveAsset = {
  id: string;
  basePath: string;
  fallbackPath: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  alt: string;
  maxCssWidth: number;
  optics?: { scale: number; x: string; y: string };
};

export type SupplyChainStage = {
  id: string;
  name: string;
  shortDefinition: string;
  simpleDefinition: string;
  href: string;
  tone: Tone;
  asset: ResponsiveAsset;
};

const stageAsset = (
  id: string,
  alt: string,
  optics: NonNullable<ResponsiveAsset['optics']>,
): ResponsiveAsset => ({
  id,
  basePath: `/assets/t2c/responsive/stage-${id}`,
  fallbackPath: `/assets/t2c/responsive/stage-${id}-1280.png`,
  intrinsicWidth: 1280,
  intrinsicHeight: 1280,
  alt,
  maxCssWidth: 180,
  optics,
});

export const supplyChainStages: SupplyChainStage[] = [
  {
    id: 'materials',
    name: 'Materials',
    shortDefinition: 'The physical inputs used to make computing hardware.',
    simpleDefinition: 'The raw ingredients.',
    href: '/explainers/materials',
    tone: 'amber',
    asset: stageAsset('materials', 'Cluster of semiconductor and electronics raw materials', { scale: .88, x: '0%', y: '2%' }),
  },
  {
    id: 'wafer',
    name: 'Wafers',
    shortDefinition: 'Polished discs on which semiconductor devices are fabricated.',
    simpleDefinition: 'The discs chips are built on.',
    href: '/explainers/wafers',
    tone: 'amber',
    asset: stageAsset('wafer', 'Patterned semiconductor wafer', { scale: .92, x: '0%', y: '0%' }),
  },
  {
    id: 'chips-hbm',
    name: 'Chips + HBM',
    shortDefinition: 'Compute processors and high-bandwidth memory packaged together.',
    simpleDefinition: 'The computing engines and their fastest nearby memory.',
    href: '/explainers/chips-hbm',
    tone: 'lime',
    asset: stageAsset('chips-hbm', 'AI processor and memory package', { scale: .86, x: '0%', y: '1%' }),
  },
  {
    id: 'photonics',
    name: 'Photonics',
    shortDefinition: 'Components that move data using light.',
    simpleDefinition: 'The light-based connections between computing systems.',
    href: '/explainers/photonics',
    tone: 'cyan',
    asset: stageAsset('photonics', 'Optical networking engine', { scale: .88, x: '0%', y: '0%' }),
  },
  {
    id: 'ai-factory',
    name: 'AI Factory',
    shortDefinition: 'The powered facility, networking and computing system.',
    simpleDefinition: 'The complete place where AI compute runs.',
    href: '/explainers/ai-factory',
    tone: 'neutral',
    asset: stageAsset('ai-factory', 'AI data-centre campus', { scale: .82, x: '0%', y: '3%' }),
  },
  {
    id: 'accepted',
    name: 'Accepted',
    shortDefinition: 'The customer has verified that contractual conditions were met.',
    simpleDefinition: 'The customer has checked and approved the delivery.',
    href: '/explainers/customer-acceptance',
    tone: 'neutral',
    asset: stageAsset('accepted', 'Customer acceptance symbol', { scale: .84, x: '0%', y: '0%' }),
  },
  {
    id: 'revenue',
    name: 'Revenue',
    shortDefinition: 'The point at which sales are recorded under the applicable accounting rules.',
    simpleDefinition: 'The point the company can record the sale.',
    href: '/explainers/revenue-recognition',
    tone: 'lime',
    asset: stageAsset('revenue', 'Revenue recognition growth symbol', { scale: .84, x: '0%', y: '0%' }),
  },
];

export type SupplierRelationship =
  | 'direct-manufacturer'
  | 'material-supplier'
  | 'production-equipment'
  | 'contract-manufacturer'
  | 'technology-enabler'
  | 'integrator'
  | 'customer'
  | 'ecosystem'
  | 'inferred-exposure';

export type SupplierReference = {
  companyId: string;
  companyName: string;
  ticker: string;
  exchange: string;
  role: string;
  relationship: SupplierRelationship;
  evidenceIds: string[];
};

export type ExplainerComponent = {
  id: string;
  name: string;
  abbreviation?: string;
  definition: string;
  simpleDefinition: string;
  significance: string;
  href: string;
  asset: ResponsiveAsset;
  supplierIds: string[];
  glossaryIds: string[];
};

const photonicsAsset = (id: string, alt: string): ResponsiveAsset => ({
  id,
  basePath: `/assets/t2c/responsive/photonics/${id}`,
  fallbackPath: `/assets/t2c/raster/photonics/${id}-master-1254.png`,
  intrinsicWidth: 1254,
  intrinsicHeight: 1254,
  alt,
  maxCssWidth: 480,
  optics: { scale: 1, x: '0%', y: '0%' },
});

export const photonicsComponents: ExplainerComponent[] = [
  {
    id: 'inp-substrate',
    name: 'Indium phosphide substrate',
    abbreviation: 'InP substrate',
    definition: 'A compound-semiconductor wafer used as the foundation for many high-speed lasers and photonic devices.',
    simpleDefinition: 'The specialist material the laser is built on.',
    significance: 'Its material properties support efficient light generation at telecom wavelengths.',
    href: '/what-is/inp-substrate',
    asset: photonicsAsset('inp-substrate', 'Indium phosphide semiconductor wafer'),
    supplierIds: [],
    glossaryIds: ['compound-semiconductor', 'telecom-wavelength'],
  },
  {
    id: 'cw-laser',
    name: 'Continuous-wave laser',
    abbreviation: 'CW laser',
    definition: 'A semiconductor light source that emits a continuous optical carrier.',
    simpleDefinition: 'A steady source of light that data can be placed onto.',
    significance: 'External or co-packaged optical systems can share stable laser light across high-speed links.',
    href: '/what-is/cw-laser',
    asset: photonicsAsset('cw-laser', 'Continuous-wave semiconductor laser package'),
    supplierIds: [],
    glossaryIds: ['optical-carrier'],
  },
  {
    id: 'eml',
    name: 'Electro-absorption modulated laser',
    abbreviation: 'EML',
    definition: 'A laser combined with a modulator that turns electrical information into rapid changes in optical light.',
    simpleDefinition: 'A laser that encodes data onto light.',
    significance: 'EMLs are used for high-speed optical connections where reach and signal quality matter.',
    href: '/what-is/eml',
    asset: photonicsAsset('eml', 'Electro-absorption modulated laser module'),
    supplierIds: [],
    glossaryIds: ['modulator', 'signal-integrity'],
  },
  {
    id: 'transceiver-1-6t',
    name: '1.6T optical transceiver',
    definition: 'A pluggable module that converts electrical network data into optical signals and back at aggregate speeds up to 1.6 terabits per second.',
    simpleDefinition: 'A removable box that turns electrical data into light and back again.',
    significance: 'Faster transceivers increase the amount of data that AI clusters can exchange.',
    href: '/what-is/optical-transceiver',
    asset: photonicsAsset('transceiver-1-6t', '1.6-terabit optical transceiver module'),
    supplierIds: [],
    glossaryIds: ['aggregate-bandwidth', 'pluggable'],
  },
  {
    id: 'cpo',
    name: 'Co-packaged optics',
    abbreviation: 'CPO',
    definition: 'An architecture that places optical engines beside the network switch chip in one assembly.',
    simpleDefinition: 'The light connection is moved much closer to the networking chip.',
    significance: 'Shorter electrical paths can reduce power and signal loss as network bandwidth rises.',
    href: '/what-is/co-packaged-optics',
    asset: photonicsAsset('cpo', 'Co-packaged optics assembly with a central switch chip and surrounding optical engines'),
    supplierIds: [],
    glossaryIds: ['switch-asic', 'electrical-path'],
  },
  {
    id: 'optical-fibre',
    name: 'Optical fibre',
    definition: 'A thin glass medium that guides light between optical components.',
    simpleDefinition: 'The glass pathway that carries the light.',
    significance: 'Fibre moves high-bandwidth data over useful distances with low signal loss.',
    href: '/what-is/optical-fibre',
    asset: photonicsAsset('optical-fibre', 'Spool of data-centre optical fibre with connectors'),
    supplierIds: [],
    glossaryIds: ['attenuation'],
  },
];

export type MarketQuote = {
  symbol: string;
  exchange: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  asOf: string | null;
  marketState: 'pre' | 'open' | 'after' | 'closed' | 'unknown';
  delayMinutes: number | null;
  status: 'live' | 'delayed' | 'stale' | 'unavailable';
};

export type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  sourceType: 'primary' | 'filing' | 'company-release' | 'industry' | 'secondary';
  lastVerified: string;
};

