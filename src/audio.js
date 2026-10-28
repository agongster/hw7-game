// Sound effects, synthesised with the Web Audio API, so there are no audio files.
// Browsers only allow sound after a user gesture, so unlockAudio() runs on the first Enter.

const MASTER_VOLUME = 0.5;
const audio = { ctx: null, master: null, muted: false };

function unlockAudio() {
  if (!audio.ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audio.ctx = new AudioCtx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = audio.muted ? 0 : MASTER_VOLUME;
    audio.master.connect(audio.ctx.destination);
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume();
}

function toggleMute() {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : MASTER_VOLUME;
}

// One soft note with a quick attack and exponential fade. `at` and `dur` are in seconds.
function tone(freq, { at = 0, dur = 0.25, type = "sine", gain = 0.2, slideTo } = {}) {
  const ac = audio.ctx;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env);
  env.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A breathy whoosh: white noise through a band-pass filter sweeping from `from` to `to` Hz.
function whoosh({ dur = 0.3, from = 400, to = 1600, gain = 0.1 } = {}) {
  const ac = audio.ctx;
  const t0 = ac.currentTime;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(env);
  env.connect(audio.master);
  src.start(t0);
}

// Notes from a C major pentatonic scale, so any combination sounds pleasant.
const SOUNDS = {
  step: () => tone(523, { dur: 0.09, type: "triangle", gain: 0.05 }),
  mistStep: () => whoosh({ dur: 0.22, from: 1800, to: 3200, gain: 0.05 }),
  blocked: () => tone(165, { dur: 0.14, type: "triangle", gain: 0.12, slideTo: 130 }),
  mistBlocked: () => {
    whoosh({ dur: 0.25, from: 2400, to: 900, gain: 0.05 });
    tone(196, { dur: 0.16, type: "triangle", gain: 0.08 });
  },
  rotate: () => {
    whoosh({ dur: 0.32, from: 300, to: 1300, gain: 0.07 });
    tone(392, { dur: 0.4, gain: 0.035, slideTo: 523 });
  },
  jump: () => [659, 880, 1319].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.4, gain: 0.06 })),
  plateOn: () => {
    tone(262, { dur: 0.6, gain: 0.1 });
    tone(392, { at: 0.06, dur: 0.6, gain: 0.07 });
  },
  plateOff: () => tone(392, { dur: 0.4, gain: 0.07, slideTo: 262 }),
  fall: () => tone(659, { dur: 0.9, gain: 0.1, slideTo: 110 }),
  complete: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.09, dur: 1.0, gain: 0.07 })),
  start: () => [392, 523, 659].forEach((f, i) => tone(f, { at: i * 0.08, dur: 1.1, gain: 0.06 })),
  finale: () => [262, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.14, dur: 2.2, gain: 0.06 })),
  toggle: () => tone(880, { dur: 0.08, gain: 0.04 }),
};

function playSound(name) {
  if (!audio.ctx || audio.muted) return;
  SOUNDS[name]();
}
