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

function renderPieces(pieces) {
  // Clear all pieces first
  document.querySelectorAll(".square").forEach(square => {
    square.textContent = "";
  });

  pieces.forEach(piece => {
    const square = document.querySelector(
      `.square[data-file="${piece.file}"][data-rank="${piece.rank}"]`
    );

    if (square) {
      square.textContent = pieceSymbols[piece.color][piece.type];
      square.style.fontSize = "40px";
      square.style.cursor = "grab";
    }
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
  }
}

// Uncomment this ONCE to test
// testInsert();
