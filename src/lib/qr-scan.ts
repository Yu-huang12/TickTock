import { isNative } from "./native";

/** Whether a native camera scanner is available (Capacitor iOS/Android). */
export const hasNativeScanner = isNative;

/**
 * Opens the native MLKit barcode scanner and returns the raw QR text, or null
 * if the user cancels or permission is denied. Only call when `hasNativeScanner`
 * is true — the plugin is dynamically imported so it never ships in the web bundle.
 */
export async function scanQrCodeNative(): Promise<string | null> {
  const { BarcodeScanner, BarcodeFormat } = await import(
    "@capacitor-mlkit/barcode-scanning"
  );

  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== "granted" && camera !== "limited") {
    throw new Error("Camera permission denied.");
  }

  // On Android the scanner UI ships as an on-demand Google Play module.
  try {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch {
    /* iOS / not applicable — ignore */
  }

  const { barcodes } = await BarcodeScanner.scan({
    formats: [BarcodeFormat.QrCode],
  });
  return barcodes[0]?.rawValue ?? null;
}
