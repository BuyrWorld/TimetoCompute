/**
 * Photonics component suppliers.
 *
 * WHAT CHANGED ON INGESTION, and why it matters more than the list itself:
 *
 * The asset pack ships an editorial seed of seven companies, and its "Suggested
 * relationship" column marks four of them `Direct manufacturer` and one
 * `Material supplier`. Reading the seven cited documents, six of them establish
 * something narrower than that: the company MAKES a class of component. They
 * name no counterparty, no award and no order. That is capability, not a
 * relationship — and the pack's own rule is the one that catches it:
 *
 *   "Do not infer that a company is a direct supplier merely because it operates
 *    in the same market."
 *
 * A capability row rendered in the same style as an award row is the single
 * easiest way for a supplier table to mislead, because the reader assumes a
 * table of "suppliers to this stage" means somebody bought something.
 *
 * So the evidence grade is a separate field from the role, every row states
 * which it is, and the UI never gives a capability row the treatment of a
 * confirmed award. Exactly one row in this file is a named, dated,
 * company-to-company supply agreement: AXT to Lumentum.
 *
 * These are component suppliers to the photonics stage generally. NONE of them
 * is linked to a T2C-tracked operator, site or contract, because no document
 * says so.
 */

/**
 * Role in the chain, from DATA_AND_TRUST.md. What the company does.
 */
export const SUPPLIER_ROLES = {
  'material-supplier': {
    label: 'Material supplier',
    definition: 'Supplies the substrate or raw material other components are built on.'
  },
  'direct-manufacturer': {
    label: 'Component maker',
    definition: 'Manufactures the finished optical component itself.'
  },
  'technology-enabler': {
    label: 'Technology enabler',
    definition:
      'Supplies a part without which the component cannot work — a signal processor, a controller — ' +
      'but does not make the component.'
  },
  'contract-manufacturer': {
    label: 'Contract manufacturer',
    definition: 'Builds and packages components designed and sold by somebody else.'
  },
  'integrator': {
    label: 'Integrator',
    definition: 'Assembles components from several suppliers into a deployable system.'
  }
};

/**
 * How well the relationship is evidenced. This is the axis the seed collapsed,
 * and the one that decides how a row may be drawn.
 */
export const EVIDENCE_GRADES = {
  'supply-agreement': {
    label: 'Named supply agreement', rank: 4, tone: 'ok', confirmed: true,
    definition:
      'A named, dated agreement between two named companies, disclosed by one of them. The strongest ' +
      'record in this table.'
  },
  'volume-order': {
    label: 'Volume order won', rank: 3, tone: 'ok', confirmed: true,
    definition:
      'The company has disclosed winning a volume order. The counterparty may be withheld. An order ' +
      'is not a shipment and not recognised revenue.'
  },
  'demonstration': {
    label: 'Demonstrated only', rank: 2, tone: 'warn', confirmed: false,
    definition:
      'The company has shown the technology working. A demonstration is not a qualification, an ' +
      'order or a shipment.'
  },
  'capability': {
    label: 'Makes the component', rank: 1, tone: 'info', confirmed: false,
    definition:
      'The company publishes this product or describes this service. It establishes what the company ' +
      'makes and nothing about who buys it. No customer is named in the cited document.'
  }
};

const S = (id, o) => ({ id, ...o });

/**
 * `components` are ids from PHOTONICS_ART / the component explainers, so a
 * company appears on exactly the component pages its evidence covers rather
 * than on all six.
 */
