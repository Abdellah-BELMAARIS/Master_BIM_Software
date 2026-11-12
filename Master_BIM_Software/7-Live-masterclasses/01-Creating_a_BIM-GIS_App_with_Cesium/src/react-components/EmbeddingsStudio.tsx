import * as React from "react";
import * as OBC from "@thatopen/components";
import {
  SemanticEmbeddings,
  IndexedElement,
  ClassEntry,
  DEFAULT_CLASSIFICATION,
  EMBEDDING_MODEL,
  prettyClass,
} from "../bim-components/SemanticEmbeddings";

type Tab = "search" | "classify" | "map" | "group" | "lab";

const LAB_PAIRS: [string, string, string, boolean][] = [
  ["Synonyms", "Exterior brick wall, 20 cm thick", "Masonry façade 200 mm", true],
  ["Synonyms", "Steel profile IPE 300", "Steel I-beam 300 mm deep", true],
  ["Language", "Muro de ladrillo", "Brick wall", true],
  ["Different", "Window", "Wall", false],
  ["Numbers", "Concrete wall 20 cm thick", "Concrete wall 200 cm thick", false],
  ["Numbers", "Pipe DN100", "Pipe DN500", false],
  ["Negation", "Fire-rated door", "Non fire-rated door", false],
  ["Negation", "Load-bearing wall", "Non load-bearing wall", false],
];

const scoreColor = (p: number) => (p >= 70 ? "#34d399" : p >= 45 ? "#38bdf8" : p >= 30 ? "#fbbf24" : "#71717a");

function Bar({ value }: { value: number }) {
  return (
    <span className="emb-bar">
      <i style={{ width: `${value}%`, background: scoreColor(value) }} />
    </span>
  );
}

