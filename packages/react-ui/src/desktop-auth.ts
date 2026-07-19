import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { BACKEND_URL } from "./config";
import { setDesktopToken } from "./desktop-token";

export { isTauri };

// Desktop sign-in: opens the system browser (full passkey/WebAuthn support,
// unlike Tauri's embedded webview) instead of navigating in-app, straight at
// /auth/desktop-signin -- a GET-navigable endpoint, not the client's
// signIn.social() POST. That matters: the whole OAuth handshake (the CSRF
// "state" cookie Better Auth sets when starting, and validates when Google
// redirects back) has to happen in one consistent cookie jar. Starting the
// flow via a fetch() from the Tauri webview sets that cookie in the
// webview's jar, but the callback lands in the system browser's jar instead
// -- a state_mismatch error. Starting the navigation in the system browser
// from the first hop keeps it all in one place. The system browser and the
// Tauri webview are still separate cookie jars for the *session* though, so
// the backend's desktop-bridge route hands that back as a token via a
// platypus:// deep link -- see apps/backend/src/index.ts.
export async function signInWithDesktopFlow(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let unlisten: (() => void) | undefined;

    onOpenUrl((urls) => {
      for (const url of urls) {
        const parsed = new URL(url);
        if (parsed.protocol !== "platypus:") continue;
        unlisten?.();
        const token = parsed.searchParams.get("token");
        if (token) {
          setDesktopToken(token);
          resolve();
        } else {
          reject(new Error(parsed.searchParams.get("error") ?? "sign-in failed"));
        }
        return;
      }
    })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
        return openUrl(`${BACKEND_URL}/auth/desktop-signin`);
      })
      .catch(reject);
  });
}
