// Keyboard bindings. KeyboardEvent.code is used so bindings follow physical
// key positions regardless of keyboard layout.
//
// Screen directions: 0 = up, 1 = right, 2 = down, 3 = left.

const BINDINGS = {
  KeyW: { player: 0, move: 0 },
  KeyD: { player: 0, move: 1 },
  KeyS: { player: 0, move: 2 },
  KeyA: { player: 0, move: 3 },
  KeyQ: { player: 0, rotate: -1 },
  KeyE: { player: 0, rotate: 1 },

  ArrowUp: { player: 1, move: 0 },
  ArrowRight: { player: 1, move: 1 },
  ArrowDown: { player: 1, move: 2 },
  ArrowLeft: { player: 1, move: 3 },
  Comma: { player: 1, rotate: -1 },
  Period: { player: 1, rotate: 1 },

  KeyZ: { player: 0, zoom: -1 },
  KeyX: { player: 0, zoom: 1 },
  BracketLeft: { player: 1, zoom: -1 },
  BracketRight: { player: 1, zoom: 1 },

  KeyR: { restart: true },
  Enter: { confirm: true },
  NumpadEnter: { confirm: true },
  Space: { confirm: true },
  Escape: { menu: true },
  KeyH: { toggleHints: true },
  KeyM: { toggleMute: true },
};

// On-screen labels for the bindings above, per player (move labels in screen-direction order).
const MOVE_LABELS = [["W", "D", "S", "A"], ["↑", "→", "↓", "←"]];
const MOVE_KEYS_TEXT = ["W A S D", "the arrow keys"];
const ROTATE_LABELS = ["Q / E", ", / ."];
const ZOOM_LABELS = ["Z / X", "[ / ]"];

// Calls onAction(action) once per key press; holding a key does not repeat.
// The mouse wheel (or trackpad pinch) over a half of the screen zooms that player's view.
function listenForInput(onAction) {
  window.addEventListener("wheel", (e) => {
    e.preventDefault(); // stop the page (or browser) from zooming instead
    const player = e.clientX < window.innerWidth / 2 ? 0 : 1;
    onAction({ player, zoomBy: Math.exp(-e.deltaY * 0.002) });
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const action = BINDINGS[e.code];
    if (!action) return;
    e.preventDefault(); // stop arrow keys and space from scrolling the page
    if (e.repeat) return;
    onAction(action);
  });
}
