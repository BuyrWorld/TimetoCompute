/**
 * The date through which every SEC filing by each tracked company has been
 * read and reflected in the record.
 *
 * This is the staleness line. The build compares it against EDGAR: any filing
 * after it is listed on the site as "not yet reviewed" and reported in the
 * daily GitHub issue, so the record can never silently fall behind the
 * filings again (it once sat two months stale).
 *
 * Move a company's date forward only after reading every filing up to it and
 * updating data/companies.js, projects.js, events.js and sources.js.
 */
export const REVIEWED_THROUGH = {
  iren: '2026-10-25',
  coreweave: '2026-10-25',
  nebius: '2026-10-25',
  terawulf: '2026-10-25',
  keel: '2026-10-25',
  'applied-digital': '2026-10-25'
};

/** SEC central index keys, so the build does not need the full ticker map. */
export const SEC_CIK = {
  iren: 1878848,
  coreweave: 1769628,
  nebius: 1513845,
  terawulf: 1083301,
  keel: 1812477,
  'applied-digital': 1144879
};
