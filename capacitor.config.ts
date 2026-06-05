import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yuhuang.ticktock",
  appName: "Tick Tock Challenge",
  webDir: "dist",
  backgroundColor: "#0b0b14",
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0b0b14",
      showSpinner: false,
    },
  },
};

export default config;
