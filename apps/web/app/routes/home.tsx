import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { MetaFunction } from "react-router";
import { SketchIcon } from "sketchicon/runtime";
import ArrowDown from "sketchicon/icons/arrow-down";
import Check from "sketchicon/icons/check";
import Copy from "sketchicon/icons/copy";
import Search from "sketchicon/icons/search";
import SunMedium from "sketchicon/icons/sun-medium";

import { GithubMark, NpmMark } from "../components/BrandMarks";
import { RoughBox, RoughTag } from "../components/RoughBox";
import { palette } from "../theme";

const packageManagers = [
  { command: "pnpm add sketchicon", id: "pnpm", label: "pnpm" },
  { command: "npm install sketchicon", id: "npm", label: "npm" },
  { command: "yarn add sketchicon", id: "yarn", label: "yarn" },
  { command: "bun add sketchicon", id: "bun", label: "bun" },
] as const;

type PackageManagerId = (typeof packageManagers)[number]["id"];

const IconLibrary = lazy(() => import("../icon-library/IconLibrary"));

export const meta: MetaFunction = () => [
  { title: "SketchIcon: Hand-drawn icons for React" },
  {
    name: "description",
    content: "1,739 deterministic, customizable hand-drawn SVG icons for React.",
  },
];

function IconLibraryBoundary() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = boundaryRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="library-boundary" ref={boundaryRef}>
      {shouldLoad ? (
        <Suspense fallback={<LibraryFallback />}>
          <IconLibrary />
        </Suspense>
      ) : (
        <LibraryFallback />
      )}
    </div>
  );
}

function LibraryFallback() {
  return <div className="library-fallback" aria-label="Loading icon library">Preparing the icon library...</div>;
}

export default function Home() {
  const [installCopyState, setInstallCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [packageManager, setPackageManager] = useState<PackageManagerId>("pnpm");
  const activeCommand =
    packageManagers.find((manager) => manager.id === packageManager) ?? packageManagers[0];

  function selectPackageManager(id: PackageManagerId) {
    setPackageManager(id);
    setInstallCopyState("idle");
  }

  async function copyInstall() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(activeCommand.command);
      setInstallCopyState("copied");
    } catch {
      setInstallCopyState("failed");
    }
    window.setTimeout(() => setInstallCopyState("idle"), 1600);
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="sketchicon home">
          <img src="/logo.svg" alt="" />
          sketchicon
        </a>
        <nav className="social-links" aria-label="Project links">
          <a href="https://github.com/MayankBansal12/sketchicon" target="_blank" rel="noreferrer" aria-label="View GitHub repo" data-tooltip="View GitHub repo">
            <GithubMark />
          </a>
          <a href="https://www.npmjs.com/package/sketchicon" target="_blank" rel="noreferrer" aria-label="Visit npm package" data-tooltip="Visit npm package">
            <NpmMark />
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="floating-card floating-card-left" aria-hidden="true">
            <RoughBox seed={7} fill={palette.highlight} />
            <SketchIcon icon={Search} size={64} roughness={1.4} />
          </div>
          <div className="floating-card floating-card-right" aria-hidden="true">
            <RoughBox seed={13} fill={palette.lilac} />
            <SketchIcon icon={SunMedium} size={64} roughness={1.4} />
          </div>

          <p className="hero-note">1,739 icons · For React · in beta</p>
          <h1 id="hero-heading">Icons that feel<br />drawn, not generated.</h1>
          <p className="hero-copy">
            Familiar stroke icons with a loose, human line. Deterministic, accessible, and ready for React.
          </p>
          <div className="install-block">
            <div className="install-tabs" role="group" aria-label="Package manager">
              {packageManagers.map((manager, index) => {
                const active = manager.id === packageManager;
                return (
                  <button
                    key={manager.id}
                    className={`install-tab${active ? " active" : ""}`}
                    type="button"
                    onClick={() => selectPackageManager(manager.id)}
                    aria-pressed={active}
                  >
                    <RoughTag
                      seed={11 + index * 9}
                      fill={active ? palette.accentWash : palette.surface}
                      stroke={active ? palette.accent : palette.line}
                    />
                    <span>{manager.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="install-command"
              type="button"
              onClick={copyInstall}
              aria-label={`Copy install command: ${activeCommand.command}`}
            >
              <RoughBox seed={19} fill={palette.accent} stroke={palette.accentStrong} />
              <span className="prompt">$</span>
              <code>{activeCommand.command}</code>
              <span className="install-copy-state" aria-live="polite">
                <SketchIcon icon={installCopyState === "copied" ? Check : Copy} size={18} roughness={0.8} />
                <span>{installCopyState === "copied" ? "Copied" : installCopyState === "failed" ? "Try again" : "Copy"}</span>
              </span>
            </button>
          </div>
          <a className="browse-link" href="#icons">
            Browse the whole set
            <SketchIcon icon={ArrowDown} size={16} roughness={1} />
          </a>
        </section>

        <section className="icon-library" id="icons" aria-labelledby="icons-heading">
          <div className="section-heading">
            <p className="section-number">01 / The library</p>
            <h2 id="icons-heading">Pick one. Make it yours.</h2>
            <p>Search the library, customize drawing, click icon for ready-to-paste React.</p>
          </div>
          <IconLibraryBoundary />
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <img src="/logo.svg" alt="" />
          <span>sketchicon</span>
        </div>
        <p>
            built by <a className="footer-link" href="https://mayank.fyi" target="_blank" rel="noreferrer">mayank</a> · currently in beta
        </p>
        <p className="attribution">
          credit to <a className="footer-link" href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a> and <a className="footer-link" href="https://feathericons.com" target="_blank" rel="noreferrer">Feather</a> for original icons · inspired from <a className="footer-link" href="https://excalidraw.com/" target="_blank" rel="noreferrer">excalidraw</a>
        </p>
      </footer>
    </div>
  );
}
