import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import {
  defineComponent,
  h,
  type PropType,
  type SVGAttributes,
} from "vue";

interface CachedPaths {
  signature: string;
  paths: ReturnType<typeof renderSketch>;
}

const defaultPathCache = new WeakMap<SketchGeometry, CachedPaths>();

function getPaths(
  icon: SketchGeometry,
  roughness: number,
  seed: number,
  signature?: string,
) {
  if (roughness !== 1.5 || seed !== 0) {
    return renderSketch(icon, { roughness, seed });
  }
  const cacheSignature = signature ?? JSON.stringify(icon.primitives);
  const cached = defaultPathCache.get(icon);
  if (cached && cached.signature === cacheSignature) return cached.paths;
  const paths = renderSketch(icon, { roughness, seed });
  defaultPathCache.set(icon, { signature: cacheSignature, paths });
  return paths;
}

export interface SketchIconProps extends Omit<SVGAttributes, "title"> {
  icon: SketchGeometry;
  roughness?: number;
  seed?: number;
  size?: number | string;
  strokeWidth?: number | string;
  title?: string;
}

export const SketchIcon = defineComponent({
  name: "SketchIcon",
  inheritAttrs: false,
  props: {
    icon: { type: Object as PropType<SketchGeometry>, required: true },
    size: { type: [Number, String] as PropType<number | string>, default: 24 },
    roughness: { type: Number, default: 1.5 },
    seed: { type: Number, default: 0 },
    strokeWidth: {
      type: [Number, String] as PropType<number | string>,
      default: 1.5,
    },
    title: String,
  },
  setup(props, { attrs }) {
    return () => {
      const signature = props.roughness === 1.5 && props.seed === 0
        ? JSON.stringify(props.icon.primitives)
        : undefined;
      const paths = getPaths(props.icon, props.roughness, props.seed, signature);
      const isLabeled = Boolean(
        props.title || attrs["aria-label"] || attrs["aria-labelledby"],
      );
      return h("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: props.size,
        height: props.size,
        viewBox: props.icon.viewBox ?? "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": props.strokeWidth,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        role: isLabeled ? "img" : undefined,
        "aria-hidden": isLabeled ? undefined : true,
        ...attrs,
      }, [
        ...(props.title ? [h("title", props.title)] : []),
        ...paths.map((path) => h("path", { d: path.d, opacity: path.opacity })),
      ]);
    };
  },
});

export default SketchIcon;
