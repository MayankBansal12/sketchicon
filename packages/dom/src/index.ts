import { renderSketch, type SketchGeometry, type SketchOptions } from "@sketchicon/core";

export type { SketchGeometry } from "@sketchicon/core";

export type SvgAttributeValue = string | number | boolean | null | undefined;

export interface SketchIconOptions extends SketchOptions {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  title?: string;
  /** Native SVG attribute names, e.g. "class", "stroke-width", "aria-label". */
  attributes?: Readonly<Record<string, SvgAttributeValue>>;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const managedAttributes = new WeakMap<SVGSVGElement, Set<string>>();

function buildIcon(
  document: Document,
  icon: SketchGeometry,
  { size = 24, strokeWidth = 1.5, color, title, attributes = {}, ...options }: SketchIconOptions,
): SVGSVGElement {
  const paths = renderSketch(icon, options);
  const svg = document.createElementNS(SVG_NS, "svg");
  const labeled = Boolean(title || attributes["aria-label"] || attributes["aria-labelledby"]);
  const values: Record<string, SvgAttributeValue> = {
    xmlns: SVG_NS,
    width: size,
    height: size,
    viewBox: icon.viewBox ?? "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    color,
    role: labeled ? "img" : undefined,
    "aria-hidden": labeled ? undefined : true,
    ...attributes,
  };
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) svg.setAttribute(name, String(value));
  }
  if (title) {
    const titleElement = document.createElementNS(SVG_NS, "title");
    titleElement.textContent = title;
    svg.append(titleElement);
  }
  for (const path of paths) {
    const element = document.createElementNS(SVG_NS, "path");
    element.setAttribute("d", path.d);
    if (path.opacity !== undefined) element.setAttribute("opacity", String(path.opacity));
    svg.append(element);
  }
  // Include omitted defaults so updates can remove stale accessibility attributes.
  managedAttributes.set(svg, new Set(Object.keys(values)));
  return svg;
}

/** Create an inline SVG. DOM access happens only when this function is called. */
export function createSketchIcon(
  icon: SketchGeometry,
  options: SketchIconOptions = {},
  ownerDocument: Document = document,
): SVGSVGElement {
  return buildIcon(ownerDocument, icon, options);
}

/**
 * Replace the geometry and complete rendering options, keeping the SVG element
 * and its event listeners. Omitted options reset to defaults; unrelated
 * attributes added by the caller are preserved.
 */
export function updateSketchIcon(
  svg: SVGSVGElement,
  icon: SketchGeometry,
  options: SketchIconOptions = {},
): SVGSVGElement {
  if (svg.namespaceURI !== SVG_NS || svg.localName !== "svg") {
    throw new TypeError("Expected an SVG element.");
  }
  // Build first: invalid geometry or attributes must not partially update the icon.
  const next = buildIcon(svg.ownerDocument, icon, options);
  const nextAttributes = managedAttributes.get(next)!;
  for (const name of managedAttributes.get(svg) ?? []) {
    if (!next.hasAttribute(name)) svg.removeAttribute(name);
  }
  for (const name of nextAttributes) {
    if (!next.hasAttribute(name)) svg.removeAttribute(name);
  }
  for (const attribute of Array.from(next.attributes)) {
    svg.setAttribute(attribute.name, attribute.value);
  }
  svg.replaceChildren(...Array.from(next.childNodes));
  managedAttributes.set(svg, nextAttributes);
  return svg;
}
