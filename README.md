# A Surprise For You

A single-page, no-backend celebration link creator. Fill in a form once,
get one link back with everything — title, message, passcode, and 3
photos — embedded in it. No server, no database, no signup.

## Use it

1. Open `index.html` (locally, or on the deployed URL).
2. Fill in the occasion, an optional message, a passcode, and pick 3 photos.
3. Click **Create the Link** — it's generated and copied automatically.
4. Send that link. Opening it shows a passcode gate, then the
   photo slider, your message, and a small "catch the heart" game that
   unlocks a final note at 10 points.

## How it actually works (no backend)

Everything — title, message, passcode, and the 3 photos (auto-compressed
in-browser) — is base64-encoded into the URL's `#` fragment. Nothing is
sent to a server, nothing is stored anywhere, which is also why the link
is the *only* copy: closing it without saving the link loses it.

**One real limitation to know about:** because real photos are embedded
directly in the link, the link can get long — sometimes several thousand
characters. Modern browsers and apps (WhatsApp, iMessage) handle this
fine. If you see the size warning after generating a link, prefer
smaller/simpler photos, or fewer very-high-resolution ones.

## What changed from the previous version

- **Fixed:** a bad or corrupted photo file used to leave the "Processing
  photos..." button stuck forever with no explanation. It now shows a
  clear error and re-enables the button.
- **Fixed:** a legacy-link edge case where an already-decoded query-string
  link could be decoded a second time and corrupted.
- (For context: the single-event `onpointerdown` game handler — which
  correctly avoids double-counting taps on touch devices — was already
  done right in this version. An earlier prototype had that bug; this one
  didn't.)
- **Redesigned:** new romantic visual language (deep rose/wine palette,
  Playfair Display + Nunito), a proper passcode-gate → celebration reveal
  transition, ambient floating hearts, a confetti burst on winning the
  game, a replay option, photo preview thumbnails before submitting, and
  a live link-length warning.
- Tested with 31 automated logic tests covering the full flow (see
  "Testing" below) — all passing.

## Deploying (git + GitHub Pages, no backend needed)

```bash
git init
git add .
git commit -m "Redesigned surprise site"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Then: repo **Settings → Pages → Source: `main` branch** → Save. GitHub
gives you a live URL a minute or two later.

## Testing

This was tested with an automated logic suite (`test.js`, using Node +
jsdom) covering: link generation and round-trip, passcode gate
(right/wrong), the game's scoring and win state, slider navigation, error
handling for bad photo files, and both new (`#`) and legacy (`?d=`) link
formats — 31/31 passing. That suite isn't included in this folder since
it's a development tool, not part of the site; ask if you'd like it.

**Not covered by automated testing:** actual visual rendering and the
real in-browser photo-compression quality — those need a real browser.
Recommend opening it locally once on both desktop and a phone before
sending a real link.
