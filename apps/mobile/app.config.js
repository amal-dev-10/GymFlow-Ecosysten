module.exports = ({ config }) => {
  const bundleId = process.env.EXPO_PUBLIC_BUNDLE_ID || "com.gymflow.staff";
  return {
    ...config,
    version: process.env.EXPO_PUBLIC_APP_VERSION || config.version || "1.0.0",
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
    },
    android: {
      ...config.android,
      package: bundleId,
    },
  };
};
