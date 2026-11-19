"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/ranking");
    // re-render the server header and any protected page with the signed-out state
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      로그아웃
    </Button>
  );
}
