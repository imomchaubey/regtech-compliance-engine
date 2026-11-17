"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config & types                                                      */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Circular = { title: string; link: string; date?: string };
type Analysis = { title: string; summary: string };

const serif = { fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif" };

/* Tag circulars by what they are, so the list is scannable at a glance. */
const CATEGORIES = [
  { match: /(repo|auction|liquidity|laf)/i, label: "Market operations", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  { match: /(bond|securities|sgb|g-sec|treasury)/i, label: "Securities", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { match: /(penalt|enforcement|violation|cancell)/i, label: "Enforcement", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  { match: /(kyc|master direction|guideline|norms|framework)/i, label: "Policy", tone: "bg-violet-50 text-violet-800 ring-violet-200" },
];

function categorize(title: string) {
  return (
    CATEGORIES.find((c) => c.match.test(title)) ?? {
      label: "General",
      tone: "bg-stone-100 text-stone-700 ring-stone-200",
    }
  );
}

/* ------------------------------------------------------------------ */
/* Summary renderer: turns the model's markdown-ish text into layout   */
/* ------------------------------------------------------------------ */

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-stone-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Summary({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        // Headings: "## Title" or a line that is only **bold**
        const heading = line.match(/^#{1,4}\s+(.*)$/) ?? line.match(/^\*\*([^*]+)\*\*:?$/);
        if (heading) {
          return (
            <h4 key={i} className="pt-5 text-[15px] font-semibold text-stone-900 first:pt-0" style={serif}>
              {heading[1].replace(/\*\*/g, "")}
            </h4>
          );
        }

        // Numbered items: "1. Do this"
        const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                {numbered[1]}
              </span>
              <p className="text-[15px] leading-7 text-stone-700">
                <Inline text={numbered[2]} />
              </p>
            </div>
          );
        }

        // Bullets: "- item", "* item", "• item"
        const bullet = line.match(/^[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-3">
              <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700/70" />
              <p className="text-[15px] leading-7 text-stone-700">
                <Inline text={bullet[1]} />
              </p>
            </div>
          );
        }

        return (
          <p key={i} className="text-[15px] leading-7 text-stone-700">
            <Inline text={line} />
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Analysis>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const readerRef = useRef<HTMLDivElement>(null);

  const fetchCirculars = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/fetch-circulars`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setCirculars(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Failed to fetch circulars", err);
      setLoadError("Couldn't reach the compliance API. Check that the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCirculars();
  }, [fetchCirculars]);

  const analyze = async (circular: Circular, force = false) => {
    setSelected(circular.title);
    setAnalysisError(null);

    // On small screens the reader sits below the list, so bring it into view.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    if (results[circular.title] && !force) return;

    setAnalyzing(circular.title);
    try {
      const res = await fetch(`${API_BASE}/api/analyze-circular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: circular.title,
          link: circular.link,
          content: "Pending PDF extraction",
        }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [circular.title]: {
          title: data.title ?? circular.title,
          summary: data.compliance_summary ?? "",
        },
      }));
    } catch (err) {
      console.error("Analysis failed", err);
      setAnalysisError("The analysis didn't complete. Try again in a moment.");
    } finally {
      setAnalyzing(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? circulars.filter((c) => c.title.toLowerCase().includes(q)) : circulars;
  }, [circulars, query]);

  const selectedCircular = circulars.find((c) => c.title === selected) ?? null;
  const result = selected ? results[selected] : undefined;
  const isAnalyzing = analyzing !== null && analyzing === selected;
  const analyzedCount = Object.keys(results).length;

  const copySummary = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${result.title}\n\n${result.summary}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-stone-800 antialiased selection:bg-teal-200/60">
      {/* ---------------------------- Top bar ---------------------------- */}
      <header className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-800 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-semibold text-stone-900" style={serif}>
                RegTech Intelligence
              </h1>
              <p className="text-xs text-stone-500">RBI circular monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            Connected
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        {/* --------------------------- Page title -------------------------- */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <h2 className="text-[28px] font-semibold leading-tight text-stone-900" style={serif}>
              Compliance review
            </h2>
            <p className="mt-1 max-w-xl text-[15px] text-stone-600">
              Pick a circular and get a plain-language checklist of what your team needs to do.
            </p>
          </div>

          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-stone-500">Circulars</dt>
              <dd className="text-2xl font-semibold tabular-nums text-stone-900" style={serif}>
                {loading ? "–" : circulars.length}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Reviewed</dt>
              <dd className="text-2xl font-semibold tabular-nums text-teal-800" style={serif}>
                {analyzedCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* -------------------------- Feed list -------------------------- */}
          <section
            aria-label="RBI circulars"
            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:col-span-5 xl:col-span-4 print:hidden"
          >
            <div className="border-b border-stone-200 p-4">
              <label className="relative block">
                <span className="sr-only">Search circulars</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search circulars"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </label>
            </div>

            <div className="max-h-[calc(100vh-22rem)] min-h-[320px] overflow-y-auto lg:max-h-[calc(100vh-19rem)]">
              {loading ? (
                <ul className="divide-y divide-stone-100" aria-busy="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="space-y-3 p-5">
                      <div className="h-4 w-24 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
                      <div className="h-4 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
                    </li>
                  ))}
                </ul>
              ) : loadError ? (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <AlertCircle className="h-8 w-8 text-rose-500" />
                  <p className="text-sm text-stone-600">{loadError}</p>
                  <button
                    onClick={fetchCirculars}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                  >
                    <RefreshCw className="h-4 w-4" /> Try again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-10 text-center">
                  <Inbox className="h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-600">
                    {query ? `No circulars match “${query}”.` : "No circulars available right now."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {filtered.map((circ, idx) => {
                    const cat = categorize(circ.title);
                    const isSelected = selected === circ.title;
                    const done = !!results[circ.title];
                    const busy = analyzing === circ.title;

                    return (
                      <li key={`${circ.title}-${idx}`} className="relative">
                        {isSelected && <span className="absolute inset-y-0 left-0 w-1 bg-teal-700" />}
                        <button
                          onClick={() => analyze(circ)}
                          aria-current={isSelected}
                          className={`block w-full px-5 py-4 text-left transition-colors focus:outline-none focus-visible:bg-teal-50/60 ${isSelected ? "bg-teal-50/60" : "hover:bg-stone-50"
                            }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cat.tone}`}>
                              {cat.label}
                            </span>
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                            ) : done ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" /> Reviewed
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-3 text-[15px] font-medium leading-snug text-stone-900">
                            {circ.title}
                          </p>
                          {circ.date && <p className="mt-1.5 text-xs text-stone-500">{circ.date}</p>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ------------------------- Reader panel ------------------------ */}
          <section
            ref={readerRef}
            aria-live="polite"
            className="min-h-[520px] scroll-mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:col-span-7 xl:col-span-8 print:border-0 print:shadow-none"
          >
            {/* Empty state */}
            {!selectedCircular && (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 ring-1 ring-teal-100">
                  <FileText className="h-6 w-6 text-teal-800" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900" style={serif}>
                  Select a circular to begin
                </h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-stone-600">
                  We&apos;ll read it and list the obligations, deadlines and actions that apply to your team.
                </p>
              </div>
            )}

            {/* Working */}
            {selectedCircular && isAnalyzing && (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <Loader2 className="mb-5 h-8 w-8 animate-spin text-teal-700 motion-reduce:animate-none" />
                <h3 className="text-lg font-semibold text-stone-900" style={serif}>
                  Reviewing the circular
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">{selectedCircular.title}</p>
                <p className="mt-4 text-xs text-stone-500">This usually takes a few seconds.</p>
              </div>
            )}

            {/* Error */}
            {selectedCircular && !isAnalyzing && analysisError && !result && (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 px-8 text-center">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-[15px] text-stone-700">{analysisError}</p>
                <button
                  onClick={() => analyze(selectedCircular, true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                >
                  <RefreshCw className="h-4 w-4" /> Retry review
                </button>
              </div>
            )}

            {/* Result */}
            {selectedCircular && !isAnalyzing && result && (
              <article>
                <header className="border-b border-stone-200 px-6 py-6 sm:px-10 sm:py-8">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${categorize(result.title).tone}`}
                    >
                      {categorize(result.title).label}
                    </span>
                    <a
                      href={selectedCircular.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-teal-800 underline-offset-4 hover:underline print:hidden"
                    >
                      View original on RBI <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h3 className="max-w-3xl text-2xl font-semibold leading-snug text-stone-900 sm:text-[28px]" style={serif}>
                    {result.title}
                  </h3>
                </header>

                <div className="px-6 py-8 sm:px-10">
                  <div className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-teal-800">
                    <Sparkles className="h-4 w-4" /> Compliance summary
                  </div>
                  <div className="max-w-3xl">
                    {result.summary ? (
                      <Summary text={result.summary} />
                    ) : (
                      <p className="text-[15px] text-stone-600">The model returned an empty summary for this circular.</p>
                    )}
                  </div>
                </div>

                <footer className="flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4 sm:px-10 print:hidden">
                  <button
                    onClick={copySummary}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy summary"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                  >
                    <Printer className="h-4 w-4" /> Print or save as PDF
                  </button>
                  <button
                    onClick={() => analyze(selectedCircular, true)}
                    className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
                  >
                    <RefreshCw className="h-4 w-4" /> Run again
                  </button>
                </footer>
              </article>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}