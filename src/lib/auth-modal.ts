export type AuthMode = "signin" | "signup";

export function buildAuthModalHref({
  pathname,
  search,
  mode,
  callbackUrl,
}: {
  pathname: string;
  search?: string;
  mode: AuthMode;
  callbackUrl?: string;
}) {
  const params = new URLSearchParams(search);
  params.set("auth", mode);

  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  } else {
    params.delete("callbackUrl");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function stripAuthModalParams(pathname: string, search?: string) {
  const params = new URLSearchParams(search);
  params.delete("auth");
  params.delete("callbackUrl");

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
