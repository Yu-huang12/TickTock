import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor native shell (iOS/Android), false on web. */
export const isNative = Capacitor.isNativePlatform();

/**
 * One-time native setup: themes the status bar to match the app's dark UI and
 * hides the splash screen once the web layer is ready. No-ops on web.
 */
export async function initNative(): Promise<void> {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0b0b14" });
    }
  } catch {
    /* status bar plugin unavailable — ignore */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash plugin unavailable — ignore */
  }
}
