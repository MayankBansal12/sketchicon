import { createRef } from "react";
import { PlatformColor, StyleSheet } from "react-native";
import Svg from "react-native-svg";
import { SketchIcon, type SketchGeometry, type SketchIconProps } from "sketchicon/native";

const geometry: SketchGeometry = { primitives: [{ type: "circle", cx: 12, cy: 12, r: 8 }] };
const styles = StyleSheet.create({ icon: { margin: 8 } });
const props: SketchIconProps = {
  icon: geometry, color: PlatformColor("label"), stroke: "red", fill: "none",
  style: [styles.icon, { opacity: 0.5 }], accessibilityLabel: "Circle",
  accessibilityHint: "A native icon", accessibilityRole: "image",
  onPress: (event) => { event.nativeEvent.locationX; },
};
<SketchIcon {...props} ref={createRef<Svg>()} width="100%" height={32} />;
// @ts-expect-error Native refs are SVG component instances, not DOM elements.
<SketchIcon icon={geometry} ref={createRef<SVGSVGElement>()} />;
// @ts-expect-error Native styles must not accept CSS strings.
<SketchIcon icon={geometry} style="color: red" />;
// @ts-expect-error Icon paths are owned by the renderer.
<SketchIcon icon={geometry}><Svg /></SketchIcon>;
// @ts-expect-error DOM click handlers are not native press handlers.
<SketchIcon icon={geometry} onClick={() => {}} />;
