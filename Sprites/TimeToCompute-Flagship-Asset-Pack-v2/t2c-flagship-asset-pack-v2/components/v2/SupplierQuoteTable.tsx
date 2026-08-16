import type { MarketQuote, SupplierReference } from '../../data/content-model';

type Props = {
  suppliers: SupplierReference[];
  quotesBySymbol: Record<string, MarketQuote | undefined>;
};

const price = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export function SupplierQuoteTable({ suppliers, quotesBySymbol }: Props) {
  return (
    <div className="supplier-table-wrap" role="region" aria-label="Public suppliers" tabIndex={0}>
      <table className="supplier-table">
        <thead><tr><th>Company</th><th>Role in the chain</th><th>Ticker</th><th>Price</th><th>State</th><th>Evidence</th></tr></thead>
        <tbody>
          {suppliers.map((supplier) => {
            const quote = quotesBySymbol[supplier.ticker];
            return (
              <tr key={supplier.companyId}>
                <th scope="row">{supplier.companyName}</th>
                <td>{supplier.role}<small>{supplier.relationship}</small></td>
                <td>{supplier.exchange}:{supplier.ticker}</td>
                <td className="t2c-quote" data-status={quote?.status ?? 'unavailable'}>
                  {quote?.price == null ? '—' : `${quote.currency} ${price.format(quote.price)}`}
                </td>
                <td>{quote ? `${quote.marketState} · ${quote.status}` : 'unavailable'}</td>
                <td><button type="button" data-evidence-ids={supplier.evidenceIds.join(',')}>View sources</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p aria-live="polite">Quotes show exchange, currency, market state and freshness. Quote failure does not affect research content.</p>
    </div>
  );
}

