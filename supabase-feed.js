import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://uxwmodnadidlsfwtshcq.supabase.co",
  "eyJhbGci..."
);

export default supabase;  // ← agregar esto
