export type SignalCardData = {
  id: string;
  title: string;
  happened: string;
  matters: string;
  next: string | null;
  category: string;
  materiality: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  sourceCount: number;
  affectedLabels: string[];
};

export function NewsSignalCard({ signal }: { signal: SignalCardData }) {
  return (
    <article className="signal-card" aria-labelledby={`signal-${signal.id}`}>
      <header>
        <span>{signal.category}</span>
        <span>{signal.materiality} materiality</span>
        <h2 id={`signal-${signal.id}`}>{signal.title}</h2>
      </header>
      <dl>
        <div><dt>What happened</dt><dd>{signal.happened}</dd></div>
        <div><dt>Why it matters</dt><dd>{signal.matters}</dd></div>
        {signal.next && <div><dt>What may happen next</dt><dd>{signal.next}</dd></div>}
      </dl>
      <p>Affected: {signal.affectedLabels.join(' · ')}</p>
      <footer>
        <button type="button">{signal.sourceCount} sources</button>
        <span>{signal.confidence} confidence</span>
        <button type="button">Mark reviewed</button>
      </footer>
    </article>
  );
}

