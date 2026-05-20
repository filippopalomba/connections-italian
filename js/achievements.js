// Connessioni Italiane — definizioni e logica achievement.
// Ogni achievement ha un id stabile, titolo, descrizione e una
// funzione `check` che, dato il contesto, restituisce true se
// l'utente lo ha appena sbloccato.

(function () {
  "use strict";

  // `context` passato a check():
  //   {
  //     state,         // stato finale del puzzle appena giocato
  //     puzzle,        // oggetto puzzle (gruppi + data)
  //     fromArchive,   // bool: puzzle non era quello di oggi
  //     allProgress,   // array di tutte le partite del giocatore
  //     ratingsCount,  // numero di voti dati dal giocatore
  //   }
  const ACHIEVEMENTS = [
    {
      id: "first-win",
      title: "Primo passo",
      desc: "Completa il tuo primo puzzle.",
      icon: "🥇",
      check: ctx => ctx.state.result === "win" &&
        ctx.allProgress.filter(p => p.done && p.result === "win").length === 1,
    },
    {
      id: "flawless",
      title: "Senza errori",
      desc: "Completa un puzzle senza fare nessun errore.",
      icon: "✨",
      check: ctx => ctx.state.result === "win" && ctx.state.mistakes === 0,
    },
    {
      id: "purple-first",
      title: "Indovino",
      desc: "Trova per primo il gruppo viola (il più difficile).",
      icon: "🔮",
      check: ctx => ctx.state.result === "win" &&
        ctx.state.solvedLevels[0] === "purple",
    },
    {
      id: "near-miss",
      title: "Salvo per un pelo",
      desc: "Vinci avendo già fatto 3 errori.",
      icon: "😅",
      check: ctx => ctx.state.result === "win" && ctx.state.mistakes === 3,
    },
    {
      id: "archivist",
      title: "Esploratore d'archivio",
      desc: "Completa un puzzle dall'archivio.",
      icon: "📚",
      check: ctx => ctx.state.result === "win" && ctx.fromArchive,
    },
    {
      id: "wins-7",
      title: "Settimana piena",
      desc: "Completa 7 puzzle in totale.",
      icon: "🗓️",
      check: ctx => ctx.allProgress.filter(p => p.done && p.result === "win").length >= 7,
    },
    {
      id: "flawless-5",
      title: "Maestro delle connessioni",
      desc: "Completa 5 puzzle senza errori.",
      icon: "🏆",
      check: ctx => ctx.allProgress.filter(p => p.done && p.result === "win" && p.mistakes === 0).length >= 5,
    },
    {
      id: "critic-5",
      title: "Critico",
      desc: "Valuta 5 puzzle diversi.",
      icon: "⭐",
      check: ctx => ctx.ratingsCount >= 5,
    },
  ];

  window.ACHIEVEMENTS = ACHIEVEMENTS;

  // Run all check() functions and unlock any new ones in the cloud.
  // Returns the list of newly unlocked achievement objects so the UI
  // can show a notification.
  window.checkAchievements = async function (ctx) {
    if (!window.cloud || !window.cloud.ready || !window.cloud.user) return [];
    const existing = await window.cloud.listAchievements();
    const unlockedIds = new Set(existing.map(a => a.achievement_id));
    const newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (unlockedIds.has(a.id)) continue;
      let triggered = false;
      try { triggered = !!a.check(ctx); } catch (e) { triggered = false; }
      if (!triggered) continue;
      const res = await window.cloud.unlockAchievement(a.id);
      if (res.unlocked) newlyUnlocked.push(a);
    }
    return newlyUnlocked;
  };

  window.findAchievement = function (id) {
    return ACHIEVEMENTS.find(a => a.id === id);
  };
})();
