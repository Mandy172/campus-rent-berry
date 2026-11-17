import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { safeReturnPath } from "@/lib/borrowbee";

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED")) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (event === "SIGNED_IN") {
        const pending = sessionStorage.getItem("borrowbee-next");
        if (pending) {
          sessionStorage.removeItem("borrowbee-next");
          void navigate({ to: safeReturnPath(pending) as "/browse" });
        }
      }
    });
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, [navigate]);

  return { user, ready };
}
