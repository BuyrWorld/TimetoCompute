export type FinancialValue = {
  label: string;
  plainLabel: string;
  value: number | null;
  displayValue: string | null;
  period: string;
  basis: 'reported' | 'calculated' | 'estimated';
  sourceId: string;
  changeDisplay?: string | null;
};

export function FinancialMetricCard({ metric }: { metric: FinancialValue }) {
  return (
    <article className="financial-metric" data-basis={metric.basis}>
      <header><strong>{metric.label}</strong><span>{metric.plainLabel}</span></header>
      <p className="t2c-value" data-resolved={metric.value != null}>{metric.displayValue ?? '—'}</p>
      <footer>
        <span>{metric.period}</span>
        {metric.changeDisplay && <span>vs prior: {metric.changeDisplay}</span>}
        <button type="button" data-source-id={metric.sourceId}>Source</button>
        <span>{metric.basis}</span>
      </footer>
    </article>
  );
}

