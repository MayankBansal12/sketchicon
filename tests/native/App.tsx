import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import Search from "@sketchicon/lucide/icons/search";
import Home from "@sketchicon/hugeicons/icons/home-01";
import { SketchIcon } from "sketchicon/native";

const styles = StyleSheet.create({ icon: { margin: 8, opacity: 0.8 } });

export default function App() {
  const ref = useRef<Svg>(null);
  return (
    <View>
      <SketchIcon ref={ref} icon={Search} size={32} color="#2563eb"
        accessibilityLabel="Search" testID="search-icon" style={styles.icon}
        onPress={() => ref.current?.measure(() => {})} />
      <SketchIcon icon={Home} title="Home" testID="home-icon" roughness={0.7} seed={42} />
      <SketchIcon icon={Search} testID="decorative-icon" />
    </View>
  );
}
