import React, { createRef } from "react";
import { act, create } from "react-test-renderer";
import Svg, { Path } from "react-native-svg";
import { renderSketch } from "sketchicon/core";
import { SketchIcon } from "sketchicon/native";
import Search from "@sketchicon/lucide/icons/search";
import Home from "@sketchicon/hugeicons/icons/home-01";

global.IS_REACT_ACT_ENVIRONMENT = true;
let renderer;
const mount = (props) => {
  act(() => { renderer = create(<SketchIcon {...props} />); });
  return renderer.root.findByType(Svg);
};
const paths = () => renderer.root.findAllByType(Path).map(({ props }) => ({
  d: props.d, ...(props.opacity === undefined ? {} : { opacity: props.opacity }),
}));
afterEach(() => { act(() => renderer?.unmount()); });

test.each([Search, Home])("renders provider geometry as native SVG paths", (icon) => {
  const svg = mount({ icon });
  expect(paths()).toEqual(renderSketch(icon));
  expect(svg.props).toMatchObject({
    width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "black",
    strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
    accessible: false, accessibilityElementsHidden: true,
    importantForAccessibility: "no-hide-descendants",
  });
  expect(JSON.stringify(renderer.toJSON())).not.toMatch(/"type":"(?:svg|path|title)"/);
});

test("forwards native props and the SVG instance ref", () => {
  const ref = createRef();
  const onPress = jest.fn();
  const style = [{ margin: 8 }, { opacity: 0.5 }];
  const svg = mount({
    icon: Search, ref, size: 32, width: 48, color: "tomato", strokeWidth: 2,
    style, onPress, testID: "search", accessibilityLabel: "Search",
  });
  expect(svg.props).toMatchObject({
    width: 48, height: 32, color: "tomato", stroke: "tomato", strokeWidth: 2,
    style, testID: "search", accessible: true, accessibilityRole: "image",
    accessibilityLabel: "Search", accessibilityElementsHidden: false,
    importantForAccessibility: "auto",
  });
  expect(ref.current).toBe(svg.instance);
  expect(typeof ref.current.toDataURL).toBe("function");
  const event = { nativeEvent: { locationX: 1 } };
  svg.props.onPress(event);
  expect(onPress).toHaveBeenCalledWith(event);
});

test("uses title as a native label and lets explicit accessibility props win", () => {
  let svg = mount({ icon: Search, title: "Search" });
  expect(svg.props.accessibilityLabel).toBe("Search");
  act(() => renderer.update(<SketchIcon icon={Search} title="Search"
    accessibilityLabel="Find" accessible={false} accessibilityRole="button"
    accessibilityElementsHidden importantForAccessibility="no" />));
  svg = renderer.root.findByType(Svg);
  expect(svg.props).toMatchObject({
    accessibilityLabel: "Find", accessible: false, accessibilityRole: "button",
    accessibilityElementsHidden: true, importantForAccessibility: "no",
  });
});

test("supports aria-label on React Native and explicit stroke overrides", () => {
  const svg = mount({ icon: Search, "aria-label": "Search", color: "blue", stroke: "red" });
  expect(svg.props).toMatchObject({ accessible: true, stroke: "red", "aria-label": "Search" });
});

test("preserves deterministic options and updates after geometry changes", () => {
  const line = { type: "line", x1: 0, y1: 12, x2: 24, y2: 12 };
  const icon = { viewBox: "0 0 48 48", primitives: [line] };
  const svg = mount({ icon, size: "100%", roughness: 0.7, seed: 42 });
  expect(svg.props.viewBox).toBe(icon.viewBox);
  expect(svg.props.width).toBe("100%");
  expect(paths()).toEqual(renderSketch(icon, { roughness: 0.7, seed: 42 }));
  act(() => renderer.update(<SketchIcon icon={icon} />));
  const original = paths();
  line.x2 = 16;
  act(() => renderer.update(<SketchIcon icon={icon} />));
  expect(paths()).toEqual(renderSketch(icon));
  expect(paths()).not.toEqual(original);
});

test("keeps icons with external accessibility labels visible", () => {
  const svg = mount({ icon: Search, accessibilityLabelledBy: "search-label" });
  expect(svg.props).toMatchObject({
    accessible: true, accessibilityElementsHidden: false,
    accessibilityLabelledBy: "search-label", importantForAccessibility: "auto",
  });
});
