/**
 * Revenue calculator.
 *
 * Answers one question: if this company is billing for N megawatts, what
 * revenue does that imply, and what would that be worth per share?
 *
 * It is a chain of four multiplications, and its honesty depends entirely on
 * saying which links are sourced and which are opinions:
 *
 *   billing MW        - disclosed, or T2C-estimated from acceptance
 *   x $/MW/year       - DERIVED by arithmetic from the company's own contracts
 *   = run-rate revenue
 *   x EV/Revenue      - AN OPINION. A model input, never a disclosure.
 *   = enterprise value
 *   / shares          - provider-supplied or reader-supplied, never invented
 *   = value per share
 *
 * The result therefore reports a `basis` for every input, and the interface
 * prints it. A number built from an opinion is not made sourced by the fact that
 * three of the four inputs were.
 *
 * This is not a valuation. Enterprise value is not equity value: it ignores net
 * debt, which T2C does not carry. `equityCaveat` says so, and the UI shows it.
 */

export const DEFAULT_EV_REVENUE_MULTIPLE = 6;

const round = (n, dp = 2) => {
  if (!Number.isFinite(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

/**
 * @param billingMw       megawatts currently billing
 * @param perMwYearM      $m of revenue per MW per year
 * @param evRevenue       EV / revenue multiple (opinion)
 * @param sharesOutstandingM  shares in millions
 * @param currentPrice    live price, for the comparison only
 */
export function revenueModel({
  billingMw = null,
  perMwYearM = null,
  evRevenue = DEFAULT_EV_REVENUE_MULTIPLE,
  sharesOutstandingM = null,
  currentPrice = null
} = {}) {
  const missing = [];
  if (!Number.isFinite(billingMw) || billingMw <= 0) missing.push('billing capacity');
  if (!Number.isFinite(perMwYearM) || perMwYearM <= 0) missing.push('revenue per MW per year');

  if (missing.length) {
    return {
      available: false, missing,
      reason: `Cannot model without ${missing.join(' and ')}.`,
      runRateRevenueM: null, enterpriseValueM: null, perShare: null
    };
  }

  const runRateRevenueM = billingMw * perMwYearM;

  const multipleOk = Number.isFinite(evRevenue) && evRevenue > 0;
  const enterpriseValueM = multipleOk ? runRateRevenueM * evRevenue : null;

  const sharesOk = Number.isFinite(sharesOutstandingM) && sharesOutstandingM > 0;
  const perShare = enterpriseValueM !== null && sharesOk
    ? enterpriseValueM / sharesOutstandingM
    : null;

  // Only compare against a real, positive price.
  const priceOk = Number.isFinite(currentPrice) && currentPrice > 0;
  const upside = perShare !== null && priceOk ? (perShare / currentPrice) - 1 : null;

  return {
    available: true,
    missing: [],
    reason: null,

    billingMw,
    perMwYearM,
    runRateRevenueM: round(runRateRevenueM, 1),
    runRateRevenueBn: round(runRateRevenueM / 1000, 2),

    evRevenue: multipleOk ? evRevenue : null,
    enterpriseValueM: enterpriseValueM === null ? null : round(enterpriseValueM, 0),
    enterpriseValueBn: enterpriseValueM === null ? null : round(enterpriseValueM / 1000, 2),

    sharesOutstandingM: sharesOk ? sharesOutstandingM : null,
    perShare: perShare === null ? null : round(perShare, 2),
    perShareAvailable: perShare !== null,
    perShareMissing: perShare === null
      ? (!multipleOk ? ['an EV/revenue multiple'] : ['a share count'])
      : [],

    currentPrice: priceOk ? currentPrice : null,
    upside: upside === null ? null : round(upside, 4),

    equityCaveat:
      'This is enterprise value per share, not equity value per share. It does not subtract net debt, ' +
      'which T2C does not carry for any tracked company. A company with material borrowings is worth ' +
      'less per share than this figure implies.',
    modelCaveat:
      'The EV/revenue multiple is an opinion, not a disclosure. Change it and every figure below it ' +
      'changes. Nothing here is a price target or a recommendation.'
  };
}

/**
 * Sensitivity across a range of multiples, so the reader sees how much of the
 * answer is the multiple rather than the megawatts.
 */
export function multipleSensitivity(base, multiples = [3, 4, 6, 8, 10, 12]) {
  if (!base.available || !Number.isFinite(base.runRateRevenueM)) return [];
  return multiples.map(m => {
    const ev = base.runRateRevenueM * m;
    const ps = base.sharesOutstandingM ? ev / base.sharesOutstandingM : null;
    return {
      multiple: m,
      enterpriseValueBn: round(ev / 1000, 2),
      perShare: ps === null ? null : round(ps, 2),
      upside: ps !== null && base.currentPrice ? round((ps / base.currentPrice) - 1, 4) : null,
      isBase: m === base.evRevenue
    };
  });
}

/**
 * What each input rests on. The UI prints this beside the number, so a reader can
 * see at a glance that the megawatts are sourced and the multiple is not.
 */
export const INPUT_BASIS = {
  billingMw: {
    disclosed: 'Disclosed by the company',
    estimated: 'Estimated by T2C from accepted capacity',
    user: 'Your input'
  },
  perMwYearM: {
    derived: 'Derived by arithmetic from this company\'s own disclosed contracts',
    user: 'Your input'
  },
  evRevenue: { model: 'Model input — an opinion, not a disclosure', user: 'Your input' },
  shares: {
    provider: 'Supplied by the market data provider',
    user: 'Your input',
    missing: 'Not available — supply a share count for a per-share figure'
  }
};
