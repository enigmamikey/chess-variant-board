const SUPABASE_URL = "https://pbotmokpdrjopozqxelc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBib3Rtb2twZHJqb3BvenF4ZWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDM1OTUsImV4cCI6MjA4NTExOTU5NX0.m8l6CdVyCBhkxY5xGVmc4iNFuPsk-ia5eUTxZ-ZE2e4";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const board = document.getElementById("board");

for (let rank = 7; rank >= 0; rank--) {
  for (let file = 0; file < 8; file++) {
    const square = document.createElement("div");
    square.classList.add("square");

    const isLight = (file + rank) % 2 === 0;
    square.classList.add(isLight ? "light" : "dark");

    square.dataset.file = file;
    square.dataset.rank = rank;

    board.appendChild(square);
  }
}

document.querySelectorAll(".square").forEach(square => {
  square.addEventListener("dragover", (e) => {
    e.preventDefault(); // required to allow drop
    square.classList.add("drop-target");
  });

  square.addEventListener("dragleave", () => {
    square.classList.remove("drop-target");
  });

  square.addEventListener("drop", async (e) => {
    e.preventDefault();
    square.classList.remove("drop-target");

    let payload;
    try {
      payload = JSON.parse(e.dataTransfer.getData("application/json"));
    } catch {
      return;
    }

    const file = Number(square.dataset.file);
    const rank = Number(square.dataset.rank);

    // Capture: if something is already on the target square, remove it
    const occupant = await getPieceAtSquare(file, rank);
    if (occupant && payload.source === "board" && occupant.id === payload.pieceId) {
      // Dropping a piece onto itself (same square). Do nothing.
      return;
    }

    if (occupant) {
      const { error: delErr } = await supabaseClient
        .from("pieces")
        .delete()
        .eq("id", occupant.id);

      if (delErr) {
        console.error("Capture delete error:", delErr);
        return;
      }
    }

    if (payload.source === "palette") {
      // INSERT new piece
      const { error } = await supabaseClient
        .from("pieces")
        .insert({
          type: payload.type,
          color: payload.color,
          file,
          rank,
          updated_at: new Date().toISOString(),
        });

      if (error) console.error("Insert error:", error);
      return;
    }

    if (payload.source === "board") {
      // MOVE existing piece (UPDATE)
      const { error } = await supabaseClient
        .from("pieces")
        .update({
          file,
          rank,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.pieceId);

      if (error) console.error("Move update error:", error);
      return;
    }
  });
});


const pieceSymbols = {
  white: {
    pawn: "♙",
    rook: "♖",
    knight: "♘",
    bishop: "♗",
    queen: "♕",
    king: "♔",
  },
  black: {
    pawn: "♟",
    rook: "♜",
    knight: "♞",
    bishop: "♝",
    queen: "♛",
    king: "♚",
  },
};

function getSquareEl(file, rank) {
  return document.querySelector(`.square[data-file="${file}"][data-rank="${rank}"]`);
}

async function getPieceAtSquare(file, rank) {
  const { data, error } = await supabaseClient
    .from("pieces")
    .select("id, type, color, file, rank")
    .eq("file", file)
    .eq("rank", rank)
    .limit(1);

  if (error) {
    console.error("getPieceAtSquare error:", error);
    return null;
  }
  return data?.[0] ?? null;
}

function renderPieces(pieces) {
  // Clear squares
  document.querySelectorAll(".square").forEach(square => {
    square.innerHTML = "";
  });

  pieces.forEach(piece => {
    const square = getSquareEl(piece.file, piece.rank);
    if (!square) return;

    const color = String(piece.color).toLowerCase();
    const type = String(piece.type).toLowerCase();
    const symbol = pieceSymbols[color]?.[type] ?? "�";

    const el = document.createElement("div");
    el.classList.add(color); // adds "white" or "black"
    el.className = "piece";
    el.textContent = symbol;
    el.draggable = true;

    // Store the piece id + origin
    el.dataset.pieceId = piece.id;
    el.dataset.source = "board";

    el.addEventListener("dragstart", (e) => {
      const payload = {
        source: "board",
        pieceId: piece.id,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
    });

    square.appendChild(el);
  });
}


async function loadPieces() {
  const { data, error } = await supabaseClient
    .from("pieces")
    .select("*");

  if (error) {
    console.error("Error loading pieces:", error);
    return;
  }

  console.log("Loaded pieces:", data);
  renderPieces(data);
}

supabaseClient
  .channel("pieces-changes")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "pieces" },
    () => loadPieces()
  )
  .subscribe();


loadPieces();

async function testInsert() {
  const { error } = await supabaseClient
    .from("pieces")
    .insert({
      type: "queen",
      color: "white",
      file: 4,
      rank: 4,
    });

    if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert succeeded");
    await loadPieces(); // <-- add this line
  }
}

function buildPalette() {
  const palette = document.getElementById("palette");
  palette.innerHTML = "";

  const paletteItems = [
    { color: "white", type: "pawn" },
    { color: "white", type: "rook" },
    { color: "white", type: "knight" },
    { color: "white", type: "bishop" },
    { color: "white", type: "queen" },
    { color: "white", type: "king" },
    { color: "black", type: "pawn" },
    { color: "black", type: "rook" },
    { color: "black", type: "knight" },
    { color: "black", type: "bishop" },
    { color: "black", type: "queen" },
    { color: "black", type: "king" },
  ];

  for (const item of paletteItems) {
    const el = document.createElement("div");
    el.className = "palette-piece";
    el.textContent = pieceSymbols[item.color][item.type];
    el.draggable = true;

    el.addEventListener("dragstart", (e) => {
      const payload = {
        source: "palette",
        type: item.type,
        color: item.color,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
    });

    palette.appendChild(el);
  }
}

buildPalette();

document.getElementById("btn-clear").addEventListener("click", async () => {
  if (!confirm("Clear the board for everyone?")) return;
  const { error } = await supabaseClient
    .from("pieces")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) console.error("Clear error:", error);
});


document.getElementById("btn-standard").addEventListener("click", async () => {
  // Clear first
  const { error: clearErr } = await supabaseClient.from("pieces").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (clearErr) {
    console.error("Clear error:", clearErr);
    return;
  }

  const pieces = [];

  // Pawns
  for (let file = 0; file < 8; file++) {
    pieces.push({ type: "pawn", color: "white", file, rank: 1 });
    pieces.push({ type: "pawn", color: "black", file, rank: 6 });
  }

  // Back ranks
  const backRank = ["rook","knight","bishop","queen","king","bishop","knight","rook"];
  for (let file = 0; file < 8; file++) {
    pieces.push({ type: backRank[file], color: "white", file, rank: 0 });
    pieces.push({ type: backRank[file], color: "black", file, rank: 7 });
  }

  const { error: insErr } = await supabaseClient.from("pieces").insert(pieces);
  if (insErr) console.error("Standard setup insert error:", insErr);
});

document.getElementById("btn-flip").addEventListener("click", () => {
  document.getElementById("board").classList.toggle("flipped");
});



// Uncomment this ONCE to test
// testInsert();
