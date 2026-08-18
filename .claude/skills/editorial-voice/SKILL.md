---
name: editorial-voice
description: The T2C house voice. Load this before writing or editing any user-facing copy for timetocompute.com — site records, explainers, headlines, tooltips, empty states, error messages or metadata. Covers register, banned words, the hedges that must survive editing, and the acceptance-versus-billing distinction that runs through everything.
---

# T2C house voice

T2C tracks AI infrastructure from secured power to disclosed billing. Its
credibility rests entirely on sounding like something that would tell you when
it does not know. Every stylistic rule below serves that.

## The voice in one line

**A well-informed engineer explaining what a document actually says, to a smart
person who has never worked in a data centre.**

Not a journalist. Not an analyst. Not a marketer.

## Six rules

### 1 · Plain nouns before technical ones
Introduce the ordinary word, then the term. Never the reverse.

> Yes: "the discs that chips are printed on and then cut out of"
> Yes: "the customer has checked it works and agreed to take it"
> No:  "silicon substrate wafer fabrication inputs"

The existing chain-stage descriptions on the site are the benchmark. Match them.

### 2 · The hedge is the point
Where T2C does not know something, the sentence saying so is the most valuable
sentence on the page. It is never cut for length, never softened, never moved
below the fold.

> "T2C does not guess which hyperscaler is meant. Naming one would be the
> easiest invention on this page and the hardest for a reader to detect."

That is the register. Specific about what is unknown, and specific about why
guessing would be worse than a blank.

### 3 · Acceptance is not billing
This distinction runs through the whole product and must never blur.

- **Contracted** — a customer has signed
- **Energised** — power is live at the site
- **Accepted** — the customer has tested and formally taken it
- **Billing** — the operator has disclosed that revenue has started

Never write "live", "earning", "revenue-producing" or "generating" for capacity
that is only accepted. Never let one stage's date imply another's.

### 4 · Numbers carry their basis
A megawatt figure without a basis is meaningless, because gross utility power
and critical IT load differ by roughly a factor of two.

> Yes: "50 MW critical IT load, as of 13 Aug 2026"
> No:  "50 MW"

Same for money: a contract value needs its term. "$9.7bn" and "$9.7bn over five
years" are different claims.

### 5 · Say who said it
Attribute to the source, not to the world.

> Yes: "IREN has not separately disclosed that billing has commenced"
> No:  "billing has not started"

The first is a fact about the record. The second is a claim about reality that
T2C cannot support.

### 6 · Short sentences for hard ideas
When the concept is unfamiliar, the sentence gets shorter, not longer. Chain the
short ones. Do not stack clauses onto a technical noun.

## Banned words

**Hype** — revolutionary, game-changing, cutting-edge, seamless, unprecedented,
massive, explosive, skyrocketing, unlock, leverage (as a verb), robust,
best-in-class, world-class, industry-leading.

**False certainty** — clearly, obviously, undoubtedly, of course, simply,
just (as in "just add"), guaranteed, proven.

**Vague quantity** — many, several, numerous, various, a number of, significant,
substantial. Use the number, or say it is not disclosed.

**Investment framing** — see the `fca-guard` agent. Never: opportunity, play,
story, thesis, upside, leader, standout, one to watch.

**Filler** — in order to, it is important to note, it should be mentioned,
when it comes to, at the end of the day, needless to say.

**Two specific to Claude-written drafts** — "delve" and "landscape". Both
appear constantly in AI copy and read as unedited.

## Punctuation and format

- **British English.** Energise, organisation, analyse, metre. Utilise never —
  use "use".
- **Dates** as `13 Aug 2026`. Never 8/13/26, which is ambiguous outside the US.
- **Units** with a space: `50 MW`, `1.2 GW`. Currency closed: `$9.7bn`, `£195`.
- **Em dashes** sparingly, for a genuine aside. Not as a comma substitute.
- **No exclamation marks.** None. Anywhere.
- **Sentence case for headings.** Not Title Case.
- **Never bold a whole sentence.** Bold the two or three words that carry it.

## Empty states and errors

These are where trust is won or lost, because they are where the product admits
a limit. Say what is missing, why, and what would change it.

> Yes: "T2C holds no accelerator supplier record. Nothing is drawn here rather
> than a plausible-looking box with no document behind it."
> No:  "No data available."

Never apologise for a gap that is a deliberate methodological choice. State it
as the choice it is.

## Headlines

State what happened and who it happened to. No teasing, no questions, no
colons splitting a clever phrase from the actual news.

> Yes: "Microsoft accepts IREN's first 50 MW AI deployment"
> No:  "A quiet milestone: what IREN's latest move tells us"

## Before you finish

Read the draft against these four and fix what fails:

1. Would a reader who knows nothing about data centres follow this?
2. Does every number carry its basis and its date?
3. Have I said who disclosed each fact, rather than asserting it?
4. If I removed every hedge, would the meaning change? If yes, the hedges stay.
