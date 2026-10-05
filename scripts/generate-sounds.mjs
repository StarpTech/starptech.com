// Generate the homepage's sounds with ElevenLabs sound effects.
// Runs locally only: the key is read from .env and never ships to the site.
//
//   node scripts/generate-sounds.mjs            # every sound
//   node scripts/generate-sounds.mjs shore      # just one
//
// Output: public/sounds/<name>.mp3 (each run is a new take: listen first)

import { mkdir, readFile, writeFile } from "node:fs/promises";

const env = await readFile(new URL("../.env", import.meta.url), "utf8");
const key = env.match(/^ELEVENLABS_KEY\s*=\s*"?([^"\n]+)"?/m)?.[1]?.trim();
if (!key) throw new Error("ELEVENLABS_KEY missing in .env");

const SOUNDS = [
  // the homepage ambience, played only when the visitor opts in
  {
    name: "shore",
    loop: true,
    duration: 30,
    text: "Soft ocean surf on a quiet shore at night, slow rhythmic waves breaking far away, deep and soothing, subtle wind, no birds, no music, no voices",
  },
  // the cue for stepping through a walker into the other painting
  {
    name: "step",
    loop: false,
    duration: 2.5,
    text: "Soft cosmic sparkle, the warm bright twinkle of a distant star with a faint airy shimmer tail, dreamy, very light and gentle, no water",
  },
];

const only = process.argv[2];
const outDir = new URL("../public/sounds/", import.meta.url);
await mkdir(outDir, { recursive: true });

for (const sound of SOUNDS.filter((s) => !only || s.name === only)) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_96",
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: sound.text,
        duration_seconds: sound.duration,
        loop: sound.loop,
        prompt_influence: sound.loop ? 0.45 : 0.5,
      }),
    },
  );
  if (!response.ok) {
    console.error(`${sound.name}: ${response.status} ${await response.text()}`);
    continue;
  }
  const audio = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(`${sound.name}.mp3`, outDir), audio);
  console.log(`${sound.name}: ${(audio.length / 1024).toFixed(0)} KB`);
}
