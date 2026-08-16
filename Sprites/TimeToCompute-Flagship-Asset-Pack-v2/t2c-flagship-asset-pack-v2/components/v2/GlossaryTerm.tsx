import type { ReactNode } from 'react';

type Props = {
  term: string;
  definition: string;
  children?: ReactNode;
};

export function GlossaryTerm({ term, definition, children }: Props) {
  return (
    <button
      type="button"
      className="t2c-glossary-term"
      aria-label={`${term}: ${definition}`}
      data-glossary-term={term}
    >
      {children ?? term}
    </button>
  );
}

// Replace the native title-like behaviour with the repository's accessible
// popover primitive. Focus must remain on the trigger; Escape closes it.