export function EmbeddingsStudio({ getComponents }: { getComponents: () => OBC.Components | null }) {
  const engineRef = React.useRef<SemanticEmbeddings | null>(null);
  const [tab, setTab] = React.useState<Tab>("search");
  const [status, setStatus] = React.useState("Model not loaded");
  const [busy, setBusy] = React.useState(false);
  const [loadPct, setLoadPct] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const [query, setQuery] = React.useState("vertical structural element");
  const [minScore, setMinScore] = React.useState(40);
  const [results, setResults] = React.useState<{ item: IndexedElement; score: number }[]>([]);

  const [classRows, setClassRows] = React.useState<Awaited<ReturnType<SemanticEmbeddings["classifyIfc"]>>>([]);
  const [onlyMismatch, setOnlyMismatch] = React.useState(false);

  const [classText, setClassText] = React.useState(DEFAULT_CLASSIFICATION);
  const [mapRows, setMapRows] = React.useState<Awaited<ReturnType<SemanticEmbeddings["mapToClassification"]>>>([]);

  const [threshold, setThreshold] = React.useState(60);
  const [groups, setGroups] = React.useState<ReturnType<SemanticEmbeddings["group"]>>([]);

  const [labA, setLabA] = React.useState("Wall, 2 hours fire resistance");
  const [labB, setLabB] = React.useState("Wall, no fire resistance");
  const [labScore, setLabScore] = React.useState<number | null>(null);
  const [labRows, setLabRows] = React.useState<number[]>([]);

  const engine = () => {
    const comps = getComponents();
    if (!comps) throw new Error("Viewer not ready");
    engineRef.current ??= new SemanticEmbeddings(comps);
    return engineRef.current;
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      setStatus(label);
      await fn();
    } catch (e: any) {
      setStatus("Error: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const ensureModel = async () => {
    const e = engine();
    if (!e.isLoaded) setStatus("Downloading embedding model (~23 MB, cached after first use)…");
    await e.load((p) => setLoadPct(p));
    setLoadPct(100);
  };

  const indexModels = () =>
    run("Indexing…", async () => {
      await ensureModel();
      const n = await engine().indexModels((m) => setStatus(m));
      setCount(n);
      setResults([]); setClassRows([]); setMapRows([]); setGroups([]);
      setStatus(n ? `${n} elements indexed · ${EMBEDDING_MODEL.split("/")[1]} · 384 dims` : "No models loaded — load an IFC first");
    });

  const doSearch = () =>
    run("Searching…", async () => {
      if (!count) return setStatus("Index the model first");
      const r = await engine().search(query, 500);
      setResults(r);
      const hits = r.filter((x) => x.score >= minScore).map((x) => x.item);
      await engine().select(hits);
      setStatus(`${hits.length} elements match “${query}” (≥ ${minScore}%)`);
    });

  const doClassify = () =>
    run("Classifying…", async () => {
      if (!count) return setStatus("Index the model first");
      const r = await engine().classifyIfc();
      setClassRows(r);
      setStatus(`${r.filter((x) => x.mismatch).length} possible IFC class mismatches out of ${r.length}`);
    });

  const parseClasses = (): ClassEntry[] =>
    classText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [code, ...rest] = l.split("|");
      return rest.length ? { code: code.trim(), description: rest.join("|").trim() } : { code: l, description: l };
    });

  const doMap = () =>
    run("Mapping…", async () => {
      if (!count) return setStatus("Index the model first");
      const r = await engine().mapToClassification(parseClasses());
      setMapRows(r);
      setStatus(`Mapped ${r.length} elements · top 3 suggestions each`);
    });

  const doGroup = () =>
    run("Grouping…", async () => {
      if (!count) return setStatus("Index the model first");
      const g = engine().group(threshold / 100);
      setGroups(g);
      setStatus(`${g.length} semantic groups at ≥ ${threshold}%`);
    });

  const doLab = () =>
    run("Comparing…", async () => {
      await ensureModel();
      const e = engine();
      const [a, b] = await e.embed([labA, labB]);
      setLabScore(e.similarity(a, b));
      const flat = await e.embed(LAB_PAIRS.flatMap(([, x, y]) => [x, y]));
      setLabRows(LAB_PAIRS.map((_, i) => e.similarity(flat[2 * i], flat[2 * i + 1])));
      setStatus("Embedding lab ready");
    });

  const exportCsv = () => {
    const rows = [["Model", "LocalId", "Name", "IfcClass", "Code", "Description", "Score"]];
    mapRows.forEach((r) => {
      const o = r.options[0];
      rows.push([r.el.modelId, String(r.el.localId), r.el.text, r.el.category, o?.item.code ?? "", o?.item.description ?? "", String(o?.score ?? "")]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "semantic-classification.csv";
    a.click();
  };

  const selectEl = (els: IndexedElement[]) => engineRef.current?.select(els).catch(() => { });

  const TABS: [Tab, string, string][] = [
    ["search", "travel_explore", "Search"],
    ["classify", "category", "IFC Class"],
    ["map", "account_tree", "Classify"],
    ["group", "hub", "Group"],
    ["lab", "science", "Lab"],
  ];

  const visibleClass = onlyMismatch ? classRows.filter((r) => r.mismatch) : classRows;

  return (
    <div className="emb-studio">
      <div className="emb-head">
        <div className="emb-stat">
          <span className="material-icons-round">memory</span>
          <div>
            <b>{count ? `${count} elements indexed` : "Semantic index empty"}</b>
            <small>{status}</small>
          </div>
        </div>
        {busy && loadPct > 0 && loadPct < 100 && <Bar value={loadPct} />}
        <button className="emb-btn primary" disabled={busy} onClick={indexModels}>
          <span className="material-icons-round">{count ? "refresh" : "bolt"}</span>
          {count ? "Re-index models" : "Index loaded models"}
        </button>
      </div>

      <div className="emb-tabs">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <span className="material-icons-round">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div className="emb-panel">
          <p className="emb-hint">Describe elements in plain language — matches are found by meaning, not keywords.</p>
          <div className="emb-row">
            <input className="emb-input" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="e.g. glazed opening, load bearing pillar…" />
            <button className="emb-btn primary" disabled={busy} onClick={doSearch}>
              <span className="material-icons-round">search</span>
            </button>
          </div>
          <div className="emb-chips">
            {["vertical structural element", "glazed opening", "horizontal floor deck", "steps between floors", "masonry facade"].map((s) => (
              <button key={s} onClick={() => setQuery(s)}>{s}</button>
            ))}
          </div>
          <label className="emb-slider">
            Min similarity <b>{minScore}%</b>
            <input type="range" min={10} max={90} value={minScore} onChange={(e) => setMinScore(+e.target.value)} />
          </label>
          <div className="emb-list">
            {results.filter((r) => r.score >= minScore).slice(0, 120).map((r) => (
              <button key={r.item.modelId + r.item.localId} className="emb-item" onClick={() => selectEl([r.item])}>
                <span className="emb-tag">{prettyClass(r.item.category)}</span>
                <span className="emb-text">{r.item.text}</span>
                <Bar value={r.score} />
                <b style={{ color: scoreColor(r.score) }}>{r.score}%</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "classify" && (
        <div className="emb-panel">
          <p className="emb-hint">Suggests an IFC class from each element's name and flags elements whose current class disagrees.</p>
          <div className="emb-row">
            <button className="emb-btn primary" disabled={busy} onClick={doClassify}>
              <span className="material-icons-round">auto_fix_high</span>Suggest IFC classes
            </button>
            <label className="emb-check">
              <input type="checkbox" checked={onlyMismatch} onChange={(e) => setOnlyMismatch(e.target.checked)} /> Mismatches only
            </label>
            {classRows.some((r) => r.mismatch) && (
              <button className="emb-btn" onClick={() => selectEl(classRows.filter((r) => r.mismatch).map((r) => r.el))}>Select all</button>
            )}
          </div>
          <div className="emb-list">
            {visibleClass.slice(0, 200).map((r) => (
              <button key={r.el.modelId + r.el.localId} className={`emb-item ${r.mismatch ? "warn" : ""}`} onClick={() => selectEl([r.el])}>
                <span className="emb-text">{r.el.text}</span>
                <span className="emb-tag muted">{prettyClass(r.el.category)}</span>
                <span className="material-icons-round emb-arrow">east</span>
                <span className="emb-tag">{prettyClass(r.suggested)}</span>
                <b style={{ color: scoreColor(r.score) }}>{r.score}%</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "map" && (
        <div className="emb-panel">
          <p className="emb-hint">Map elements to your classification or cost database. One entry per line: <code>CODE | description</code>.</p>
          <textarea className="emb-input emb-area" value={classText} onChange={(e) => setClassText(e.target.value)} />
          <div className="emb-row">
            <button className="emb-btn primary" disabled={busy} onClick={doMap}>
              <span className="material-icons-round">link</span>Map elements
            </button>
            {mapRows.length > 0 && (
              <button className="emb-btn" onClick={exportCsv}>
                <span className="material-icons-round">download</span>CSV
              </button>
            )}
          </div>
          <div className="emb-list">
            {mapRows.slice(0, 150).map((r) => (
              <div key={r.el.modelId + r.el.localId} className="emb-card" onClick={() => selectEl([r.el])}>
                <div className="emb-card-title">{r.el.text}</div>
                {r.options.map((o, i) => (
                  <div key={o.item.code} className={`emb-opt ${i === 0 ? "best" : ""}`}>
                    <code>{o.item.code}</code>
                    <span className="emb-text">{o.item.description}</span>
                    <b style={{ color: scoreColor(o.score) }}>{o.score}%</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "group" && (
        <div className="emb-panel">
          <p className="emb-hint">Clusters element types by meaning. Click a group to select all its elements.</p>
          <label className="emb-slider">
            Group threshold <b>{threshold}%</b>
            <input type="range" min={30} max={95} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
          </label>
          <button className="emb-btn primary" disabled={busy} onClick={doGroup}>
            <span className="material-icons-round">hub</span>Build groups
          </button>
          <div className="emb-list">
            {groups.map((g, i) => (
              <div key={i} className={`emb-card ${g.labels.length === 1 ? "alone" : ""}`} onClick={() => selectEl(g.indices.map((k) => engineRef.current!.elements[k]))}>
                <div className="emb-card-title">
                  Group {i + 1} <span className="emb-tag">{g.indices.length} el.</span>
                </div>
                {g.labels.slice(0, 6).map((l) => <div key={l} className="emb-sub">{l}</div>)}
                {g.labels.length > 6 && <div className="emb-sub muted">+{g.labels.length - 6} more types</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "lab" && (
        <div className="emb-panel">
          <p className="emb-hint">Compare any two descriptions and see where embeddings shine and where they fail (numbers, negation).</p>
          <input className="emb-input" value={labA} onChange={(e) => setLabA(e.target.value)} />
          <input className="emb-input" value={labB} onChange={(e) => setLabB(e.target.value)} />
          <div className="emb-row">
            <button className="emb-btn primary" disabled={busy} onClick={doLab}>
              <span className="material-icons-round">compare_arrows</span>Compare
            </button>
            {labScore !== null && <div className="emb-big" style={{ color: scoreColor(labScore) }}>{labScore}%</div>}
          </div>
          <div className="emb-list">
            {labRows.map((p, i) => {
              const [tag, a, b, same] = LAB_PAIRS[i];
              const ok = same ? p >= 50 : p < 50;
              return (
                <div key={i} className="emb-item">
                  <span className="emb-tag">{tag}</span>
                  <span className="emb-text">{a} ↔ {b}</span>
                  <b style={{ color: scoreColor(p) }}>{p}%</b>
                  <span className="material-icons-round" style={{ color: ok ? "#34d399" : "#f87171" }}>{ok ? "check_circle" : "cancel"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

