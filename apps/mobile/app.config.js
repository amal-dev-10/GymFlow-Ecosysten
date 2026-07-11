module.exports = ({ config }) => {
  return {
    ...config,
    version: process.env.EXPO_PUBLIC_APP_VERSION || config.version || "1.0.0",
  };
};
