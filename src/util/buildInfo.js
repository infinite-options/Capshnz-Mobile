// Build information utility
export const getBuildInfo = () => {
  const buildDate = new Date().toISOString();
  const buildVersion = process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0";
  const buildTimestamp = new Date().getTime();
  const buildDateFormatted = new Date().toLocaleString();

  const buildInfo = {
    version: buildVersion,
    buildDate: buildDate,
    buildTimestamp: buildTimestamp,
    buildDateFormatted: buildDateFormatted,
  };

  console.log("Build Info:", buildInfo);
  return buildInfo;
};

export default getBuildInfo;
