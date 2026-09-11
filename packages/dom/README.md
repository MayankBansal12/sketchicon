# @sketchicon/dom

Create and update hand-drawn inline SVG with vanilla JavaScript. No UI framework is required.

## Install

```sh
npx sketchicon@latest --framework vanilla --lucide
# or:
npm install @sketchicon/dom @sketchicon/lucide
```

## Use with a bundler

```js
import { createSketchIcon, updateSketchIcon } from "@sketchicon/dom";
import Search from "@sketchicon/lucide/icons/search";

const icon = createSketchIcon(Search, { size: 24, title: "Search" });
document.querySelector("#search-button").append(icon);

// Pass the complete next options; omitted options reset to defaults.
updateSketchIcon(icon, Search, { size: 32, roughness: 0.8, title: "Search" });
```

Hugeicons and custom `SketchGeometry` work with the same functions. Both functions return the SVG element. Updating preserves the SVG itself, its event listeners, and unrelated caller-added attributes; it replaces its children and removes attributes supplied by earlier rendering options when omitted.

## Options

| Option | Default |
| --- | --- |
| `size` | `24` (number or string) |
| `roughness` | `1.5`, clamped to 0–2 |
| `seed` | `0` |
| `strokeWidth` | `1.5` |
| `color` | Inherited via `currentColor` |
| `title` | None |
| `attributes` | Native SVG attributes, applied after defaults |

Use native names such as `class`, `stroke-width`, and `aria-label` inside `attributes`. Values are strings, numbers, or booleans; `null` and `undefined` omit an attribute. Boolean values become strings (so `"aria-hidden": false` works).

```js
const icon = createSketchIcon(Search, {
  color: "rebeccapurple",
  attributes: { class: "search-icon", "aria-label": "Search" },
});
icon.addEventListener("click", () => console.log("Search"));
```

A title is inserted as text. Meaningful icons need `title`, `aria-label`, or `aria-labelledby`; other icons default to `aria-hidden="true"`. Explicit attributes override accessibility defaults.

## Plain HTML, no build step

Copy `node_modules/@sketchicon/dom/dist/browser.js` to `vendor/sketchicon.js` and the desired provider geometry file, for example `node_modules/@sketchicon/lucide/dist/icons/search.js`, to `vendor/search.js`. Serve these files alongside your HTML:

```html
<button id="search-button">Search</button>
<script type="module">
  import { createSketchIcon } from "./vendor/sketchicon.js";
  import Search from "./vendor/search.js";
  document.querySelector("#search-button").prepend(createSketchIcon(Search));
</script>
```

The browser entry bundles the geometry engine and its dependencies, with no bare imports or framework runtime. Each direct provider file is a standalone geometry module. A CDN can serve those same version-pinned files; no import map is necessary for this build. Regular npm imports require a bundler or import map.

## DOM ownership and server imports

Importing the package does not access `window` or `document`. Creating an icon requires a document; pass another document as the third argument for an iframe or DOM implementation:

```js
createSketchIcon(Search, { title: "Search" }, iframe.contentDocument);
```

Updates use the SVG's owner document. For server-side path generation without a DOM, use `renderSketch` from `@sketchicon/core`.
