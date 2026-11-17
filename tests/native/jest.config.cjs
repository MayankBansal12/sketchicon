module.exports = {
  preset: require("react-native/package.json").version.startsWith("0.79.")
    ? "react-native"
    : "@react-native/jest-preset",
  testMatch: ["**/native.test.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((@)?react-native|react-native-svg|@sketchicon|sketchicon|svg-pathdata)/)",
  ],
};
