import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { MetaFunction } from "react-router";
import { SketchIcon } from "@sketchicon/react";
import Check from "sketchicon/icons/check";
import Copy from "sketchicon/icons/copy";
import Package from "sketchicon/icons/package";
import PencilRuler from "sketchicon/icons/pencil-ruler";
import Sparkles from "sketchicon/icons/sparkles";

import { GithubMark, NpmMark } from "../components/BrandMarks";
import { RoughBox } from "../components/RoughBox";

const IconLibrary = lazy(async () => {
  const [module] = await Promise.all([
    import("../icon-library/IconLibrary"),
    import("../generated/chunks/catalog-000"),
  ]);
  return module;
});

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
  const [installCopied, setInstallCopied] = useState(false);

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
          <IconLibraryBoundary />
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
    </div>
  );
}
