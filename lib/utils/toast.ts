/**
 * Thin wrapper around react-native-toast-message.
 *
 * Usage:
 *   import { showErrorToast, showSuccessToast } from "@/lib/utils";
 *
 *   showErrorToast("Save failed", "Please try again.");
 *   showSuccessToast("Saved!");
 *
 * The <Toast /> component must be mounted at the root of the app (see
 * app/_layout.tsx).
 */
import Toast from "react-native-toast-message";

/** Show a red error toast. */
export function showErrorToast(title: string, message?: string): void {
  Toast.show({
    type: "error",
    text1: title,
    text2: message,
    visibilityTime: 4000,
    topOffset: 60,
  });
}

/** Show a green success toast. */
export function showSuccessToast(title: string, message?: string): void {
  Toast.show({
    type: "success",
    text1: title,
    text2: message,
    visibilityTime: 3000,
    topOffset: 60,
  });
}

/** Show an amber info/warning toast. */
export function showInfoToast(title: string, message?: string): void {
  Toast.show({
    type: "info",
    text1: title,
    text2: message,
    visibilityTime: 3500,
    topOffset: 60,
  });
}
