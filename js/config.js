// =============================================================
// Connessioni Italiane — configurazione cloud (Supabase)
//
// 1. Crea un progetto gratuito su https://supabase.com
// 2. Dashboard → Project Settings → API: copia "Project URL" e
//    la chiave "anon public"
// 3. Incollali qui sotto, salva, ricarica la pagina
// 4. NB: le credenziali "anon" sono sicure da esporre lato client.
//    Le politiche RLS nello schema garantiscono la privacy.
//
// Se lasci i valori vuoti, il sito funziona comunque in modalità
// "ospite" (solo localStorage, niente account, niente classifiche).
// =============================================================

window.APP_CONFIG = {
  SUPABASE_URL: "https://ghmizmjvlczrzggbaowd.supabase.co",        // es. "https://abcd1234.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_wAlgo-6WIvxfFkUaMPPacA_3HFIoAb6",   // es. "eyJhbGciOiJIUzI1NiIsInR..."

  // Suffisso usato per generare un'email sintetica da uno username
  // (Supabase richiede un'email; questo modo permette login con solo username).
  EMAIL_DOMAIN: "conn.local"
};
