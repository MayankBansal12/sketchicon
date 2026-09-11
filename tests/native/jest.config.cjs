module.exports = {
  preset: "@react-native/jest-preset",
  testMatch: ["**/native.test.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((@)?react-native|react-native-svg|@sketchicon|sketchicon|svg-pathdata)/)",
  ],
};