export const PHOTONICS_SUPPLIERS = [
  S('axt', {
    company: 'AXT, Inc.', ticker: 'AXTI', exchange: 'NASDAQ',
    role: 'material-supplier',
    grade: 'supply-agreement',
    components: ['inp-substrate'],
    what: 'Manufactures compound-semiconductor substrates, including the indium-phosphide wafers ' +
      'that InP lasers are grown on.',
    evidence:
      'Definitive supplier agreement with Lumentum running to 31 December 2031, with a reserved ' +
      'minimum annual commitment of indium phosphide and two $43.5m deposits applied as shipment ' +
      'credits.',
    counterparty: 'Lumentum',
    asOf: '2026-07-29',
    sourceIds: ['axt-lumentum-inp-agreement']
  }),
  S('lumentum', {
    company: 'Lumentum Holdings', ticker: 'LITE', exchange: 'NASDAQ',
    role: 'direct-manufacturer',
    grade: 'capability',
    components: ['cw-laser', 'eml'],
    what: 'Produces indium-phosphide lasers, including electro-absorption modulated lasers for ' +
      'high-speed data-centre optics.',
    evidence:
      'Its own product page for a 200G PAM4 EML. Establishes that Lumentum makes EMLs. It names no ' +
      'customer — though AXT separately discloses supplying Lumentum, which is recorded on the ' +
      'substrate row above.',
    counterparty: null,
    asOf: '2026-08-16',
    sourceIds: ['lumentum-eml-product']
  }),
  S('coherent', {
    company: 'Coherent Corp.', ticker: 'COHR', exchange: 'NYSE',
    role: 'direct-manufacturer',
    grade: 'demonstration',
    components: ['optical-transceiver', 'cw-laser'],
    what: 'Produces optical communication components, laser and photonic devices, and transceivers.',
    evidence:
      'A demonstration of 1.6T optical transceivers built on 200G VCSELs. The company showed the ' +
      'technology working; it did not announce a qualification, an order or a shipment, and named ' +
      'no customer.',
    counterparty: null,
    asOf: '2025-04-01',
    sourceIds: ['coherent-1-6t-demonstration']
  }),
  S('aaoi', {
    company: 'Applied Optoelectronics', ticker: 'AAOI', exchange: 'NASDAQ',
    role: 'direct-manufacturer',
    grade: 'volume-order',
    components: ['optical-transceiver'],
    what: 'Produces data-centre optical transceivers and semiconductor lasers.',
    evidence:
      'First volume order for its 1.6T data-centre transceivers, from a long-standing customer the ' +
      'release describes only as a "major hyperscale customer". The order is disclosed; the buyer ' +
      'is not, and T2C does not guess which hyperscaler is meant.',
    counterparty: 'Withheld — "major hyperscale customer"',
    asOf: '2026-03-09',
    sourceIds: ['aaoi-1-6t-volume-order']
  }),
  S('marvell', {
    company: 'Marvell Technology', ticker: 'MRVL', exchange: 'NASDAQ',
    role: 'technology-enabler',
    grade: 'capability',
    components: ['optical-transceiver', 'co-packaged-optics'],
    what: 'Produces the PAM4 optical DSPs that let a transceiver push 1.6 terabits down a fibre pair.',
    evidence:
      'Its own product page for the Ara and Nova PAM4 DSP families, described as enabling 1.6T ' +
      'optical transceiver modules. Establishes capability; names no module maker as a customer.',
    counterparty: null,
    asOf: '2026-08-16',
    sourceIds: ['marvell-pam4-dsp']
  }),
  S('corning', {
    company: 'Corning Incorporated', ticker: 'GLW', exchange: 'NYSE',
    role: 'direct-manufacturer',
    grade: 'capability',
    components: ['optical-fibre'],
    what: 'Produces optical fibre, cable, connectors and high-density data-centre connectivity.',
    evidence:
      'Launch of GlassWorks AI Solutions, a portfolio of cable and connectivity products for the ' +
      'dense fibre infrastructure generative AI requires. A product launch, not an award from any ' +
      'named operator.',
    counterparty: null,
    asOf: '2025-03-27',
    sourceIds: ['corning-glassworks-ai']
  }),
  S('fabrinet', {
    company: 'Fabrinet', ticker: 'FN', exchange: 'NYSE',
    role: 'contract-manufacturer',
    grade: 'capability',
    components: ['optical-transceiver', 'eml', 'co-packaged-optics'],
    what: 'Provides advanced optical packaging and precision manufacturing for optical components ' +
      'and modules designed by others.',
    evidence:
      'Its FY2025 results, which describe the business as advanced optical packaging and precision ' +
      'manufacturing services to OEMs. Establishes the business model; names no optical customer.',
    counterparty: null,
    asOf: '2025-06-27',
    sourceIds: ['fabrinet-fy2025-results']
  })
];

export const SUPPLIER_BY_ID = Object.fromEntries(PHOTONICS_SUPPLIERS.map(s => [s.id, s]));

/** Suppliers whose evidence covers a given component. */
export const suppliersFor = componentId =>
  PHOTONICS_SUPPLIERS.filter(s => s.components.includes(componentId))
    .sort((a, b) => EVIDENCE_GRADES[b.grade].rank - EVIDENCE_GRADES[a.grade].rank);

/**
 * The sentence the supplier table must carry, written once.
 *
 * It is the difference between this table and a list of tickers with sector
 * exposure, and it is the claim most likely to be lost in a redesign.
 */
export const SUPPLIER_CAVEAT =
  'These companies make the components this stage depends on. Except where a row states a named ' +
  'agreement or a disclosed order, no document links them to any operator, site or contract T2C ' +
  'tracks — making a component is not the same as having been awarded work, and this table never ' +
  'implies otherwise.';
