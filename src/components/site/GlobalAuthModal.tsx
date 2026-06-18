"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "./AuthModal";
import { stripAuthModalParams, type AuthMode } from "@/lib/auth-modal";

export function GlobalAuthModal() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const authMode = searchParams.get("auth");
  const isOpen = authMode === "signin" || authMode === "signup";
  const callbackUrl = searchParams.get("callbackUrl") || undefined;

  const closeHref = useMemo(
    () => stripAuthModalParams(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  useEffect(() => {
    if (!isOpen || status !== "authenticated") return;
    window.location.href = closeHref;
  }, [closeHref, isOpen, status]);

  return (
    <AuthModal
      key={authMode || "closed"}
      isOpen={isOpen}
      initialMode={(authMode as AuthMode) || "signin"}
      callbackUrl={callbackUrl}
      onClose={() => router.replace(closeHref)}
    />
  );
}
