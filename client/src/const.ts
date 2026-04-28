export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const hasOAuthConfig = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  return Boolean(oauthPortalUrl && appId);
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = ({ warn = false }: { warn?: boolean } = {}) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    if (warn) {
      console.warn("[Auth] VITE_OAUTH_PORTAL_URL or VITE_APP_ID is not set.");
    }
    return "/";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
