# Patchform

Playable analog-style synthesizer in the browser.

**Live:** after deploy, open the Vercel production URL, tap **Enable audio**, and play.

## Play

- On-screen keys (light up when held)
- Computer keys: **Z–M** and **Q–P**, **[ ]** octave, **space** silence
- **Web MIDI** in/out — USB controllers, velocity, sustain, pitch bend, CCs
- Waveforms, filter, ADSR, detune / osc 2 / sub / noise
- Volume next to the scope
- Describe an instrument to craft a patch (needs `XAI_API_KEY` on the server)

Chrome, Edge, or Firefox. Safari does not expose Web MIDI.

## Local

```bash
npm install
npm run dev
```

Audio starts only after a user gesture. MIDI needs a secure origin (https or localhost).
