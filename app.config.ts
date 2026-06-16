import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    // Use EAS secret file env var in CI/CD builds, fall back to local file in development
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./credentials/google-services.json",
  },
});
