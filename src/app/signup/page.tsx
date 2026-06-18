import { redirect } from "next/navigation";

function getModalTarget(callbackUrl?: string | string[]) {
  const raw = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  const safeCallbackUrl = raw || "/";

  try {
    const parsed = new URL(safeCallbackUrl, "http://localhost");
    const params = new URLSearchParams(parsed.search);
    params.set("auth", "signup");
    params.set("callbackUrl", safeCallbackUrl);
    const query = params.toString();
    return `${parsed.pathname}?${query}${parsed.hash}`;
  } catch {
    return `/?auth=signup&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
  }
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  redirect(getModalTarget(callbackUrl));
}
