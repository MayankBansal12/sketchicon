import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  Circle,
  GitBranch,
  Heart,
  House,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  Square,
  Star,
  Trash,
  User,
  X,
  Zap,
  SketchIcon,
  type SketchGeometry,
} from "sketchicon";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

const icons: Array<[string, SketchGeometry]> = [
  ["Search", Search],
  ["Menu", Menu],
  ["Close", X],
  ["Check", Check],
  ["Plus", Plus],
  ["Back", ChevronLeft],
  ["Arrow", ArrowRight],
  ["Circle", Circle],
  ["Square", Square],
  ["Heart", Heart],
  ["Star", Star],
  ["Home", House],
  ["User", User],
  ["Settings", Settings],
  ["Bell", Bell],
  ["Calendar", Calendar],
  ["Trash", Trash],
  ["Pencil", Pencil],
  ["Git branch", GitBranch],
  ["Zap", Zap],
];

function App() {
  const [roughness, setRoughness] = useState(1);
  const [seed, setSeed] = useState(0);

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">SVG in. Sketch out.</p>
        <h1>SketchIcon</h1>
        <p className="lede">
          Familiar interface icons redrawn with a steady hand and a repeatable seed.
        </p>
      </header>

      <section className="workbench" aria-label="Icon workbench">
        <aside className="controls">
          <div className="control-heading">
            <span>Drawing controls</span>
            <span className="status">deterministic</span>
          </div>

          <label>
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

          <label>
            <span>Seed</span>
            <input
              className="seed-input"
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </label>

          <button type="button" onClick={() => setSeed((value) => value + 1)}>
            Try another hand
          </button>

          <div className="code-sample">
            <code>{`<Search\n  roughness={${roughness.toFixed(1)}}\n  seed={${seed}}\n/>`}</code>
          </div>
        </aside>

        <div className="icon-sheet">
          <div className="sheet-heading">
            <h2>Popular marks</h2>
            <p>20 of 1,700+ compatible icons</p>
          </div>
          <div className="icon-grid">
            {icons.map(([name, icon]) => (
              <figure key={name}>
                <div className="icon-frame">
                  <SketchIcon
                    icon={icon}
                    size={32}
                    roughness={roughness}
                    seed={seed}
                    title={name}
                  />
                </div>
                <figcaption>{name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span>Standard SVG</span>
        <span>React 18 + 19</span>
        <span>No canvas</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
