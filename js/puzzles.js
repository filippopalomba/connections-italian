// Connessioni Italiane — Puzzle data
// Ogni puzzle ha 4 gruppi di difficoltà crescente:
//   giallo (facile) → verde (medio) → blu (difficile) → viola (molto difficile)
// Tutte le parole e i temi sono originali, non copiati da NYT Connections.

window.PUZZLES = [
  {
    date: "2026-05-19",
    number: 7,
    groups: [
      {
        level: "yellow",
        theme: "TIPI DI PASTA",
        words: ["PENNE", "FUSILLI", "FARFALLE", "RIGATONI"]
      },
      {
        level: "green",
        theme: "STRUMENTI MUSICALI",
        words: ["VIOLINO", "TROMBA", "ARPA", "FLAUTO"]
      },
      {
        level: "blue",
        theme: "PESCI DI MARE",
        words: ["TONNO", "SPIGOLA", "ORATA", "BRANZINO"]
      },
      {
        level: "purple",
        theme: "CAPOLUOGHI DI REGIONE",
        words: ["ROMA", "MILANO", "TORINO", "BARI"]
      }
    ]
  },
  {
    date: "2026-05-18",
    number: 6,
    groups: [
      {
        level: "yellow",
        theme: "COLORI DELL'ARCOBALENO",
        words: ["ROSSO", "GIALLO", "VERDE", "BLU"]
      },
      {
        level: "green",
        theme: "ANIMALI DA FATTORIA",
        words: ["MUCCA", "MAIALE", "GALLINA", "PECORA"]
      },
      {
        level: "blue",
        theme: "BEVANDE CALDE",
        words: ["CAFFÈ", "TÈ", "CIOCCOLATA", "TISANA"]
      },
      {
        level: "purple",
        theme: "___ DI PASQUA",
        words: ["UOVO", "COLOMBA", "AGNELLO", "ISOLA"]
      }
    ]
  },
  {
    date: "2026-05-17",
    number: 5,
    groups: [
      {
        level: "yellow",
        theme: "ORTAGGI",
        words: ["CAROTA", "PATATA", "CIPOLLA", "CAVOLFIORE"]
      },
      {
        level: "green",
        theme: "SINONIMI INFORMALI DI TESTA",
        words: ["ZUCCA", "NOCE", "MELONE", "PERA"]
      },
      {
        level: "blue",
        theme: "UTENSILI DA CUCINA",
        words: ["MESTOLO", "GRATTUGIA", "FRUSTA", "SCHIUMAROLA"]
      },
      {
        level: "purple",
        theme: "GIOCHI DI CARTE ITALIANI",
        words: ["SCOPA", "BRISCOLA", "RAMINO", "TRESETTE"]
      }
    ]
  },
  {
    date: "2026-05-16",
    number: 4,
    groups: [
      {
        level: "yellow",
        theme: "FORMAGGI ITALIANI",
        words: ["PARMIGIANO", "MOZZARELLA", "GORGONZOLA", "PECORINO"]
      },
      {
        level: "green",
        theme: "VINI ITALIANI",
        words: ["CHIANTI", "BAROLO", "PROSECCO", "AMARONE"]
      },
      {
        level: "blue",
        theme: "PITTORI ITALIANI",
        words: ["CARAVAGGIO", "BOTTICELLI", "TIZIANO", "MODIGLIANI"]
      },
      {
        level: "purple",
        theme: "TARTARUGHE NINJA",
        words: ["LEONARDO", "MICHELANGELO", "RAFFAELLO", "DONATELLO"]
      }
    ]
  },
  {
    date: "2026-05-15",
    number: 3,
    groups: [
      {
        level: "yellow",
        theme: "ANIMALI DELLA SAVANA",
        words: ["ELEFANTE", "GIRAFFA", "IPPOPOTAMO", "ZEBRA"]
      },
      {
        level: "green",
        theme: "SEGNI ZODIACALI",
        words: ["TORO", "GEMELLI", "LEONE", "BILANCIA"]
      },
      {
        level: "blue",
        theme: "MOBILI DI CASA",
        words: ["SEDIA", "TAVOLO", "ARMADIO", "DIVANO"]
      },
      {
        level: "purple",
        theme: "COSE CHE PUNGONO",
        words: ["APE", "ORTICA", "AGO", "VESPA"]
      }
    ]
  },
  {
    date: "2026-05-14",
    number: 2,
    groups: [
      {
        level: "yellow",
        theme: "FRUTTI ROSSI",
        words: ["FRAGOLA", "CILIEGIA", "LAMPONE", "MELOGRANO"]
      },
      {
        level: "green",
        theme: "DOLCI ITALIANI",
        words: ["TIRAMISÙ", "CANNOLO", "SFOGLIATELLA", "CASSATA"]
      },
      {
        level: "blue",
        theme: "SPORT OLIMPICI",
        words: ["NUOTO", "GINNASTICA", "SCHERMA", "TUFFI"]
      },
      {
        level: "purple",
        theme: "___ DI MILANO",
        words: ["DUOMO", "NAVIGLIO", "PANETTONE", "RISOTTO"]
      }
    ]
  },
  {
    date: "2026-05-13",
    number: 1,
    groups: [
      {
        level: "yellow",
        theme: "VERBI DEL CUCINARE",
        words: ["TAGLIARE", "FRIGGERE", "BOLLIRE", "ARROSTIRE"]
      },
      {
        level: "green",
        theme: "TIPI DI PANE",
        words: ["FOCACCIA", "BAGUETTE", "CIABATTA", "MICHETTA"]
      },
      {
        level: "blue",
        theme: "PARTI DELLA CASA",
        words: ["TETTO", "MURO", "FINESTRA", "PORTA"]
      },
      {
        level: "purple",
        theme: "CALCIATORI ITALIANI LEGGENDARI",
        words: ["TOTTI", "BAGGIO", "PIRLO", "BUFFON"]
      }
    ]
  }
];

// Helpers
window.getPuzzleByDate = function(date) {
  return window.PUZZLES.find(p => p.date === date) || null;
};

window.getTodayPuzzle = function() {
  // Find puzzle with date <= today, pick the most recent
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...window.PUZZLES].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.find(p => p.date <= today) || sorted[0];
};

window.getArchivePuzzles = function() {
  // All puzzles except today's, sorted newest-first
  const today = window.getTodayPuzzle();
  return window.PUZZLES
    .filter(p => p.date !== today.date)
    .sort((a, b) => b.date.localeCompare(a.date));
};

window.formatItalianDate = function(isoDate) {
  const months = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
  ];
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};
