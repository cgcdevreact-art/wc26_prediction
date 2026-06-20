import { redirect } from "next/navigation";

function getModalTarget(callbackUrl?: string | string[]) {
  const raw = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  const safeCallbackUrl = raw || "/";

  try {
    const parsed = new URL(safeCallbackUrl, "http://localhost");
    const basePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const params = new URLSearchParams(parsed.search);
    params.set("auth", "signin");
    params.set("callbackUrl", safeCallbackUrl);
    const query = params.toString();
    return query ? `${parsed.pathname}?${query}${parsed.hash}` : `${basePath}?auth=signin`;
  } catch {
    return `/?auth=signin&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  redirect(getModalTarget(callbackUrl));
}
