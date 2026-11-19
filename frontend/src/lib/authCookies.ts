const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookies(token: string, role: string = "customer"): void {
  if (typeof window === "undefined" || !token) return;
  const cookieExpiry = new Date(Date.now() + AUTH_COOKIE_MAX_AGE_MS).toUTCString();
  document.cookie = `ezspace_token=${encodeURIComponent(token)}; path=/; expires=${cookieExpiry}; SameSite=Strict`;
  document.cookie = `ezspace_role=${encodeURIComponent(role || "customer")}; path=/; expires=${cookieExpiry}; SameSite=Strict`;
}

export function clearAuthCookies(): void {
  if (typeof window === "undefined") return;
  document.cookie = "ezspace_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
  document.cookie = "ezspace_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

export function hasAuthTokenCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((entry) => {
    const [key, ...rest] = entry.trim().split("=");
    return key === "ezspace_token" && rest.join("=").trim().length > 0;
  });
}
