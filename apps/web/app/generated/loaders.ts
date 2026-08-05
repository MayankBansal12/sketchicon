// Generated from lucide-static. Do not edit by hand.
import type { SketchGeometry } from "sketchicon/core";
import { geometries as initialGeometries } from "./chunks/catalog-000.js";

export type CatalogGeometryChunk = Readonly<Record<string, SketchGeometry>>;
export type CatalogGeometryLoader = () => Promise<CatalogGeometryChunk>;
export { initialGeometries };

export const catalogLoaders: readonly CatalogGeometryLoader[] = [
  () => Promise.resolve(initialGeometries),
  () => import("./chunks/catalog-001.js").then((module) => module.geometries),
  () => import("./chunks/catalog-002.js").then((module) => module.geometries),
  () => import("./chunks/catalog-003.js").then((module) => module.geometries),
  () => import("./chunks/catalog-004.js").then((module) => module.geometries),
  () => import("./chunks/catalog-005.js").then((module) => module.geometries),
  () => import("./chunks/catalog-006.js").then((module) => module.geometries),
  () => import("./chunks/catalog-007.js").then((module) => module.geometries),
  () => import("./chunks/catalog-008.js").then((module) => module.geometries),
  () => import("./chunks/catalog-009.js").then((module) => module.geometries),
  () => import("./chunks/catalog-010.js").then((module) => module.geometries),
  () => import("./chunks/catalog-011.js").then((module) => module.geometries),
  () => import("./chunks/catalog-012.js").then((module) => module.geometries),
  () => import("./chunks/catalog-013.js").then((module) => module.geometries),
  () => import("./chunks/catalog-014.js").then((module) => module.geometries),
  () => import("./chunks/catalog-015.js").then((module) => module.geometries),
  () => import("./chunks/catalog-016.js").then((module) => module.geometries),
  () => import("./chunks/catalog-017.js").then((module) => module.geometries),
  () => import("./chunks/catalog-018.js").then((module) => module.geometries),
  () => import("./chunks/catalog-019.js").then((module) => module.geometries),
  () => import("./chunks/catalog-020.js").then((module) => module.geometries),
  () => import("./chunks/catalog-021.js").then((module) => module.geometries),
  () => import("./chunks/catalog-022.js").then((module) => module.geometries),
  () => import("./chunks/catalog-023.js").then((module) => module.geometries),
  () => import("./chunks/catalog-024.js").then((module) => module.geometries),
];
