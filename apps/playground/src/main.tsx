import {
  Check,
  Copy,
  Package,
  PencilRuler,
  Search,
  SketchIcon,
  Sparkles,
} from "sketchicon";
import { StrictMode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import rough from "roughjs/bin/rough";

import { iconCatalog, type CatalogIcon } from "./generated/catalog";
import "./styles.css";

const PAGE_SIZE = 180;
const generator = rough.generator();

const filters = [
  { id: "all", label: "All icons", pattern: null },
  { id: "arrows", label: "Arrows", pattern: /arrow|chevron|corner|move|redo|undo/ },
  { id: "communication", label: "Communication", pattern: /mail|message|phone|send|radio|rss/ },
  { id: "files", label: "Files", pattern: /file|folder|archive|clipboard/ },
  { id: "media", label: "Media", pattern: /play|pause|volume|music|video|camera|image/ },
  { id: "shapes", label: "Shapes", pattern: /circle|square|triangle|diamond|octagon/ },
  { id: "weather", label: "Weather", pattern: /sun|moon|cloud|rain|snow|wind|thermometer/ },
] as const;

const defaultColor = "#1f1f1f";
const colors = [defaultColor, "#6965db", "#e03131", "#2f9e44", "#1971c2"];

function RoughBox({
  className = "",
  fill,
  seed,
  stroke = "#1f1f1f",
}: {
  className?: string;
  fill?: string;
  seed: number;
  stroke?: string;
}) {
  const paths = generator.toPaths(
    generator.rectangle(4, 4, 192, 92, {
      bowing: 1.2,
      fill,
      fillStyle: "solid",
      roughness: 1.35,
      seed,
      stroke,
      strokeWidth: 1.5,
    }),
  );

  return (
    <svg
      className={`rough-box ${className}`}
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={path.fill}
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
        />
      ))}
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.22c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.14c.98 0 1.95.13 2.86.38 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
      />
    </svg>
  );
}

function NpmMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M2 5.5h20v13H12v-2.2H8.7v2.2H2v-13Zm3.3 2.7v7.6h3.4v-5.1h1.7v5.1h3.3V8.2H5.3Zm10 0v7.6h3.4v-5.1h1.6v5.1h1.7V8.2h-6.7Z" />
    </svg>
  );
}

