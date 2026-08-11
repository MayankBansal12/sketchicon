import type { SketchGeometry } from "sketchicon/core";
import { SketchIcon } from "sketchicon/runtime";
import Check from "@sketchicon/lucide/icons/check";
import ChevronDown from "@sketchicon/lucide/icons/chevron-down";
import Copy from "@sketchicon/lucide/icons/copy";
import Search from "@sketchicon/lucide/icons/search";
import SlidersHorizontal from "@sketchicon/lucide/icons/sliders-horizontal";
import X from "@sketchicon/lucide/icons/x";
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "react-router";

import { RoughBox } from "../components/RoughBox";
import { inkColors, palette } from "../theme";
import { lucideCatalog, type CatalogIconMetadata } from "../generated/catalog";
import {
  catalogLoaders,
  initialGeometries,
  type CatalogGeometryChunk,
} from "../generated/loaders";
import {
  filterCatalog,
  filters,
  getFilterCounts,
  providers,
  type ProviderFilter,
} from "./catalog";

const DEFAULT_COLUMNS = 6;
const DEFAULT_ROW_HEIGHT = 134;
const MOBILE_ROW_HEIGHT = 118;
const OVERSCAN_ROWS = 3;
const defaultColor = palette.ink;
const colors = inkColors;
const customColorInputId = "custom-ink-color";
const chunkCache = new Map<number, Promise<CatalogGeometryChunk>>();

function loadChunk(chunkId: number) {
  const cached = chunkCache.get(chunkId);
  if (cached) return cached;

  const loader = catalogLoaders[chunkId];
  if (!loader) return Promise.reject(new Error(`Missing icon catalog chunk ${chunkId}`));
  const promise = loader().catch((error) => {
    if (chunkCache.get(chunkId) === promise) chunkCache.delete(chunkId);
    throw error;
  });
  chunkCache.set(chunkId, promise);
  return promise;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function columnCountForWidth(width: number) {
  if (width <= 560) return 3;
  if (width <= 820) return 4;
  if (width <= 1060) return 5;
  return DEFAULT_COLUMNS;
}

function useVirtualGrid(itemCount: number) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [windowState, setWindowState] = useState({
    columns: DEFAULT_COLUMNS,
    endRow: 8,
    rowHeight: DEFAULT_ROW_HEIGHT,
    startRow: 0,
  });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const gridElement = grid;
    let frame = 0;

    function update() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const columns = columnCountForWidth(window.innerWidth);
        const rowHeight = window.innerWidth <= 560 ? MOBILE_ROW_HEIGHT : DEFAULT_ROW_HEIGHT;
        const rowCount = Math.ceil(itemCount / columns);
        const bounds = gridElement.getBoundingClientRect();
        const firstVisibleRow = Math.floor(Math.max(0, -bounds.top) / rowHeight);
        const visibleBottom = Math.max(0, Math.min(bounds.height, window.innerHeight - bounds.top));
        const lastVisibleRow = Math.ceil(visibleBottom / rowHeight);
        const startRow = Math.max(0, Math.min(rowCount, firstVisibleRow - OVERSCAN_ROWS));
        const endRow = Math.max(startRow, Math.min(rowCount, lastVisibleRow + OVERSCAN_ROWS));

        setWindowState((current) => {
          if (
            current.columns === columns &&
            current.endRow === endRow &&
            current.rowHeight === rowHeight &&
            current.startRow === startRow
          ) return current;
          return { columns, endRow, rowHeight, startRow };
        });
      });
    }

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(gridElement);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [itemCount]);

  return { gridRef, ...windowState };
}

const IconCard = memo(function IconCard({
  geometry,
  item,
  onFocus,
  onKeyDown,
  onSelect,
  roughness,
  selected,
  size,
  strokeWidth,
  tabIndex,
}: {
  geometry: SketchGeometry;
  item: CatalogIconMetadata;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSelect: (item: CatalogIconMetadata) => void;
  roughness: number;
  selected: boolean;
  size: number;
  strokeWidth: number;
  tabIndex: number;
}) {
  return (
    <button
      className={`icon-card${selected ? " selected" : ""}`}
      id={`icon-card-${item.id}`}
      type="button"
      onClick={() => onSelect(item)}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      aria-pressed={selected}
      aria-label={`View code for ${item.label}`}
      data-tooltip="View code for icon"
    >
      <SketchIcon icon={geometry} size={size} roughness={roughness} strokeWidth={strokeWidth} />
      <span>{item.label}</span>
    </button>
  );
});

