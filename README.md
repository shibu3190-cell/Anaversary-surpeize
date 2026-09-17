# A Surprise For You

A single-page celebration link creator. Fill in a form once, get one
short link back. Opening it shows a passcode gate, then a photo slider,
your message, and a small "catch the heart" game that unlocks a final
note at 10 points.

## Use it

1. Open `index.html` (locally, or on the deployed URL).
2. Fill in the occasion, an optional message, a passcode, and pick 3 photos.
3. Click **Create the Link** — it saves and copies the link automatically.
4. Send that link.

## How it works (Firestore backend, no server code)

Title, message, passcode, and the 3 photos (auto-compressed in-browser)
are saved as one document in Firestore. The link only carries that
document's ID (`?id=xk29fQ`) — nothing is encoded into the URL itself.
This is what keeps the link short regardless of photo size or count.

There's no server you run or maintain — the browser talks to Firestore
directly via the Firebase JS SDK, and the site itself is still just
static files (deployable to GitHub Pages, same as any static site).

**Setup required before this works:** `index.html` needs a real Firebase
project's config and that project needs Firestore enabled with security
rules published. See `FIRESTORE_SETUP.md` for the exact steps. Without
that, generating a link fails with a permissions error.

## What changed across this build

- **Fixed:** a bad or corrupted photo file used to leave the "Processing
  photos..." button stuck forever with no explanation. It now shows a
  clear error and re-enables the button.
- **Fixed:** an early version embedded photos directly in the URL as
  base64, which made links very long. Switched to Firestore + a short
  `?id=` link instead — this also meant photo quality could be raised
  (800px/0.72 vs the original 480px/0.6) since the URL-length constraint
  that was forcing aggressive compression is gone.
- (For context: the single-event `onpointerdown` game handler — which
  correctly avoids double-counting taps on touch devices — was already
  done right by the time this redesign started. An earlier prototype had
  that bug; this codebase didn't.)
- **Redesigned:** romantic visual language (deep rose/wine palette,
  Playfair Display + Nunito), a proper passcode-gate → celebration reveal
  transition, ambient floating hearts, a confetti burst on winning the
  game, a replay option, and photo preview thumbnails before submitting.
- Tested with 21 automated logic tests against a mocked Firestore (see
  "Testing" below) — all passing.

## Deploying (git + GitHub Pages)

```bash
git init
git add .
git commit -m "Surprise site with Firestore backend"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Then: repo **Settings → Pages → Source: `main` branch** → Save. Firestore
works from a GitHub Pages-hosted site with no extra setup — it's just an
API call from the browser to Google's servers, not tied to where the
static files are hosted.

## Testing

Tested with an automated suite (Node + jsdom + a mocked Firestore, since
this environment can't reach `firestore.googleapis.com` to test a real
project) covering: form submission → save → short link generation,
fetching the right document by ID, correct/wrong passcode handling, the
game's scoring and win state, slider navigation, bad-photo-file error
handling, a nonexistent link ID showing a friendly error, and a
simulated Firestore write rejection (e.g. from misconfigured rules)
failing cleanly instead of hanging — 21/21 passing.

**Not covered by automated testing, because they need things this
environment doesn't have access to:**
- A real Firebase project (the test suite mocks Firestore's behavior —
  it proves the code *calls* the SDK correctly, not that your specific
  project/rules will actually accept the write. Test against your real
  project before sending a real link.)
- Actual visual rendering, animation smoothness, and real in-browser
  photo-compression quality — these need a real browser.

Recommend: generate one real test link against your live Firebase
project, open it on both desktop and a phone, confirm the passcode gate,
photos, message, and game all work end to end — before sending the real
one.