function UsageDialog({
  color,
  icon,
  onClose,
  roughness,
  size,
  strokeWidth,
}: {
  color: string;
  icon: CatalogIcon | null;
  onClose: () => void;
  roughness: number;
  size: number;
  strokeWidth: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (icon && !dialog.open) dialog.showModal();
    if (!icon && dialog.open) dialog.close();
  }, [icon]);

  if (!icon) return <dialog ref={dialogRef} />;

  const snippet = `import { ${icon.name}, SketchIcon } from "sketchicon";\n\n<SketchIcon\n  icon={${icon.name}}\n  size={${size}}\n  roughness={${roughness.toFixed(1)}}\n  strokeWidth={${strokeWidth.toFixed(1)}}\n  color="${color}"\n/>`;

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <dialog
      ref={dialogRef}
      className="usage-dialog"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="dialog-card">
        <RoughBox className="dialog-outline" seed={31} stroke="#b8b5ad" />
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close usage dialog">
          ×
        </button>
        <div className="dialog-preview" style={{ color }}>
          <SketchIcon
            icon={icon.icon}
            size={96}
            roughness={roughness}
            strokeWidth={strokeWidth}
            title={icon.label}
          />
        </div>
        <p className="dialog-kicker">Ready to use</p>
        <h3>{icon.label}</h3>
        <div className="snippet-wrap">
          <pre><code>{snippet}</code></pre>
          <button className="copy-snippet" type="button" onClick={copySnippet}>
            <SketchIcon icon={copied ? Check : Copy} size={16} roughness={0.8} />
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [roughness, setRoughness] = useState(1);
  const [size, setSize] = useState(32);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState(defaultColor);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIcon, setSelectedIcon] = useState<CatalogIcon | null>(null);
  const [installCopied, setInstallCopied] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const deferredRoughness = useDeferredValue(roughness);
  const deferredSize = useDeferredValue(size);
  const deferredStrokeWidth = useDeferredValue(strokeWidth);

  const filteredIcons = useMemo(() => {
    const filter = filters.find((item) => item.id === activeFilter) ?? filters[0];
    return iconCatalog.filter((item) => {
      const searchable = `${item.label} ${item.name} ${item.aliases.join(" ")}`.toLowerCase();
      return (!filter.pattern || filter.pattern.test(item.label)) && searchable.includes(deferredQuery);
    });
  }, [activeFilter, deferredQuery]);

  const shownIcons = filteredIcons.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, deferredQuery]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= filteredIcons.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredIcons.length));
        }
      },
      { rootMargin: "500px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredIcons.length, visibleCount]);

  async function copyInstall() {
    await navigator.clipboard.writeText("npm install sketchicon");
    setInstallCopied(true);
    window.setTimeout(() => setInstallCopied(false), 1600);
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="SketchIcon home">
          <span className="brand-mark">
            <SketchIcon icon={PencilRuler} size={20} roughness={1.2} />
          </span>
          SketchIcon
        </a>
        <nav className="social-links" aria-label="Project links">
          <a href="https://github.com/mayank12" target="_blank" rel="noreferrer" aria-label="SketchIcon on GitHub">
            <GithubMark />
          </a>
          <a href="https://www.npmjs.com/package/sketchicon" target="_blank" rel="noreferrer" aria-label="SketchIcon on npm">
            <NpmMark />
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="floating-card floating-card-left" aria-hidden="true">
            <RoughBox seed={7} fill="#fff3bf" />
            <SketchIcon icon={PencilRuler} size={64} roughness={1.4} />
          </div>
          <div className="floating-card floating-card-right" aria-hidden="true">
            <RoughBox seed={13} fill="#e5dbff" />
            <SketchIcon icon={Sparkles} size={64} roughness={1.4} />
          </div>

          <p className="hero-note">1,739 icons · React · SVG</p>
          <h1 id="hero-heading">Icons that feel<br />drawn, not generated.</h1>
          <p className="hero-copy">
            Familiar interface icons with a loose, human line. Deterministic, accessible, and ready for React.
          </p>
          <button className="install-command" type="button" onClick={copyInstall}>
            <RoughBox seed={19} fill="#6965db" stroke="#514dc5" />
            <span className="prompt">$</span>
            <code>npm install sketchicon</code>
            <span className="install-copy-state">
              <SketchIcon icon={installCopied ? Check : Copy} size={18} roughness={0.8} />
              <span>{installCopied ? "Copied" : "Copy"}</span>
            </span>
          </button>
          <a className="browse-link" href="#icons">
            Browse the whole set
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section className="icon-library" id="icons" aria-labelledby="icons-heading">
          <div className="section-heading">
            <p className="section-number">01 / The library</p>
            <h2 id="icons-heading">Pick one. Make it yours.</h2>
            <p>Search the complete set, tune the drawing, then click any icon for ready-to-paste React code.</p>
          </div>

          <div className="library-layout">
            <aside className="customizer" aria-label="Icon filters and customizer">
              <RoughBox className="customizer-outline" seed={23} stroke="#cbc8c0" />
              <div className="control-section">
                <h3>Customize</h3>
                <label className="range-control">
                  <span>Roughness</span>
                  <output>{roughness.toFixed(1)}</output>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={roughness}
                    onChange={(event) => setRoughness(Number(event.target.value))}
                  />
                </label>
                <label className="range-control">
                  <span>Size</span>
                  <output>{size}px</output>
                  <input
                    type="range"
                    min="20"
                    max="48"
                    step="2"
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                  />
                </label>
                <label className="range-control">
                  <span>Stroke</span>
                  <output>{strokeWidth.toFixed(1)}px</output>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.25"
                    value={strokeWidth}
                    onChange={(event) => setStrokeWidth(Number(event.target.value))}
                  />
                </label>
                <fieldset className="color-control">
                  <legend>Ink</legend>
                  <div className="color-options">
                    {colors.map((value) => (
                      <button
                        key={value}
                        className={value === color ? "selected" : ""}
                        type="button"
                        style={{ backgroundColor: value }}
                        onClick={() => setColor(value)}
                        aria-label={`Use ${value}`}
                        aria-pressed={value === color}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="control-section filter-section">
                <h3>Filter</h3>
                <div className="filter-list">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      className={activeFilter === filter.id ? "active" : ""}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      <span>{filter.label}</span>
                      <span>{filter.pattern ? iconCatalog.filter((item) => filter.pattern?.test(item.label)).length : iconCatalog.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="catalog-panel">
              <div className="catalog-toolbar">
                <label className="search-field">
                  <SketchIcon icon={Search} size={20} roughness={0.8} />
                  <span className="visually-hidden">Search icons</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search icons..."
                  />
                </label>
                <p><strong>{filteredIcons.length}</strong> icons</p>
              </div>

              {shownIcons.length > 0 ? (
                <div className="icon-grid" style={{ color }}>
                  {shownIcons.map((item) => (
                    <button
                      className="icon-card"
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedIcon(item)}
                      title={`View ${item.label} usage`}
                    >
                      <SketchIcon
                        icon={item.icon}
                        size={deferredSize}
                        roughness={deferredRoughness}
                        strokeWidth={deferredStrokeWidth}
                      />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <SketchIcon icon={Search} size={44} roughness={1.4} />
                  <h3>No icon hiding here.</h3>
                  <p>Try another word or reset the filter.</p>
                </div>
              )}

              <div className="load-sentinel" ref={loadMoreRef} aria-hidden="true">
                {visibleCount < filteredIcons.length ? "drawing more..." : "that's the whole set."}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <SketchIcon icon={Package} size={22} roughness={1} />
          <span>SketchIcon</span>
        </div>
        <p>Hand-drawn SVG icons for React.</p>
        <p className="attribution">Geometry derived from Lucide, licensed under ISC.</p>
      </footer>

      <UsageDialog
        color={color}
        icon={selectedIcon}
        onClose={() => setSelectedIcon(null)}
        roughness={roughness}
        size={size}
        strokeWidth={strokeWidth}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
