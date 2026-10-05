/* Sound on the homepage, kept polite:

   - The shore ambience never starts by itself. It is off on every visit and
     plays only while the visitor has the sound button switched on. A
     seamless loop (Web Audio, so there is no gap) fades in and out and
     pauses with the tab; it is only downloaded once switched on.
   - Stepping through a walker into the other painting always plays a short
     starlight cue: the click is the visitor's own gesture. The cue file is
     fetched as the pointer reaches a walker, so it is ready by the click. */

const LOOP_LEVEL = 0.55;
const STEP_LEVEL = 0.13;
// while the cue plays, the ambience steps back so the cue isn't lost in it
const DUCK_LEVEL = 0.12;

const button = document.querySelector<HTMLButtonElement>("[data-shore-sound]");
if (button) initShoreSound(button);

function initShoreSound(button: HTMLButtonElement) {
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    button.hidden = true;
    return;
  }

  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let loopSource: AudioBufferSourceNode | null = null;
  let loopBuffer: Promise<AudioBuffer> | null = null;
  let stepBuffer: Promise<AudioBuffer> | null = null;
  let on = false;

  function audio() {
    if (!context) {
      context = new AudioContextClass!();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
    }
    return context;
  }

  function load(url: string) {
    return fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => audio().decodeAudioData(data));
  }

  function fadeTo(level: number, seconds: number) {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(level, now + seconds);
  }

  async function start() {
    const ctx = audio();
    loopBuffer ??= load(button.dataset.loop!);
    await ctx.resume();
    const buffer = await loopBuffer;
    if (!on) return;

    if (!loopSource) {
      loopSource = ctx.createBufferSource();
      loopSource.buffer = buffer;
      loopSource.loop = true;
      loopSource.connect(master!);
      loopSource.start();
    }
    fadeTo(LOOP_LEVEL, 2.5);
  }

  function stop() {
    fadeTo(0, 0.8);
    const source = loopSource;
    loopSource = null;
    window.setTimeout(() => source?.stop(), 900);
  }

  function render() {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Turn the shore sound off" : "Turn the shore sound on");
    button.classList.toggle("is-on", on);
  }

  button.addEventListener("click", () => {
    on = !on;
    render();
    if (on) start();
    else stop();
  });

  document.addEventListener("visibilitychange", () => {
    if (!context || !on) return;
    if (document.hidden) context.suspend();
    else context.resume();
  });

  // fetch the cue as the pointer (or a finger, or focus) reaches a walker
  const prefetch = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("[data-shore-gem]")) {
      stepBuffer ??= load(button.dataset.step!);
    }
  };
  document.addEventListener("pointerover", prefetch, { passive: true });
  document.addEventListener("focusin", prefetch);

  // stepping through a walker into the other painting
  document.addEventListener("shore:step", async () => {
    const ctx = audio();
    stepBuffer ??= load(button.dataset.step!);
    await ctx.resume();
    const buffer = await stepBuffer;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    // a soft onset: no sharp attack on the first sparkle
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(STEP_LEVEL, ctx.currentTime + 0.06);
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);

    if (master && loopSource) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(DUCK_LEVEL, now + 0.25);
      master.gain.setValueAtTime(DUCK_LEVEL, now + buffer.duration - 0.6);
      master.gain.linearRampToValueAtTime(LOOP_LEVEL, now + buffer.duration + 1.2);
    }
    source.start();
  });

  render();
}
