// In-memory only for now -- lost on app restart, requiring re-login each
// time. Persisting this securely (real OS keychain) is deliberately
// deferred: the mature @tauri-apps-official option doesn't exist yet
// (the community keyring plugin is at 0.1.1, too immature to depend on for
// session storage), and Stronghold adds its own vault-key-management
// design decision beyond just "store this string." Get the OAuth + deep
// link mechanism verified first, revisit persistence as its own step.
let desktopToken: string | undefined;

export function getDesktopToken(): string | undefined {
  return desktopToken;
}

export function setDesktopToken(token: string | undefined): void {
  desktopToken = token;
}
