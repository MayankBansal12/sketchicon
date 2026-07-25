import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { forwardRef, useMemo, lazy, useState, useRef, useEffect, Suspense } from "react";
import { SVGPathData } from "svg-pathdata";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{
  rel: "preload",
  href: "/fonts/Virgil.woff2",
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous"
}];
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx("meta", {
        name: "theme-color",
        content: "#fbfaf7"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  const message = isRouteErrorResponse(error) && error.status === 404 ? "Page not found." : "The page could not be loaded.";
  return /* @__PURE__ */ jsxs("main", {
    className: "empty-state",
    children: [/* @__PURE__ */ jsx("h1", {
      children: message
    }), /* @__PURE__ */ jsx("a", {
      href: "/",
      children: "Return home"
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  links
}, Symbol.toStringTag, { value: "Module" }));
const KAPPA = 0.5522847498;
function ellipsePath(cx, cy, rx, ry) {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    `M${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy}Z`
  ].join("");
}
function pointsPath(points, close) {
  if (points.length < 4 || points.length % 2 !== 0) {
    throw new Error("Polyline and polygon points must contain at least two coordinate pairs.");
  }
  let path = `M${points[0]} ${points[1]}`;
  for (let index = 2; index < points.length; index += 2) {
    path += `L${points[index]} ${points[index + 1]}`;
  }
  return close ? `${path}Z` : path;
}
function rectPath(primitive) {
  const { x, y, width, height } = primitive;
  const requestedRx = primitive.rx ?? primitive.ry ?? 0;
  const requestedRy = primitive.ry ?? primitive.rx ?? 0;
  const rx = Math.max(0, Math.min(requestedRx, width / 2));
  const ry = Math.max(0, Math.min(requestedRy, height / 2));
  if (rx === 0 || ry === 0) {
    return `M${x} ${y}H${x + width}V${y + height}H${x}Z`;
  }
  return [
    `M${x + rx} ${y}`,
    `H${x + width - rx}`,
    `Q${x + width} ${y} ${x + width} ${y + ry}`,
    `V${y + height - ry}`,
    `Q${x + width} ${y + height} ${x + width - rx} ${y + height}`,
    `H${x + rx}`,
    `Q${x} ${y + height} ${x} ${y + height - ry}`,
    `V${y + ry}`,
    `Q${x} ${y} ${x + rx} ${y}Z`
  ].join("");
}
function primitiveToPath(primitive) {
  switch (primitive.type) {
    case "path":
      return primitive.d;
    case "line":
      return `M${primitive.x1} ${primitive.y1}L${primitive.x2} ${primitive.y2}`;
    case "polyline":
      return pointsPath(primitive.points, false);
    case "polygon":
      return pointsPath(primitive.points, true);
    case "circle":
      return ellipsePath(primitive.cx, primitive.cy, primitive.r, primitive.r);
    case "ellipse":
      return ellipsePath(primitive.cx, primitive.cy, primitive.rx, primitive.ry);
    case "rect":
      return rectPath(primitive);
  }
}
const DEFAULT_SEED$1 = 5370206;
function hashString(value, seed = DEFAULT_SEED$1) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 1831565813;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
const DEFAULT_ROUGHNESS = 1;
const DEFAULT_SEED = 0;
const BASE_DISPLACEMENT = 0.4;
const PATH_PRECISION = 1e3;
function clampRoughness(value) {
  if (value === void 0) return DEFAULT_ROUGHNESS;
  if (!Number.isFinite(value)) throw new Error("Roughness must be a finite number.");
  return Math.min(2, Math.max(0, value));
}
function normalizeSeed(value) {
  if (value === void 0) return DEFAULT_SEED;
  if (!Number.isFinite(value)) throw new Error("Seed must be a finite number.");
  return Math.trunc(value);
}
function randomOffset(random, amount) {
  return (random() * 2 - 1) * amount;
}
function jitterPoint(point, random, amount) {
  return {
    x: point.x + randomOffset(random, amount),
    y: point.y + randomOffset(random, amount)
  };
}
function normalizedCommands(path) {
  return new SVGPathData(path).toAbs().normalizeHVZ(false, true, true).normalizeST().qtToC().aToC().commands;
}
function sketchPass(commands, roughness, seed) {
  const random = createRandom(seed);
  const amount = BASE_DISPLACEMENT * roughness;
  const output = [];
  let sourceCurrent = { x: 0, y: 0 };
  let outputCurrent = { x: 0, y: 0 };
  let outputStart = { x: 0, y: 0 };
  for (const command of commands) {
    switch (command.type) {
      case SVGPathData.MOVE_TO: {
        const point = jitterPoint(command, random, amount * 0.65);
        output.push({ type: SVGPathData.MOVE_TO, relative: false, ...point });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = point;
        outputStart = point;
        break;
      }
      case SVGPathData.LINE_TO: {
        const dx = command.x - sourceCurrent.x;
        const dy = command.y - sourceCurrent.y;
        const length = Math.hypot(dx, dy);
        const end = length < 0.5 ? { x: outputCurrent.x + dx, y: outputCurrent.y + dy } : jitterPoint(command, random, amount * 0.65);
        const bend = randomOffset(random, Math.min(amount * 0.85, length * 0.04));
        const normalX = length === 0 ? 0 : -dy / length;
        const normalY = length === 0 ? 0 : dx / length;
        output.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: outputCurrent.x + (end.x - outputCurrent.x) / 3 + normalX * bend,
          y1: outputCurrent.y + (end.y - outputCurrent.y) / 3 + normalY * bend,
          x2: outputCurrent.x + (end.x - outputCurrent.x) * 2 / 3 + normalX * bend,
          y2: outputCurrent.y + (end.y - outputCurrent.y) * 2 / 3 + normalY * bend,
          ...end
        });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = end;
        break;
      }
      case SVGPathData.CURVE_TO: {
        const end = jitterPoint(command, random, amount * 0.5);
        const firstControl = jitterPoint({ x: command.x1, y: command.y1 }, random, amount);
        const secondControl = jitterPoint({ x: command.x2, y: command.y2 }, random, amount);
        output.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: firstControl.x,
          y1: firstControl.y,
          x2: secondControl.x,
          y2: secondControl.y,
          ...end
        });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = end;
        break;
      }
      case SVGPathData.CLOSE_PATH:
        output.push(command);
        outputCurrent = outputStart;
        break;
      default:
        throw new Error(`Unsupported normalized SVG command: ${command.type}`);
    }
  }
  return new SVGPathData(output).round(PATH_PRECISION).encode();
}
function renderSketch(geometry2, options = {}) {
  const roughness = clampRoughness(options.roughness);
  const seed = normalizeSeed(options.seed);
  const output = [];
  geometry2.primitives.forEach((primitive, index) => {
    const path = primitiveToPath(primitive);
    const normalized = new SVGPathData(path).toAbs().round(PATH_PRECISION).encode();
    if (roughness === 0) {
      output.push({ d: normalized });
      return;
    }
    const primitiveSeed = hashString(`${index}:${path}`, seed);
    const commands = normalizedCommands(path);
    output.push({ d: sketchPass(commands, roughness, primitiveSeed) });
    output.push({
      d: sketchPass(commands, roughness * 0.72, primitiveSeed ^ 2654435769),
      opacity: 0.72
    });
  });
  return output;
}
const SketchIcon = forwardRef(
  function SketchIcon2({
    icon,
    roughness = 1,
    seed = 0,
    size = 24,
    title,
    strokeWidth = 2,
    ...svgProps
  }, ref) {
    const paths = useMemo(
      () => renderSketch(icon, { roughness, seed }),
      [icon, roughness, seed]
    );
    const isLabeled = Boolean(
      title || svgProps["aria-label"] || svgProps["aria-labelledby"]
    );
    return /* @__PURE__ */ jsxs(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: icon.viewBox ?? "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: isLabeled ? "img" : void 0,
        "aria-hidden": isLabeled ? void 0 : true,
        ...svgProps,
        children: [
          title ? /* @__PURE__ */ jsx("title", { children: title }) : null,
          paths.map((path, index) => /* @__PURE__ */ jsx("path", { d: path.d, opacity: path.opacity }, index))
        ]
      }
    );
  }
);
const geometry$4 = { "viewBox": "0 0 24 24", "primitives": [{ "type": "path", "d": "M20 6 9 17l-5-5" }] };
const geometry$3 = { "viewBox": "0 0 24 24", "primitives": [{ "type": "rect", "x": 8, "y": 8, "width": 14, "height": 14, "rx": 2, "ry": 2 }, { "type": "path", "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }] };
const geometry$2 = { "viewBox": "0 0 24 24", "primitives": [{ "type": "path", "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" }, { "type": "path", "d": "M12 22V12" }, { "type": "polyline", "points": [3.29, 7, 12, 12, 20.71, 7] }, { "type": "path", "d": "m7.5 4.27 9 5.15" }] };
const geometry$1 = { "viewBox": "0 0 24 24", "primitives": [{ "type": "path", "d": "M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" }, { "type": "path", "d": "m8 6 2-2" }, { "type": "path", "d": "m18 16 2-2" }, { "type": "path", "d": "m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17" }, { "type": "path", "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }, { "type": "path", "d": "m15 5 4 4" }] };
const geometry = { "viewBox": "0 0 24 24", "primitives": [{ "type": "path", "d": "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" }, { "type": "path", "d": "M20 2v4" }, { "type": "path", "d": "M22 4h-4" }, { "type": "circle", "cx": 4, "cy": 20, "r": 2 }] };
function GithubMark() {
  return /* @__PURE__ */ jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx(
    "path",
    {
      fill: "currentColor",
      d: "M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.22c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.14c.98 0 1.95.13 2.86.38 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
    }
  ) });
}
function NpmMark() {
  return /* @__PURE__ */ jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { fill: "currentColor", d: "M2 5.5h20v13H12v-2.2H8.7v2.2H2v-13Zm3.3 2.7v7.6h3.4v-5.1h1.7v5.1h3.3V8.2H5.3Zm10 0v7.6h3.4v-5.1h1.6v5.1h1.7V8.2h-6.7Z" }) });
}
function RoughBox({
  className = "",
  fill = "none",
  seed,
  stroke = "#1f1f1f"
}) {
  const offset = (seed % 7 - 3) * 0.32;
  const outline = `M${4 + offset} 5 C52 3.8 147 5.7 ${195 - offset} 4.4 C196.4 29 194.8 70 195.5 95 C145 96.4 53 94.6 4.6 95.5 C3.6 70 5.3 29 ${4 + offset} 5 Z`;
  const secondLine = `M${5 - offset} 4.2 C55 5.4 145 3.5 ${194 + offset} 5.2 C195.2 31 196 69 194.4 94 C143 95.1 56 96.1 5.3 94.2 C4.2 68 3.8 31 ${5 - offset} 4.2`;
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      className: `rough-box ${className}`,
      viewBox: "0 0 200 100",
      preserveAspectRatio: "none",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsx("path", { d: outline, fill, stroke, strokeWidth: "1.25" }),
        /* @__PURE__ */ jsx("path", { d: secondLine, fill: "none", stroke, strokeWidth: "0.7", opacity: "0.55" })
      ]
    }
  );
}
const IconLibrary = lazy(async () => {
  const [module] = await Promise.all([import("./IconLibrary-CqWjNVvr.js"), import("./catalog-000-BtY_Qk2A.js")]);
  return module;
});
const meta = () => [{
  title: "SketchIcon: Hand-drawn icons for React"
}, {
  name: "description",
  content: "1,739 deterministic, customizable hand-drawn SVG icons for React."
}];
function IconLibraryBoundary() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const boundaryRef = useRef(null);
  useEffect(() => {
    const target = boundaryRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(([entry2]) => {
      if (entry2?.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, {
      rootMargin: "240px"
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return /* @__PURE__ */ jsx("div", {
    className: "library-boundary",
    ref: boundaryRef,
    children: shouldLoad ? /* @__PURE__ */ jsx(Suspense, {
      fallback: /* @__PURE__ */ jsx(LibraryFallback, {}),
      children: /* @__PURE__ */ jsx(IconLibrary, {})
    }) : /* @__PURE__ */ jsx(LibraryFallback, {})
  });
}
function LibraryFallback() {
  return /* @__PURE__ */ jsx("div", {
    className: "library-fallback",
    "aria-label": "Loading icon library",
    children: "Preparing the icon library..."
  });
}
const home = UNSAFE_withComponentProps(function Home() {
  const [installCopied, setInstallCopied] = useState(false);
  async function copyInstall() {
    await navigator.clipboard.writeText("npm install sketchicon");
    setInstallCopied(true);
    window.setTimeout(() => setInstallCopied(false), 1600);
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "site-shell",
    children: [/* @__PURE__ */ jsxs("header", {
      className: "topbar",
      children: [/* @__PURE__ */ jsxs("a", {
        className: "brand",
        href: "#top",
        "aria-label": "SketchIcon home",
        children: [/* @__PURE__ */ jsx("span", {
          className: "brand-mark",
          children: /* @__PURE__ */ jsx(SketchIcon, {
            icon: geometry$1,
            size: 20,
            roughness: 1.2
          })
        }), "SketchIcon"]
      }), /* @__PURE__ */ jsxs("nav", {
        className: "social-links",
        "aria-label": "Project links",
        children: [/* @__PURE__ */ jsx("a", {
          href: "https://github.com/mayank12",
          target: "_blank",
          rel: "noreferrer",
          "aria-label": "SketchIcon on GitHub",
          children: /* @__PURE__ */ jsx(GithubMark, {})
        }), /* @__PURE__ */ jsx("a", {
          href: "https://www.npmjs.com/package/sketchicon",
          target: "_blank",
          rel: "noreferrer",
          "aria-label": "SketchIcon on npm",
          children: /* @__PURE__ */ jsx(NpmMark, {})
        })]
      })]
    }), /* @__PURE__ */ jsxs("main", {
      id: "top",
      children: [/* @__PURE__ */ jsxs("section", {
        className: "hero",
        "aria-labelledby": "hero-heading",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "floating-card floating-card-left",
          "aria-hidden": "true",
          children: [/* @__PURE__ */ jsx(RoughBox, {
            seed: 7,
            fill: "#fff3bf"
          }), /* @__PURE__ */ jsx(SketchIcon, {
            icon: geometry$1,
            size: 64,
            roughness: 1.4
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "floating-card floating-card-right",
          "aria-hidden": "true",
          children: [/* @__PURE__ */ jsx(RoughBox, {
            seed: 13,
            fill: "#e5dbff"
          }), /* @__PURE__ */ jsx(SketchIcon, {
            icon: geometry,
            size: 64,
            roughness: 1.4
          })]
        }), /* @__PURE__ */ jsx("p", {
          className: "hero-note",
          children: "1,739 icons · React · SVG"
        }), /* @__PURE__ */ jsxs("h1", {
          id: "hero-heading",
          children: ["Icons that feel", /* @__PURE__ */ jsx("br", {}), "drawn, not generated."]
        }), /* @__PURE__ */ jsx("p", {
          className: "hero-copy",
          children: "Familiar interface icons with a loose, human line. Deterministic, accessible, and ready for React."
        }), /* @__PURE__ */ jsxs("button", {
          className: "install-command",
          type: "button",
          onClick: copyInstall,
          children: [/* @__PURE__ */ jsx(RoughBox, {
            seed: 19,
            fill: "#6965db",
            stroke: "#514dc5"
          }), /* @__PURE__ */ jsx("span", {
            className: "prompt",
            children: "$"
          }), /* @__PURE__ */ jsx("code", {
            children: "npm install sketchicon"
          }), /* @__PURE__ */ jsxs("span", {
            className: "install-copy-state",
            children: [/* @__PURE__ */ jsx(SketchIcon, {
              icon: installCopied ? geometry$4 : geometry$3,
              size: 18,
              roughness: 0.8
            }), /* @__PURE__ */ jsx("span", {
              children: installCopied ? "Copied" : "Copy"
            })]
          })]
        }), /* @__PURE__ */ jsxs("a", {
          className: "browse-link",
          href: "#icons",
          children: ["Browse the whole set", /* @__PURE__ */ jsx("span", {
            "aria-hidden": "true",
            children: "↓"
          })]
        })]
      }), /* @__PURE__ */ jsxs("section", {
        className: "icon-library",
        id: "icons",
        "aria-labelledby": "icons-heading",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "section-heading",
          children: [/* @__PURE__ */ jsx("p", {
            className: "section-number",
            children: "01 / The library"
          }), /* @__PURE__ */ jsx("h2", {
            id: "icons-heading",
            children: "Pick one. Make it yours."
          }), /* @__PURE__ */ jsx("p", {
            children: "Search the complete set, tune the drawing, then click any icon for ready-to-paste React code."
          })]
        }), /* @__PURE__ */ jsx(IconLibraryBoundary, {})]
      })]
    }), /* @__PURE__ */ jsxs("footer", {
      children: [/* @__PURE__ */ jsxs("div", {
        className: "footer-brand",
        children: [/* @__PURE__ */ jsx(SketchIcon, {
          icon: geometry$2,
          size: 22,
          roughness: 1
        }), /* @__PURE__ */ jsx("span", {
          children: "SketchIcon"
        })]
      }), /* @__PURE__ */ jsx("p", {
        children: "Hand-drawn SVG icons for React."
      }), /* @__PURE__ */ jsx("p", {
        className: "attribution",
        children: "Geometry derived from Lucide, licensed under ISC."
      })]
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-DzYnmmQh.js", "imports": ["/assets/jsx-runtime-CI2l1_DE.js", "/assets/errorBoundaries-Bibp0-YS.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/root-BdDRlGKS.js", "imports": ["/assets/jsx-runtime-CI2l1_DE.js", "/assets/errorBoundaries-Bibp0-YS.js"], "css": ["/assets/root-CVyT_inv.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/home-BVGv042S.js", "imports": ["/assets/home-Cd9z0ntI.js", "/assets/jsx-runtime-CI2l1_DE.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-f42fc9c6.js", "version": "f42fc9c6", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_enableNodeReadableStream": false, "unstable_optimizeDeps": false };
const ssr = false;
const isSpaMode = false;
const prerender = ["/"];
const routeDiscovery = { "mode": "initial" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  }
};
const allowedActionOrigins = false;
export {
  RoughBox as R,
  SketchIcon as S,
  geometry$3 as a,
  allowedActionOrigins as b,
  assetsBuildDirectory as c,
  basename as d,
  entry as e,
  future as f,
  geometry$4 as g,
  publicPath as h,
  isSpaMode as i,
  routes as j,
  ssr as k,
  prerender as p,
  routeDiscovery as r,
  serverManifest as s
};
