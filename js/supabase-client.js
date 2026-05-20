// Connessioni Italiane — wrapper sopra il client Supabase.
// Espone `window.cloud` con tutte le operazioni necessarie al gioco.
// Se Supabase non è configurato, `window.cloud.ready === false` e
// il resto del sito continua a funzionare in modalità ospite.

(function () {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const hasConfig = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const hasSdk = !!(window.supabase && window.supabase.createClient);

  const cloud = {
    ready: hasConfig && hasSdk,
    client: null,
    user: null,
    profile: null,
    _listeners: [],
  };

  if (cloud.ready) {
    cloud.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  // ---- Session helpers ----

  cloud.onAuthChange = function (cb) {
    cloud._listeners.push(cb);
    // Fire once with current state
    cb(cloud.user, cloud.profile);
  };

  function notify() {
    cloud._listeners.forEach(cb => {
      try { cb(cloud.user, cloud.profile); } catch (e) { /* ignore */ }
    });
  }

  async function loadProfile(userId) {
    if (!userId) return null;
    const { data } = await cloud.client
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle();
    return data || null;
  }

  cloud.refreshSession = async function () {
    if (!cloud.ready) return;
    const { data } = await cloud.client.auth.getSession();
    cloud.user = data.session ? data.session.user : null;
    cloud.profile = cloud.user ? await loadProfile(cloud.user.id) : null;
    notify();
  };

  // ---- Auth ----

  function usernameToEmail(username) {
    return username.toLowerCase() + "@" + (cfg.EMAIL_DOMAIN || "conn.local");
  }

  cloud.validateUsername = function (username) {
    if (!username) return "Inserisci un username.";
    if (username.length < 3) return "Username troppo corto (min 3 caratteri).";
    if (username.length > 24) return "Username troppo lungo (max 24 caratteri).";
    if (!/^[a-z0-9_]+$/i.test(username)) return "Solo lettere, numeri e underscore.";
    return null;
  };

  cloud.signUp = async function (username, password) {
    if (!cloud.ready) throw new Error("Cloud non configurato.");
    const err = cloud.validateUsername(username);
    if (err) throw new Error(err);
    if (!password || password.length < 6) throw new Error("La password deve avere almeno 6 caratteri.");

    const email = usernameToEmail(username);
    const { data, error } = await cloud.client.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase() } },
    });
    if (error) {
      // Map common errors to friendly Italian
      if (/already/i.test(error.message)) throw new Error("Username già in uso.");
      throw new Error(error.message);
    }
    await cloud.refreshSession();
    return data;
  };

  cloud.signIn = async function (username, password) {
    if (!cloud.ready) throw new Error("Cloud non configurato.");
    const email = usernameToEmail(username.trim());
    const { data, error } = await cloud.client.auth.signInWithPassword({ email, password });
    if (error) {
      if (/invalid/i.test(error.message)) throw new Error("Username o password non validi.");
      throw new Error(error.message);
    }
    await cloud.refreshSession();
    return data;
  };

  cloud.signOut = async function () {
    if (!cloud.ready) return;
    await cloud.client.auth.signOut();
    cloud.user = null;
    cloud.profile = null;
    notify();
  };

  // ---- Progress sync ----

  cloud.saveProgress = async function (date, state) {
    if (!cloud.ready || !cloud.user) return;
    await cloud.client.from("progress").upsert({
      user_id: cloud.user.id,
      puzzle_date: date,
      solved_levels: state.solvedLevels,
      mistakes: state.mistakes,
      done: state.done,
      result: state.result,
      remaining: state.remaining,
      updated_at: new Date().toISOString(),
    });
  };

  cloud.loadProgress = async function (date) {
    if (!cloud.ready || !cloud.user) return null;
    const { data } = await cloud.client
      .from("progress")
      .select("*")
      .eq("user_id", cloud.user.id)
      .eq("puzzle_date", date)
      .maybeSingle();
    if (!data) return null;
    return {
      solvedLevels: data.solved_levels || [],
      mistakes: data.mistakes || 0,
      done: !!data.done,
      result: data.result,
      remaining: data.remaining,
    };
  };

  cloud.listAllProgress = async function () {
    if (!cloud.ready || !cloud.user) return [];
    const { data } = await cloud.client
      .from("progress")
      .select("puzzle_date, done, result, mistakes, solved_levels")
      .eq("user_id", cloud.user.id);
    return data || [];
  };

  // ---- Ratings ----

  cloud.rate = async function (date, stars) {
    if (!cloud.ready || !cloud.user) throw new Error("Devi effettuare l'accesso per votare.");
    const { error } = await cloud.client.from("ratings").upsert({
      user_id: cloud.user.id,
      puzzle_date: date,
      stars: stars,
    });
    if (error) throw new Error(error.message);
  };

  cloud.getRatingSummary = async function (date) {
    if (!cloud.ready) return { avg: null, count: 0, mine: null };
    const { data } = await cloud.client
      .from("ratings")
      .select("stars, user_id")
      .eq("puzzle_date", date);
    if (!data || data.length === 0) {
      return { avg: null, count: 0, mine: null };
    }
    const sum = data.reduce((s, r) => s + r.stars, 0);
    const mine = cloud.user
      ? (data.find(r => r.user_id === cloud.user.id) || {}).stars || null
      : null;
    return { avg: sum / data.length, count: data.length, mine };
  };

  cloud.getRatingSummariesForDates = async function (dates) {
    if (!cloud.ready || dates.length === 0) return {};
    const { data } = await cloud.client
      .from("ratings")
      .select("puzzle_date, stars")
      .in("puzzle_date", dates);
    const summary = {};
    (data || []).forEach(r => {
      if (!summary[r.puzzle_date]) summary[r.puzzle_date] = { sum: 0, count: 0 };
      summary[r.puzzle_date].sum += r.stars;
      summary[r.puzzle_date].count += 1;
    });
    Object.keys(summary).forEach(d => {
      summary[d].avg = summary[d].sum / summary[d].count;
    });
    return summary;
  };

  // ---- Achievements ----

  cloud.unlockAchievement = async function (achievementId) {
    if (!cloud.ready || !cloud.user) return { unlocked: false };
    const { error } = await cloud.client.from("achievements").insert({
      user_id: cloud.user.id,
      achievement_id: achievementId,
    });
    // Duplicate primary key = already unlocked. Treat as not newly unlocked.
    if (error) return { unlocked: false };
    return { unlocked: true };
  };

  cloud.listAchievements = async function () {
    if (!cloud.ready || !cloud.user) return [];
    const { data } = await cloud.client
      .from("achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", cloud.user.id);
    return data || [];
  };

  window.cloud = cloud;

  // Auto-refresh on load and on Supabase auth events
  if (cloud.ready) {
    cloud.client.auth.onAuthStateChange((_event, session) => {
      cloud.user = session ? session.user : null;
      if (cloud.user) {
        loadProfile(cloud.user.id).then(p => {
          cloud.profile = p;
          notify();
        });
      } else {
        cloud.profile = null;
        notify();
      }
    });
    cloud.refreshSession();
  }
})();
