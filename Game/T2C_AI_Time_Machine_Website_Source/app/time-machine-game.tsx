"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import campaignsJson from "./data/campaigns.json";
import companiesJson from "./data/companies.json";
import eventsJson from "./data/events.json";
import sourcesJson from "./data/source-ledger.json";
import { VERIFIED_OUTCOMES } from "./verified-outcomes";

type Screen =
  | "title"
  | "campaigns"
  | "prologue"
  | "briefing"
  | "decision"
  | "confirm"
  | "jump"
  | "outcome"
  | "debrief"
  | "chapter-complete"
  | "recap";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  question: string;
  synopsis: string;
  chapterIds: string[];
  initialCapitalUsd: number;
  benchmarkInstrumentId: string;
  art: { webp: string; pngMaster: string; objectPosition: string };
}

interface Choice {
  id: string;
  label: string;
  exposures: { instrumentId: string; weight: number }[];
  mechanism: string;
  risk: string;
}

interface GameEvent {
  id: string;
  campaignId: string;
  chapter: number;
  title: string;
  cutoffAt: string;
  knowledgeAsOf: string;
  windowDays: number;
  outcomeTargetDate: string;
  truthMode: "historical" | "live_prediction" | "hypothetical";
  outcomeStatus: string;
  briefing: {
    headline: string;
    simpleMeaning: string;
    directFact: string;
    physicalMeaning: string;
    criticalUnknown: string;
  };
  briefingSourceIds: string[];
  revealSourceIds: string[];
  choices: Choice[];
}

interface Source {
  id: string;
  publisher: string;
  title: string;
  url: string;
  publishedAt: string;
  sourceType: string;
  supportedClaim: string;
}

interface Instrument {
  id: string;
  symbol: string;
  name: string;
  kind: string;
}

interface CampaignProgress {
  chapterIndex: number;
  completed: string[];
  choices: Record<string, string>;
  evidenceOpened: string[];
  appliedEvents: string[];
  capitalUsd: number;
  finished: boolean;
  updatedAt: string;
}

interface GameSave {
  version: 1;
  lastCampaignId: string | null;
  soundOn: boolean;
  campaigns: Record<string, CampaignProgress>;
}

const campaigns = campaignsJson.campaigns as Campaign[];
const events = eventsJson.events as GameEvent[];
const sources = sourcesJson.sources as Source[];
const instruments = companiesJson.instruments as Instrument[];

const eventById = new Map(events.map((event) => [event.id, event]));
const sourceById = new Map(sources.map((source) => [source.id, source]));
const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
const SAVE_KEY = "t2c-ai-time-machine-v1";

const campaignVisuals: Record<
  string,
  { object: string; icon: string; eyebrow: string; chain: string[] }
> = {
  "ai-ignition": {
    object: "gpu-accelerator.webp",
    icon: "compute",
    eyebrow: "The spark becomes a system",
    chain: ["Demand", "Cloud", "Compute", "Network", "Facility"],
  },
  "memory-wall": {
    object: "hbm-package.webp",
    icon: "memory",
    eyebrow: "The bottleneck beside the GPU",
    chain: ["Accelerator", "HBM", "Packaging", "Yield", "Shipments"],
  },
  "power-crisis": {
    object: "power-transformer.webp",
    icon: "power",
    eyebrow: "Every token begins as electricity",
    chain: ["Grid", "Transformer", "Rack", "Cooling", "Compute"],
  },
  "photonics-shift": {
    object: "photonics-engine.webp",
    icon: "photon",
    eyebrow: "When moving bits becomes the limit",
    chain: ["Switch", "DSP", "Laser", "Fibre", "Cluster"],
  },
  "race-to-revenue": {
    object: "ai-data-hall.webp",
    icon: "facility",
    eyebrow: "Announcements meet physical reality",
    chain: ["Plan", "Contract", "Build", "Accepted", "Billing"],
  },
};

const emptySave: GameSave = {
  version: 1,
  lastCampaignId: null,
  soundOn: false,
  campaigns: {},
};

function freshProgress(campaign: Campaign): CampaignProgress {
  return {
    chapterIndex: 0,
    completed: [],
    choices: {},
    evidenceOpened: [],
    appliedEvents: [],
    capitalUsd: campaign.initialCapitalUsd,
    finished: false,
    updatedAt: new Date().toISOString(),
  };
}

function safeParseSave(raw: string | null): GameSave {
  if (!raw || raw.length > 200_000) return emptySave;
  try {
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    if (parsed.version !== 1 || typeof parsed.campaigns !== "object") return emptySave;
    return {
      version: 1,
      lastCampaignId:
        typeof parsed.lastCampaignId === "string" ? parsed.lastCampaignId : null,
      soundOn: parsed.soundOn === true,
      campaigns: parsed.campaigns ?? {},
    };
  } catch {
    return emptySave;
  }
}

function formatDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    signDisplay: "always",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function exposureLabel(choice: Choice) {
  return choice.exposures
    .map(({ instrumentId, weight }) =>
      choice.exposures.length > 1
        ? `${instrumentId} ${Math.round(weight * 100)}%`
        : instrumentId,
    )
    .join(" · ");
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg className="tm-icon" width={size} height={size} aria-hidden="true">
      <use href={`/time-machine/assets/svg/icons.svg#tm-${name}`} />
    </svg>
  );
}

function Overlay({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="tm-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={`tm-sheet ${wide ? "tm-sheet--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-overlay-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tm-sheet__head">
          <div>
            <span className="tm-kicker">TimeToCompute</span>
            <h2 id="tm-overlay-title">{title}</h2>
          </div>
          <button className="tm-icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="tm-sheet__body">{children}</div>
      </div>
    </div>
  );
}

export default function TimeMachineGame() {
  const [screen, setScreen] = useState<Screen>("title");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [save, setSave] = useState<GameSave>(emptySave);
  const [hydrated, setHydrated] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setSave(safeParseSave(window.localStorage.getItem(SAVE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [save, hydrated]);

  useEffect(() => {
    if (screen !== "title") headingRef.current?.focus({ preventScroll: true });
  }, [screen, chapterIndex]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === campaignId) ?? null,
    [campaignId],
  );
  const activeEvent = activeCampaign
    ? eventById.get(activeCampaign.chapterIds[chapterIndex]) ?? null
    : null;
  const progress = activeCampaign
    ? save.campaigns[activeCampaign.id] ?? freshProgress(activeCampaign)
    : null;
  const selectedChoice = activeEvent
    ? activeEvent.choices.find((choice) => choice.id === selectedChoiceId) ?? null
    : null;
  const outcome =
    activeEvent && selectedChoice
      ? VERIFIED_OUTCOMES[activeEvent.id]?.[selectedChoice.id]
      : undefined;
  const visual = activeCampaign ? campaignVisuals[activeCampaign.id] : null;
  const isLiveLocked = activeEvent?.truthMode === "live_prediction";

  const playCue = useCallback(
    (kind: "select" | "lock" | "jump" | "reveal") => {
      if (!save.soundOn || typeof window === "undefined") return;
      const AudioConstructor = window.AudioContext;
      if (!audioRef.current) audioRef.current = new AudioConstructor();
      const context = audioRef.current;
      if (context.state === "suspended") void context.resume();
      const notes =
        kind === "select"
          ? [440, 523.25]
          : kind === "lock"
            ? [110, 660]
            : kind === "jump"
              ? [73.42, 392]
              : [392, 493.88, 587.33];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.055;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === "jump" ? 0.045 : 0.025, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.17);
      });
    },
    [save.soundOn],
  );

  useEffect(() => {
    if (screen !== "jump") return;
    playCue("jump");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setScreen("outcome");
      setLiveMessage("The time jump is complete. The historical window is now revealed.");
      playCue("reveal");
    }, reduced ? 180 : 1350);
    return () => window.clearTimeout(timer);
  }, [screen, playCue]);

  const patchProgress = useCallback(
    (id: string, updater: (current: CampaignProgress) => CampaignProgress) => {
      const campaign = campaigns.find((item) => item.id === id);
      if (!campaign) return;
      setSave((current) => {
        const existing = current.campaigns[id] ?? freshProgress(campaign);
        return {
          ...current,
          lastCampaignId: id,
          campaigns: { ...current.campaigns, [id]: updater(existing) },
        };
      });
    },
    [],
  );

  const openCampaign = (campaign: Campaign) => {
    const existing = save.campaigns[campaign.id];
    setCampaignId(campaign.id);
    setSelectedChoiceId(null);
    if (!existing || (!existing.completed.length && existing.chapterIndex === 0)) {
      setChapterIndex(0);
      setScreen("prologue");
    } else if (existing.finished) {
      setChapterIndex(Math.max(0, campaign.chapterIds.length - 1));
      setScreen("recap");
    } else {
      setChapterIndex(Math.min(existing.chapterIndex, campaign.chapterIds.length - 1));
      setScreen("briefing");
    }
  };

  const startFreshCampaign = () => {
    if (!activeCampaign) return;
    patchProgress(activeCampaign.id, () => freshProgress(activeCampaign));
    setChapterIndex(0);
    setSelectedChoiceId(null);
    setScreen("briefing");
  };

  const resumeLast = () => {
    const last = campaigns.find((campaign) => campaign.id === save.lastCampaignId);
    if (last) openCampaign(last);
    else setScreen("campaigns");
  };

  const openEvidence = () => {
    if (activeCampaign && activeEvent) {
      patchProgress(activeCampaign.id, (current) => ({
        ...current,
        evidenceOpened: Array.from(new Set([...current.evidenceOpened, activeEvent.id])),
        updatedAt: new Date().toISOString(),
      }));
    }
    setEvidenceOpen(true);
  };

  const lockChoice = () => {
    if (!activeCampaign || !activeEvent || !selectedChoiceId) return;
    patchProgress(activeCampaign.id, (current) => ({
      ...current,
      choices: { ...current.choices, [activeEvent.id]: selectedChoiceId },
      updatedAt: new Date().toISOString(),
    }));
    playCue("lock");
    setScreen("jump");
  };

  const completeChapter = () => {
    if (!activeCampaign || !activeEvent || !progress) return;
    const isLast = chapterIndex === activeCampaign.chapterIds.length - 1;
    patchProgress(activeCampaign.id, (current) => {
      const alreadyApplied = current.appliedEvents.includes(activeEvent.id);
      const nextCapital =
        outcome && !alreadyApplied
          ? current.capitalUsd * (1 + outcome.returnRatio)
          : current.capitalUsd;
      return {
        ...current,
        completed: Array.from(new Set([...current.completed, activeEvent.id])),
        appliedEvents:
          outcome && !alreadyApplied
            ? [...current.appliedEvents, activeEvent.id]
            : current.appliedEvents,
        capitalUsd: nextCapital,
        chapterIndex: isLast ? chapterIndex : chapterIndex + 1,
        finished: isLast,
        updatedAt: new Date().toISOString(),
      };
    });
    setScreen("chapter-complete");
  };

  const continueAfterChapter = () => {
    if (!activeCampaign) return;
    const isLast = chapterIndex === activeCampaign.chapterIds.length - 1;
    if (isLast) setScreen("recap");
    else {
      setChapterIndex((value) => value + 1);
      setSelectedChoiceId(null);
      setScreen("briefing");
    }
  };

  const replayCampaign = () => {
    if (!activeCampaign) return;
    patchProgress(activeCampaign.id, () => freshProgress(activeCampaign));
    setChapterIndex(0);
    setSelectedChoiceId(null);
    setScreen("prologue");
  };

  const skipJump = () => {
    setScreen("outcome");
    setLiveMessage("The time jump is complete. The historical window is now revealed.");
    playCue("reveal");
  };

  const toggleSound = () =>
    setSave((current) => ({ ...current, soundOn: !current.soundOn }));

  const renderHeader = screen !== "title";

  return (
    <main className={`tm-app tm-screen--${screen}`}>
      <div className="tm-noise" aria-hidden="true" />
      {renderHeader && (
        <header className="tm-header">
          <button
            className="tm-brand"
            type="button"
            onClick={() => setScreen("campaigns")}
            aria-label="Return to campaign selection"
          >
            <span className="tm-brand__mark">T2C</span>
            <span className="tm-brand__name">AI Time Machine</span>
          </button>
          {activeCampaign && activeEvent && !["campaigns", "recap"].includes(screen) && (
            <div className="tm-header__progress" aria-label={`Chapter ${activeEvent.chapter} of ${activeCampaign.chapterIds.length}`}>
              <span>{activeCampaign.title}</span>
              <b>{String(activeEvent.chapter).padStart(2, "0")} / {String(activeCampaign.chapterIds.length).padStart(2, "0")}</b>
            </div>
          )}
          <div className="tm-header__tools">
            <button className="tm-utility" type="button" onClick={() => setHelpOpen(true)}>
              <span aria-hidden="true">?</span><span className="tm-utility__label">How it works</span>
            </button>
            <button className="tm-utility" type="button" onClick={toggleSound} aria-pressed={save.soundOn}>
              <Icon name={save.soundOn ? "sound" : "muted"} size={17} />
              <span className="tm-utility__label">{save.soundOn ? "Sound on" : "Sound off"}</span>
            </button>
          </div>
        </header>
      )}

      {screen === "title" && (
        <section className="tm-title-screen">
          <div className="tm-title-screen__art" aria-hidden="true" />
          <div className="tm-title-top">
            <div className="tm-brand tm-brand--static">
              <span className="tm-brand__mark">T2C</span>
              <span className="tm-brand__name">TimeToCompute</span>
            </div>
            <button className="tm-text-button" type="button" onClick={() => setHelpOpen(true)}>
              How it works <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="tm-title-copy">
            <span className="tm-kicker tm-kicker--lime">Interactive history · Real evidence</span>
            <h1>The AI<br /><em>Time Machine</em></h1>
            <p>
              Go back to the moment before the outcome. See only what was public.
              Choose the physical bottleneck you believe mattered next.
            </p>
            <div className="tm-title-actions">
              <button className="tm-primary tm-primary--hero" type="button" onClick={() => setScreen("campaigns")}>
                Enter the timeline <span aria-hidden="true">→</span>
              </button>
              {hydrated && save.lastCampaignId && (
                <button className="tm-resume" type="button" onClick={resumeLast}>
                  <Icon name="time" size={18} /> Resume your last journey
                </button>
              )}
            </div>
            <div className="tm-title-stats" aria-label="Game overview">
              <div><b>05</b><span>Finite campaigns</span></div>
              <div><b>34</b><span>Real turning points</span></div>
              <div><b>03</b><span>Theses each time</span></div>
            </div>
          </div>
          <div className="tm-title-rail" aria-hidden="true">
            <span className="tm-title-rail__line" />
            {["2023", "2024", "2025", "2026", "?"].map((year, index) => (
              <span key={year} className={index === 4 ? "is-future" : ""}><i />{year}</span>
            ))}
          </div>
          <p className="tm-disclosure">Historical simulation · Fictional capital · Educational only—not investment advice</p>
        </section>
      )}

      {screen === "campaigns" && (
        <section className="tm-campaign-select tm-page">
          <div className="tm-section-heading">
            <div>
              <span className="tm-kicker">Choose a turning point</span>
              <h1 ref={headingRef} tabIndex={-1}>Where do you enter history?</h1>
            </div>
            <p>Five finite stories. Thirty-four real signals. The future stays hidden until you commit.</p>
          </div>
          <div className="tm-campaign-grid">
            {campaigns.map((campaign, index) => {
              const campaignEvents = campaign.chapterIds.map((id) => eventById.get(id)).filter(Boolean) as GameEvent[];
              const campaignProgress = save.campaigns[campaign.id];
              const complete = campaignProgress?.completed.length ?? 0;
              const years = `${new Date(campaignEvents[0].cutoffAt).getUTCFullYear()}—${new Date(campaignEvents[campaignEvents.length - 1].cutoffAt).getUTCFullYear()}`;
              const campaignVisual = campaignVisuals[campaign.id];
              return (
                <article className="tm-campaign-card" key={campaign.id} style={{ "--card-index": index } as React.CSSProperties}>
                  <img
                    src={`/time-machine/assets/campaigns/${campaign.id}.webp`}
                    alt=""
                    width="1672"
                    height="941"
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                  <div className="tm-campaign-card__shade" />
                  <div className="tm-campaign-card__top">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{years}</span>
                  </div>
                  <div className="tm-campaign-card__content">
                    <div className="tm-campaign-card__icon"><Icon name={campaignVisual.icon} size={24} /></div>
                    <span className="tm-kicker">{campaignVisual.eyebrow}</span>
                    <h2>{campaign.title}</h2>
                    <p>{campaign.question}</p>
                    <div className="tm-card-progress">
                      <span><i style={{ width: `${Math.round((complete / campaign.chapterIds.length) * 100)}%` }} /></span>
                      <b>{complete} / {campaign.chapterIds.length}</b>
                    </div>
                    <button className="tm-card-action" type="button" onClick={() => openCampaign(campaign)}>
                      {campaignProgress?.finished ? "Review timeline" : complete ? "Resume campaign" : "Begin campaign"}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="tm-method-strip">
            <span><Icon name="evidence" size={18} /> Primary sources</span>
            <span><Icon name="time" size={18} /> Immutable cutoffs</span>
            <span><Icon name="risk" size={18} /> Mechanism + risk</span>
            <span><Icon name="lock" size={18} /> No future leakage</span>
          </div>
        </section>
      )}

      {screen === "prologue" && activeCampaign && visual && (
        <section className="tm-prologue tm-page">
          <img className="tm-prologue__bg" src={`/time-machine/assets/campaigns/${activeCampaign.id}.webp`} alt="" />
          <div className="tm-prologue__veil" />
          <div className="tm-prologue__copy">
            <span className="tm-kicker">Campaign {String(campaigns.findIndex((item) => item.id === activeCampaign.id) + 1).padStart(2, "0")}</span>
            <h1 ref={headingRef} tabIndex={-1}>{activeCampaign.title}</h1>
            <p className="tm-prologue__question">{activeCampaign.question}</p>
            <p>{activeCampaign.synopsis}</p>
            <div className="tm-prologue__rules">
              <span><Icon name="trend" size={21} /><b>{formatCurrency(activeCampaign.initialCapitalUsd)}</b> fictional starting value</span>
              <span><Icon name="evidence" size={21} />Only evidence public at each cutoff</span>
              <span><Icon name="time" size={21} />{activeCampaign.chapterIds.length} finite chapters</span>
            </div>
            <button className="tm-primary" type="button" onClick={startFreshCampaign}>
              Begin in {formatDate(eventById.get(activeCampaign.chapterIds[0])!.cutoffAt)} <span aria-hidden="true">→</span>
            </button>
          </div>
          <img className="tm-prologue__object" src={`/time-machine/assets/objects/${visual.object}`} alt="" />
        </section>
      )}

      {screen === "briefing" && activeCampaign && activeEvent && visual && progress && (
        <section className="tm-stage tm-page">
          <img className="tm-stage__bg" src={`/time-machine/assets/campaigns/${activeCampaign.id}.webp`} alt="" />
          <div className="tm-stage__veil" />
          <div className="tm-briefing-layout">
            <div className="tm-briefing-copy">
              <span className="tm-date-chip"><i /> Knowledge cutoff · {formatDate(activeEvent.cutoffAt)}</span>
              <span className="tm-kicker">Chapter {activeEvent.chapter} · Breaking signal</span>
              <h1 ref={headingRef} tabIndex={-1}>{activeEvent.title}</h1>
              <p className="tm-lede">{activeEvent.briefing.headline}</p>
              <p className="tm-simple"><span>In simple terms</span>{activeEvent.briefing.simpleMeaning}</p>
              <div className="tm-briefing-actions">
                {!isLiveLocked ? (
                  <button className="tm-primary" type="button" onClick={() => {
                    setSelectedChoiceId(progress.choices[activeEvent.id] ?? null);
                    setScreen("decision");
                  }}>
                    Choose your thesis <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button className="tm-primary" type="button" onClick={() => setScreen("campaigns")}>
                    Return to campaigns <span aria-hidden="true">→</span>
                  </button>
                )}
                <button className="tm-secondary" type="button" onClick={openEvidence}>
                  <Icon name="evidence" size={18} /> Inspect the evidence
                </button>
              </div>
            </div>
            <div className="tm-briefing-visual" aria-hidden="true">
              <span className="tm-orbit tm-orbit--one" />
              <span className="tm-orbit tm-orbit--two" />
              <img src={`/time-machine/assets/objects/${visual.object}`} alt="" />
              <span className="tm-object-label">{visual.chain[Math.min(visual.chain.length - 1, Math.floor((activeEvent.chapter - 1) / Math.max(1, activeCampaign.chapterIds.length - 1) * visual.chain.length))]}</span>
            </div>
            <aside className="tm-clue-stack" aria-label="What was knowable">
              <article><span>01 · Direct fact</span><p>{activeEvent.briefing.directFact}</p></article>
              <article><span>02 · Physical meaning</span><p>{activeEvent.briefing.physicalMeaning}</p></article>
              <article className="is-unknown"><span>03 · Critical unknown</span><p>{activeEvent.briefing.criticalUnknown}</p></article>
            </aside>
          </div>
          {isLiveLocked && (
            <div className="tm-locked-banner">
              <Icon name="lock" size={22} />
              <div><b>The outcome is still ahead</b><span>This {activeEvent.windowDays}-day window matures on {formatDate(activeEvent.outcomeTargetDate)} and stays locked until review.</span></div>
            </div>
          )}
          <Timeline campaign={activeCampaign} event={activeEvent} />
        </section>
      )}

      {(screen === "decision" || screen === "confirm") && activeCampaign && activeEvent && visual && progress && (
        <section className="tm-decision tm-page">
          <div className="tm-decision__heading">
            <div>
              <span className="tm-kicker">{formatDate(activeEvent.cutoffAt)} · Make the call</span>
              <h1 ref={headingRef} tabIndex={-1}>Where does your thesis go?</h1>
              <p>Reallocate {formatCurrency(progress.capitalUsd)} of fictional capital. Every choice has a mechanism and a risk.</p>
            </div>
            <button className="tm-secondary" type="button" onClick={openEvidence}>
              <Icon name="evidence" size={18} /> Evidence available then
            </button>
          </div>
          <div className="tm-choice-grid" role="radiogroup" aria-label="Choose one historical thesis">
            {activeEvent.choices.map((choice, index) => {
              const selected = choice.id === selectedChoiceId;
              return (
                <button
                  key={choice.id}
                  className={`tm-choice-card ${selected ? "is-selected" : ""}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setSelectedChoiceId(choice.id);
                    playCue("select");
                  }}
                >
                  <span className="tm-choice-card__number">0{index + 1}</span>
                  <span className="tm-choice-card__check"><Icon name="check" size={16} /></span>
                  <div className="tm-choice-card__object">
                    <span className={`tm-choice-orb tm-choice-orb--${index + 1}`} />
                    <img src={`/time-machine/assets/objects/${visual.object}`} alt="" />
                  </div>
                  <span className="tm-choice-card__exposure">{exposureLabel(choice)}</span>
                  <h2>{choice.label}</h2>
                  <div className="tm-choice-card__detail"><span>Thesis</span><p>{choice.mechanism}</p></div>
                  <div className="tm-choice-card__detail is-risk"><span><Icon name="risk" size={14} /> Risk</span><p>{choice.risk}</p></div>
                </button>
              );
            })}
          </div>
          <div className="tm-decision-bar">
            <div>
              <span>Outcome window</span>
              <b>{activeEvent.windowDays} calendar days</b>
            </div>
            <button className="tm-primary" type="button" disabled={!selectedChoiceId} onClick={() => setScreen("confirm")}>
              {selectedChoiceId ? "Review choice" : "Select a thesis"} <span aria-hidden="true">→</span>
            </button>
          </div>
          <Timeline campaign={activeCampaign} event={activeEvent} />
          {screen === "confirm" && selectedChoice && (
            <Overlay title="Leave this date behind?" onClose={() => setScreen("decision")}>
              <div className="tm-confirm">
                <span className="tm-confirm__icon"><Icon name="lock" size={25} /></span>
                <p>You are backing</p>
                <h3>{selectedChoice.label}</h3>
                <b>{exposureLabel(selectedChoice)}</b>
                <dl>
                  <div><dt>Fictional allocation</dt><dd>{formatCurrency(progress.capitalUsd)}</dd></div>
                  <div><dt>Entry rule</dt><dd>Next regular-session adjusted close</dd></div>
                  <div><dt>Destination</dt><dd>{formatDate(activeEvent.outcomeTargetDate)}</dd></div>
                </dl>
                <p className="tm-confirm__warning">The next screen reveals information that was unavailable at the cutoff.</p>
                <button className="tm-primary tm-primary--wide" type="button" onClick={lockChoice}>
                  Lock choice & jump {activeEvent.windowDays} days <span aria-hidden="true">→</span>
                </button>
                <button className="tm-text-button" type="button" onClick={() => setScreen("decision")}>Change decision</button>
              </div>
            </Overlay>
          )}
        </section>
      )}

      {screen === "jump" && activeCampaign && activeEvent && visual && (
        <section className="tm-jump tm-page" aria-busy="true">
          <img className="tm-jump__bg" src={`/time-machine/assets/campaigns/${activeCampaign.id}.webp`} alt="" />
          <div className="tm-jump__tunnel" aria-hidden="true"><i /><i /><i /></div>
          <div className="tm-jump__copy">
            <span className="tm-kicker">Decision locked</span>
            <h1 ref={headingRef} tabIndex={-1}>Advancing the timeline</h1>
            <div className="tm-jump__dates"><span>{formatDate(activeEvent.cutoffAt)}</span><i /><span>{formatDate(activeEvent.outcomeTargetDate)}</span></div>
            <p>The future evidence is opening. Your choice cannot change now.</p>
            <button className="tm-secondary" type="button" onClick={skipJump}><Icon name="pause" size={17} /> Skip transition</button>
          </div>
        </section>
      )}

      {screen === "outcome" && activeCampaign && activeEvent && selectedChoice && visual && progress && (
        <section className="tm-outcome tm-page">
          <div className="tm-outcome__top">
            <span className="tm-kicker">The window closed · {formatDate(activeEvent.outcomeTargetDate)}</span>
            <h1 ref={headingRef} tabIndex={-1}>What happened next?</h1>
          </div>
          <div className="tm-outcome-grid">
            <article className="tm-outcome-value">
              <span>Your historical thesis</span>
              <h2>{selectedChoice.label}</h2>
              <b>{exposureLabel(selectedChoice)}</b>
              {outcome ? (
                <div className="tm-price-result">
                  <span>{formatCurrency(progress.capitalUsd)}</span>
                  <i aria-hidden="true">→</i>
                  <strong>{formatCurrency(progress.capitalUsd * (1 + outcome.returnRatio))}</strong>
                  <em>{formatPercent(outcome.returnRatio)}</em>
                  <small>{outcome.entrySession} to {outcome.exitSession} · {outcome.provider}</small>
                </div>
              ) : (
                <div className="tm-price-pending">
                  <Icon name="evidence" size={26} />
                  <div><strong>Market result awaiting verification</strong><p>Your decision is preserved. No price has been estimated or invented.</p></div>
                </div>
              )}
              <p className="tm-causality">A subsequent return would not prove that this event caused the price move.</p>
            </article>
            <article className="tm-chain-card">
              <span className="tm-kicker">The physical chain</span>
              <h2>Signal → system</h2>
              <div className="tm-chain">
                {visual.chain.map((node, index) => {
                  const activeThrough = Math.max(1, Math.ceil(activeEvent.chapter / activeCampaign.chapterIds.length * visual.chain.length));
                  return <span className={index < activeThrough ? "is-active" : ""} key={node}><i>{index + 1}</i><b>{node}</b></span>;
                })}
              </div>
              <p>{activeEvent.briefing.physicalMeaning}</p>
            </article>
            <article className="tm-later-evidence">
              <span className="tm-kicker">What became knowable later</span>
              {activeEvent.revealSourceIds.length ? activeEvent.revealSourceIds.slice(0, 3).map((id) => {
                const source = sourceById.get(id);
                if (!source) return null;
                return <div key={id}><span>{formatDate(source.publishedAt)}</span><b>{source.publisher}</b><p>{source.supportedClaim}</p></div>;
              }) : <div><span>End of recorded arc</span><b>No later seed source</b><p>This chapter closes on what the cited source proved—and what it did not.</p></div>}
            </article>
          </div>
          <div className="tm-outcome-actions">
            <button className="tm-primary" type="button" onClick={() => setScreen("debrief")}>Open the debrief <span aria-hidden="true">→</span></button>
          </div>
        </section>
      )}

      {screen === "debrief" && activeCampaign && activeEvent && selectedChoice && (
        <section className="tm-debrief tm-page">
          <div className="tm-section-heading tm-section-heading--compact">
            <div><span className="tm-kicker">Chapter {activeEvent.chapter} debrief</span><h1 ref={headingRef} tabIndex={-1}>What this chapter actually proved</h1></div>
          </div>
          <div className="tm-debrief-grid">
            <article className="tm-debrief-card is-direct">
              <span><i /> Direct</span><h2>The strongest evidence</h2><p>{activeEvent.briefing.directFact}</p>
            </article>
            <article className="tm-debrief-card is-inference">
              <span><i /> Your inference</span><h2>The leap your thesis required</h2><p>{selectedChoice.mechanism}</p>
            </article>
            <article className="tm-debrief-card is-unknown">
              <span><i /> Unknown</span><h2>The unresolved risk</h2><p>{activeEvent.briefing.criticalUnknown}</p>
            </article>
          </div>
          <div className="tm-debrief-bottom">
            <div className="tm-source-list">
              <span className="tm-kicker">Primary record</span>
              {[...activeEvent.briefingSourceIds, ...activeEvent.revealSourceIds].map((id) => sourceById.get(id)).filter(Boolean).map((source) => (
                <a key={source!.id} href={source!.url} target="_blank" rel="noopener noreferrer">
                  <span>{source!.publisher} · {formatDate(source!.publishedAt)}</span>
                  <b>{source!.title}</b><i aria-hidden="true">↗</i>
                </a>
              ))}
            </div>
            <div className="tm-debrief-choice"><span>You chose</span><b>{selectedChoice.label}</b><p>{selectedChoice.risk}</p></div>
          </div>
          <div className="tm-debrief-actions">
            <button className="tm-primary" type="button" onClick={completeChapter}>Complete chapter <span aria-hidden="true">→</span></button>
            <button className="tm-text-button" type="button" onClick={() => setScreen("campaigns")}>Stop here — progress is saved</button>
          </div>
        </section>
      )}

      {screen === "chapter-complete" && activeCampaign && activeEvent && progress && (
        <section className="tm-chapter-complete tm-page">
          <div className="tm-complete-ring"><Icon name="check" size={42} /></div>
          <span className="tm-kicker">Timeline updated</span>
          <h1 ref={headingRef} tabIndex={-1}>Chapter saved.</h1>
          <p>Your decision is part of the trail. No points, no streak—just the evidence you followed.</p>
          <div className="tm-decision-trail">
            {activeCampaign.chapterIds.map((id, index) => (
              <span key={id} className={index <= chapterIndex ? "is-complete" : ""}><i>{index + 1}</i></span>
            ))}
          </div>
          <button className="tm-primary" type="button" onClick={continueAfterChapter}>
            {chapterIndex === activeCampaign.chapterIds.length - 1 ? "Review campaign" : `Continue to chapter ${chapterIndex + 2}`} <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {screen === "recap" && activeCampaign && progress && visual && (
        <section className="tm-recap tm-page">
          <img className="tm-recap__bg" src={`/time-machine/assets/campaigns/${activeCampaign.id}.webp`} alt="" />
          <div className="tm-recap__veil" />
          <div className="tm-recap__content">
            <span className="tm-kicker">Campaign record</span>
            <h1 ref={headingRef} tabIndex={-1}>Your path through<br />{activeCampaign.title}</h1>
            <p>Not a score. A record of which constraints you noticed, which risks you accepted and what the historical record later showed.</p>
            <div className="tm-recap__stats">
              <div><span>Decisions</span><b>{progress.completed.length} / {activeCampaign.chapterIds.length}</b></div>
              <div><span>Evidence opened</span><b>{progress.evidenceOpened.length}</b></div>
              <div><span>Verified value</span><b>{formatCurrency(progress.capitalUsd)}</b><small>Unverified chapters excluded</small></div>
            </div>
            <div className="tm-recap-trail">
              {activeCampaign.chapterIds.map((id, index) => {
                const event = eventById.get(id)!;
                const choiceId = progress.choices[id];
                const choice = event.choices.find((item) => item.id === choiceId);
                return <article key={id} className={progress.completed.includes(id) ? "is-complete" : ""}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{formatDate(event.cutoffAt)}</b><p>{choice?.label ?? (event.truthMode === "live_prediction" ? "Outcome locked" : "Not played")}</p></div></article>;
              })}
            </div>
            <div className="tm-recap__actions">
              <button className="tm-primary" type="button" onClick={() => setScreen("campaigns")}>Choose another campaign <span aria-hidden="true">→</span></button>
              <button className="tm-secondary" type="button" onClick={replayCampaign}>Replay this campaign</button>
            </div>
          </div>
          <img className="tm-recap__object" src={`/time-machine/assets/objects/${visual.object}`} alt="" />
        </section>
      )}

      <div className="tm-live" aria-live="polite">{liveMessage}</div>

      {evidenceOpen && activeEvent && (
        <Overlay title={`Evidence available by ${formatDate(activeEvent.cutoffAt)}`} onClose={() => setEvidenceOpen(false)} wide>
          <p className="tm-sheet-intro">Only material published by the knowledge cutoff appears here. Later evidence stays hidden until after commitment.</p>
          <div className="tm-evidence-list">
            {activeEvent.briefingSourceIds.map((id) => sourceById.get(id)).filter(Boolean).map((source, index) => (
              <article key={source!.id}>
                <div className="tm-evidence-list__number">0{index + 1}</div>
                <div className="tm-evidence-list__content">
                  <span>{source!.sourceType.replaceAll("_", " ")} · Available by cutoff</span>
                  <h3>{source!.title}</h3>
                  <p>{source!.supportedClaim}</p>
                  <dl><div><dt>Publisher</dt><dd>{source!.publisher}</dd></div><div><dt>Published</dt><dd>{formatDate(source!.publishedAt)}</dd></div></dl>
                  <a href={source!.url} target="_blank" rel="noopener noreferrer">Open primary source <span aria-hidden="true">↗</span></a>
                </div>
              </article>
            ))}
          </div>
        </Overlay>
      )}

      {helpOpen && (
        <Overlay title="How the Time Machine works" onClose={() => setHelpOpen(false)}>
          <div className="tm-how">
            <div><span>01</span><h3>Arrive</h3><p>A real historical date becomes the hard information cutoff.</p></div>
            <div><span>02</span><h3>Inspect</h3><p>Read the signal, physical implication and critical unknown.</p></div>
            <div><span>03</span><h3>Choose</h3><p>Back one of three distinct theses using fictional capital.</p></div>
            <div><span>04</span><h3>Jump</h3><p>Open the later evidence and see which delivery gate moved.</p></div>
          </div>
          <div className="tm-method-note"><Icon name="evidence" size={22} /><p><b>Truth before drama.</b> Market results appear only after adjusted prices pass verification. Missing data remains missing—never zero and never guessed.</p></div>
          <p className="tm-legal">Historical simulation using fictional allocations. Educational only—not investment advice. Past performance does not predict future results.</p>
        </Overlay>
      )}
    </main>
  );
}

function Timeline({ campaign, event }: { campaign: Campaign; event: GameEvent }) {
  return (
    <div className="tm-timeline" aria-label={`Timeline: chapter ${event.chapter} of ${campaign.chapterIds.length}, ${formatDate(event.cutoffAt)}`}>
      <span className="tm-timeline__past" style={{ width: `${((event.chapter - 1) / Math.max(1, campaign.chapterIds.length - 1)) * 100}%` }} />
      {campaign.chapterIds.map((id, index) => {
        const chapterEvent = eventById.get(id)!;
        return <span key={id} className={`${index < event.chapter - 1 ? "is-past" : ""} ${index === event.chapter - 1 ? "is-current" : ""}`}><i /><b>{new Date(chapterEvent.cutoffAt).getUTCFullYear()}</b></span>;
      })}
      <em><Icon name="lock" size={15} /> Future hidden</em>
    </div>
  );
}
