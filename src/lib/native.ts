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

/** A short tactile tap for start/stop button presses. No-op on web. */
export async function hapticTap(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* haptics plugin unavailable — ignore */
  }
}

/** A success or warning buzz for round results. No-op on web. */
export async function hapticResult(success: boolean): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({
      type: success ? NotificationType.Success : NotificationType.Warning,
    });
  } catch {
    /* haptics plugin unavailable — ignore */
  }
}

/** Prevent the screen from dimming/locking during a round. No-op on web. */
export async function keepAwake(): Promise<void> {
  if (!isNative) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.keepAwake();
  } catch {
    /* keep-awake plugin unavailable — ignore */
  }
}

/** Allow the screen to dim/lock again once a round ends. No-op on web. */
export async function allowSleep(): Promise<void> {
  if (!isNative) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.allowSleep();
  } catch {
    /* keep-awake plugin unavailable — ignore */
  }
}