function UsageDrawer({
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!icon) return;

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [icon, onClose]);

  if (!icon || !geometry) return null;

  const iconImport = `import ${icon.name} from "@sketchicon/${icon.provider}/icons/${icon.label}";\nimport { SketchIcon } from "sketchicon";`;
  const snippet = `${iconImport}\n\n<SketchIcon\n  icon={${icon.name}}\n  size={${size}}\n  roughness={${roughness.toFixed(1)}}\n  strokeWidth={${strokeWidth.toFixed(1)}}\n  color="${color}"\n/>`;

  async function copySnippet() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(snippet);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <aside className="usage-drawer" aria-labelledby="usage-drawer-title">
      <RoughBox className="drawer-outline" seed={31} stroke={palette.line} />
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Close usage drawer">
        <SketchIcon icon={X} size={15} />
      </button>
      <div className="drawer-summary">
        <div className="drawer-preview" style={{ color }}>
          <SketchIcon icon={geometry} size={size} roughness={roughness} strokeWidth={strokeWidth} title={icon.label} />
        </div>
        <div>
          <p className="drawer-kicker">{icon.provider === "hugeicons" ? "Hugeicons Core Free" : "Lucide"}</p>
          <h3 id="usage-drawer-title">{icon.label}</h3>
          <p className="drawer-import-name">Import name: <code>{icon.name}</code></p>
        </div>
      </div>
        <div className="snippet-wrap">
          <pre><code>{snippet}</code></pre>
          <button className="copy-snippet" type="button" onClick={copySnippet} aria-live="polite">
            <SketchIcon icon={copyState === "copied" ? Check : Copy} size={16} roughness={0.8} />
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy code"}
          </button>
        </div>
    </aside>
  );
}

