import type { SketchGeometry } from "@sketchicon/core";
import { SketchIcon } from "@sketchicon/react";
import Check from "sketchicon/icons/check";
import Copy from "sketchicon/icons/copy";
import Search from "sketchicon/icons/search";
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { RoughBox } from "../components/RoughBox";
import type { CatalogIconMetadata } from "../generated/catalog";
import { catalogLoaders, type CatalogGeometryChunk } from "../generated/loaders";
import { filterCatalog, filterCounts, filters } from "./catalog";

const PAGE_SIZE = 72;
const defaultColor = "#1f1f1f";
const colors = [defaultColor, "#6965db", "#e03131", "#2f9e44", "#1971c2"];
const chunkCache = new Map<number, Promise<CatalogGeometryChunk>>();

function loadChunk(chunkId: number) {
  const cached = chunkCache.get(chunkId);
  if (cached) return cached;

  const loader = catalogLoaders[chunkId];
  if (!loader) return Promise.reject(new Error(`Missing icon catalog chunk ${chunkId}`));
  const promise = loader();
  chunkCache.set(chunkId, promise);
  return promise;
}

const IconCard = memo(function IconCard({
  geometry,
  item,
  onSelect,
  roughness,
  size,
  strokeWidth,
}: {
  geometry: SketchGeometry;
  item: CatalogIconMetadata;
  onSelect: Dispatch<SetStateAction<CatalogIconMetadata | null>>;
  roughness: number;
  size: number;
  strokeWidth: number;
}) {
  return (
    <button
      className="icon-card"
      type="button"
      onClick={() => onSelect(item)}
      title={`View ${item.label} usage`}
    >
      <SketchIcon icon={geometry} size={size} roughness={roughness} strokeWidth={strokeWidth} />
      <span>{item.label}</span>
    </button>
  );
});

function UsageDialog({
  color,
  geometry,
  icon,
  onClose,
  roughness,
  size,
  strokeWidth,
}: {
  color: string;
  geometry: SketchGeometry | undefined;
  icon: CatalogIconMetadata | null;
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

  if (!icon || !geometry) return <dialog ref={dialogRef} />;

  const snippet = `import { ${icon.name}, SketchIcon } from "sketchicon";\n\n<SketchIcon\n  icon={${icon.name}}\n  size={${size}}\n  roughness={${roughness.toFixed(1)}}\n  strokeWidth={${strokeWidth.toFixed(1)}}\n  color="${color}"\n/>`;

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <dialog ref={dialogRef} className="usage-dialog" onCancel={onClose} onClose={onClose}>
      <div className="dialog-card">
        <RoughBox className="dialog-outline" seed={31} stroke="#b8b5ad" />
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close usage dialog">×</button>
        <div className="dialog-preview" style={{ color }}>
          <SketchIcon icon={geometry} size={96} roughness={roughness} strokeWidth={strokeWidth} title={icon.label} />
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

export default function IconLibrary() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [roughness, setRoughness] = useState(1);
  const [size, setSize] = useState(32);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState(defaultColor);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIcon, setSelectedIcon] = useState<CatalogIconMetadata | null>(null);
  const [geometries, setGeometries] = useState<CatalogGeometryChunk>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const deferredRoughness = useDeferredValue(roughness);
  const deferredSize = useDeferredValue(size);
  const deferredStrokeWidth = useDeferredValue(strokeWidth);

  const filteredIcons = useMemo(() => {
    return filterCatalog(deferredQuery, activeFilter);
  }, [activeFilter, deferredQuery]);

  const shownIcons = useMemo(
    () => filteredIcons.slice(0, visibleCount),
    [filteredIcons, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, deferredQuery]);

  useEffect(() => {
    const chunkIds = [...new Set(shownIcons.map((item) => item.chunkId))];
    let active = true;
    Promise.all(chunkIds.map(loadChunk)).then((chunks) => {
      if (active) setGeometries((current) => Object.assign({}, current, ...chunks));
    });
    return () => {
      active = false;
    };
  }, [shownIcons]);

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

  return (
    <>
      <div className="library-layout">
        <aside className="customizer" aria-label="Icon filters and customizer">
          <RoughBox className="customizer-outline" seed={23} stroke="#cbc8c0" />
          <div className="control-section">
            <h3>Customize</h3>
            <label className="range-control">
              <span>Roughness</span>
              <output>{roughness.toFixed(1)}</output>
              <input type="range" min="0" max="2" step="0.1" value={roughness} onChange={(event) => setRoughness(Number(event.target.value))} />
            </label>
            <label className="range-control">
              <span>Size</span>
              <output>{size}px</output>
              <input type="range" min="20" max="48" step="2" value={size} onChange={(event) => setSize(Number(event.target.value))} />
            </label>
            <label className="range-control">
              <span>Stroke</span>
              <output>{strokeWidth.toFixed(1)}px</output>
              <input type="range" min="1" max="3" step="0.25" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} />
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
                  <span>{filterCounts[filter.id]}</span>
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
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons..." />
            </label>
            <p><strong>{filteredIcons.length}</strong> icons</p>
          </div>

          {shownIcons.length > 0 ? (
            <div className="icon-grid" style={{ color }}>
              {shownIcons.map((item) => {
                const geometry = geometries[item.name];
                return geometry ? (
                  <IconCard
                    geometry={geometry}
                    item={item}
                    key={item.name}
                    onSelect={setSelectedIcon}
                    roughness={deferredRoughness}
                    size={deferredSize}
                    strokeWidth={deferredStrokeWidth}
                  />
                ) : (
                  <div className="icon-card icon-card-loading" key={item.name} aria-hidden="true">
                    <span>{item.label}</span>
                  </div>
                );
              })}
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

      <UsageDialog
        color={color}
        geometry={selectedIcon ? geometries[selectedIcon.name] : undefined}
        icon={selectedIcon}
        onClose={() => setSelectedIcon(null)}
        roughness={roughness}
        size={size}
        strokeWidth={strokeWidth}
      />
    </>
  );
}