export default function IconLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<ProviderFilter>("lucide");
  const [availableCatalog, setAvailableCatalog] = useState<readonly CatalogIconMetadata[]>(lucideCatalog);
  const [hugeiconsLoading, setHugeiconsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [roughness, setRoughness] = useState(1.5);
  const [size, setSize] = useState(42);
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [color, setColor] = useState(defaultColor);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [activeIconIndex, setActiveIconIndex] = useState(0);
  const [geometries, setGeometries] = useState<CatalogGeometryChunk>(initialGeometries);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const loadedChunkIds = useRef(new Set([0]));
  const pendingFocusIndex = useRef<number | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const renderedRoughness = useDebouncedValue(roughness, 100);
  const deferredSize = useDeferredValue(size);
  const deferredStrokeWidth = useDeferredValue(strokeWidth);
  const selectedIconSlug = searchParams.get("icon") ?? "";
  const selectedIconProvider = searchParams.get("provider") === "hugeicons"
    ? "hugeicons"
    : "lucide";

  const needsHugeicons = activeProvider !== "lucide" || selectedIconProvider === "hugeicons";

  useEffect(() => {
    if (!needsHugeicons || availableCatalog.some((icon) => icon.provider === "hugeicons")) {
      setHugeiconsLoading(false);
      return;
    }
    let active = true;
    setHugeiconsLoading(true);
    import("../generated/hugeicons-catalog.js").then(({ hugeiconsCatalog }) => {
      if (!active) return;
      setAvailableCatalog([...lucideCatalog, ...hugeiconsCatalog]);
      setHugeiconsLoading(false);
    }).catch(() => {
      if (active) setHugeiconsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [availableCatalog, needsHugeicons]);

  const filteredIcons = useMemo(() => {
    return filterCatalog(availableCatalog, deferredQuery, activeFilter, activeProvider);
  }, [activeFilter, activeProvider, availableCatalog, deferredQuery]);

  const filterCounts = useMemo(
    () => getFilterCounts(availableCatalog, activeProvider),
    [activeProvider, availableCatalog],
  );

  const selectedIcon = useMemo(() => {
    if (!selectedIconSlug) return null;
    return filterCatalog(availableCatalog, "", "all", selectedIconProvider)
      .find((item) => item.label === selectedIconSlug) ?? null;
  }, [availableCatalog, selectedIconProvider, selectedIconSlug]);

  const { columns, endRow, gridRef, rowHeight, startRow } = useVirtualGrid(filteredIcons.length);
  const visibleIcons = filteredIcons.slice(startRow * columns, endRow * columns);
  const visibleChunkIds = [...new Set(visibleIcons.map((item) => item.chunkId))]
    .filter((chunkId) => !loadedChunkIds.current.has(chunkId));
  const visibleChunkKey = visibleChunkIds.join(",");

  useEffect(() => {
    if (visibleChunkIds.length === 0) return;
    let active = true;
    setLoadError(false);

    visibleChunkIds.forEach((chunkId) => {
      loadChunk(chunkId).then((chunk) => {
        if (!active) return;
        loadedChunkIds.current.add(chunkId);
        setGeometries((current) => Object.assign({}, current, chunk));
      }).catch(() => {
        if (active) setLoadError(true);
      });
    });

    return () => {
      active = false;
    };
  }, [loadAttempt, visibleChunkKey]);

  useEffect(() => {
    if (!selectedIcon || loadedChunkIds.current.has(selectedIcon.chunkId)) return;
    let active = true;
    setLoadError(false);

    loadChunk(selectedIcon.chunkId).then((chunk) => {
      if (!active) return;
      loadedChunkIds.current.add(selectedIcon.chunkId);
      setGeometries((current) => Object.assign({}, current, chunk));
    }).catch(() => {
      if (active) setLoadError(true);
    });

    return () => {
      active = false;
    };
  }, [loadAttempt, selectedIcon]);

  function selectIcon(item: CatalogIconMetadata) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("icon", item.label);
    nextParams.set("provider", item.provider);
    setSearchParams(nextParams, { preventScrollReset: true });
  }

  function closeSelectedIcon() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("icon");
    nextParams.delete("provider");
    setSearchParams(nextParams, { preventScrollReset: true });
  }

  useEffect(() => {
    setActiveIconIndex(0);
  }, [activeFilter, activeProvider, deferredQuery]);

  useEffect(() => {
    const pendingIndex = pendingFocusIndex.current;
    if (pendingIndex === null) return;
    const item = filteredIcons[pendingIndex];
    const target = item ? document.getElementById(`icon-card-${item.id}`) : null;
    if (target instanceof HTMLButtonElement) {
      target.focus();
      pendingFocusIndex.current = null;
    }
  }, [activeIconIndex, endRow, filteredIcons, geometries, startRow]);

  function focusIcon(index: number) {
    if (filteredIcons.length === 0) return;
    const nextIndex = Math.max(0, Math.min(filteredIcons.length - 1, index));
    const grid = gridRef.current;
    pendingFocusIndex.current = nextIndex;
    setActiveIconIndex(nextIndex);

    if (grid) {
      const targetRow = Math.floor(nextIndex / columns);
      const targetTop = grid.getBoundingClientRect().top + window.scrollY + targetRow * rowHeight;
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;
      if (targetTop < viewportTop || targetTop + rowHeight > viewportBottom) {
        window.scrollTo({ top: Math.max(0, targetTop - window.innerHeight / 2 + rowHeight / 2) });
      }
    }
  }

  function handleIconKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = index + 1;
        break;
      case "ArrowLeft":
        nextIndex = index - 1;
        break;
      case "ArrowDown":
        nextIndex = index + columns;
        break;
      case "ArrowUp":
        nextIndex = index - columns;
        break;
      case "Home":
        nextIndex = event.ctrlKey ? 0 : Math.floor(index / columns) * columns;
        break;
      case "End":
        nextIndex = event.ctrlKey
          ? filteredIcons.length - 1
          : Math.min(filteredIcons.length - 1, Math.floor(index / columns) * columns + columns - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    focusIcon(nextIndex);
  }

  const rowCount = Math.ceil(filteredIcons.length / columns);
  const isShowingWholeSet = activeFilter === "all" && query.trim() === "";
  const virtualGridStyle = {
    color,
    height: rowCount * rowHeight,
    "--virtual-columns": columns,
    "--virtual-row-height": `${rowHeight}px`,
  } as CSSProperties;
  const firstVisibleIconIndex = startRow * columns;
  const lastVisibleIconIndex = Math.min(filteredIcons.length, endRow * columns) - 1;
  const tabStopIndex = activeIconIndex >= firstVisibleIconIndex && activeIconIndex <= lastVisibleIconIndex
    ? activeIconIndex
    : firstVisibleIconIndex;
  const visibleRows = [];
  for (let rowIndex = startRow; rowIndex < endRow; rowIndex += 1) {
    const rowIcons = filteredIcons.slice(rowIndex * columns, (rowIndex + 1) * columns);
    visibleRows.push(
      <div
        className="virtual-icon-row"
        key={rowIndex}
        role="row"
        aria-rowindex={rowIndex + 1}
        style={{ transform: `translateY(${rowIndex * rowHeight}px)` }}
      >
        {rowIcons.map((item, columnIndex) => {
          const itemIndex = rowIndex * columns + columnIndex;
          const geometry = geometries[item.id];
          return (
            <div className="icon-card-cell" key={item.id} role="gridcell">
              {geometry ? (
                <IconCard
                  geometry={geometry}
                  item={item}
                  onFocus={() => setActiveIconIndex(itemIndex)}
                  onKeyDown={(event) => handleIconKeyDown(event, itemIndex)}
                  onSelect={selectIcon}
                  roughness={renderedRoughness}
                  selected={selectedIcon?.id === item.id}
                  size={deferredSize}
                  strokeWidth={deferredStrokeWidth}
                  tabIndex={itemIndex === tabStopIndex ? 0 : -1}
                />
              ) : (
                <div className="icon-card icon-card-loading" aria-hidden="true">
                  <span>{item.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>,
    );
  }

  return (
    <>
      <div className="library-layout">
        <aside
          className={`customizer${controlsOpen ? " is-open" : ""}`}
          aria-label="Icon filters and customizer"
        >
          <button
            className="customizer-toggle"
            type="button"
            aria-expanded={controlsOpen}
            aria-controls="customizer-body"
            onClick={() => setControlsOpen((open) => !open)}
          >
            <span className="customizer-toggle-label">
              <SketchIcon icon={SlidersHorizontal} size={17} roughness={0.8} />
              Customize &amp; filter
            </span>
            <span className="customizer-toggle-chevron" aria-hidden="true">
              <SketchIcon icon={ChevronDown} size={16} roughness={0.8} />
            </span>
          </button>
          <div className="customizer-body" id="customizer-body">
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
                <label className="custom-color-option" htmlFor={customColorInputId} style={{ color }}>
                  <span className="visually-hidden">Pick custom ink color</span>
                  <input
                    id={customColorInputId}
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    aria-label="Pick custom ink color"
                  />
                </label>
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
          </div>
        </aside>

        <div className="catalog-panel">
          <div className="catalog-toolbar">
            <div className="catalog-tools">
              <div className="provider-tabs" role="group" aria-label="Icon provider">
                {providers.map((provider) => (
                  <button
                    className={activeProvider === provider.id ? "active" : ""}
                    key={provider.id}
                    type="button"
                    onClick={() => setActiveProvider(provider.id)}
                    aria-pressed={activeProvider === provider.id}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <SketchIcon icon={Search} size={20} roughness={0.8} />
                <span className="visually-hidden">Search icons</span>
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 7,000+ icons..." />
              </label>
            </div>
            <p>
              <strong>{filteredIcons.length}</strong> icons
              {hugeiconsLoading ? " + loading Hugeicons" : ""}
            </p>
          </div>

          {filteredIcons.length > 0 ? (
            <>
              <p className="visually-hidden" id="catalog-keyboard-help">
                Use arrow keys to move through icons. Press Enter to open the selected icon.
              </p>
              <div
                className="icon-grid virtual-icon-grid"
                ref={gridRef}
                style={virtualGridStyle}
                role="grid"
                aria-colcount={columns}
                aria-describedby="catalog-keyboard-help"
                aria-label="Icon catalog"
                aria-rowcount={rowCount}
              >
                {visibleRows}
              </div>
              {isShowingWholeSet ? <p className="catalog-complete-note">that's the whole set</p> : null}
              {loadError ? (
                <div className="catalog-load-error" role="status">
                  Some icons could not be drawn.
                  <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <SketchIcon icon={Search} size={44} roughness={1.4} />
              <h3>{hugeiconsLoading ? "Loading Hugeicons..." : "No icon hiding here."}</h3>
              <p>{hugeiconsLoading ? "Bringing in the free core collection." : "Try another word or reset the filter."}</p>
            </div>
          )}

          <UsageDrawer
            color={color}
            geometry={selectedIcon ? geometries[selectedIcon.id] : undefined}
            icon={selectedIcon}
            onClose={closeSelectedIcon}
            roughness={roughness}
            size={size}
            strokeWidth={strokeWidth}
          />
        </div>
      </div>

    </>
  );
}
