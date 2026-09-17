# Configuring Firebase (fixes the "link is too big" problem)

Two files changed: **`index.html`** and **`script.js`**. Both are already
updated in this folder — replace your existing copies with these. `style.css`
is unchanged.

What changed, in one sentence: photos used to be base64-encoded directly
into the URL (long link); now they're saved to Firestore and the link
just carries a short document ID (`?id=xK29fQ`).

## Steps

**1. Create the Firebase project**
console.firebase.google.com → "Add project" → name it → skip Google
Analytics → Create.

**2. Enable Firestore**
Left sidebar → Build → Firestore Database → Create database → pick a
region → **production mode** (not test mode — test mode's rules
auto-expire in 30 days).

**3. Set security rules**
Firestore → Rules tab → replace everything with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /surprises/{docId} {
      allow create: if request.resource.data.keys().hasAll(['title','password','photos','createdAt'])
                     && request.resource.data.title is string
                     && request.resource.data.title.size() < 200;
      allow get: if true;
      allow list, update, delete: if false;
    }
  }
}
```
`allow list: if false` matters — without it, anyone could enumerate every
saved surprise, not just the one they have a link for. `allow get: if
true` means anyone who already has a specific link's ID can open it —
same trust model as before, nothing new to secure here.

Click **Publish**.

**4. Register a web app to get your config values**
Project Overview → gear icon → Project settings → scroll to "Your apps" →
click the `</>` icon → register (no hosting checkbox needed) → copy the
`firebaseConfig` object it shows you.

**5. Your config is already in `index.html`** ✅
Your real project values (`surprise-23c4a`) are already pasted into the
`firebaseConfig` block — nothing to do here unless you create a
*different* Firebase project later.

**Status check: have you done step 3 (publish the security rules) yet?**
Steps 1, 4, and 5 are done (your project exists, you registered a web
app, the config is in the file). Step 3 is the one that determines
whether "Create the Link" actually works or fails with a permissions
error — confirm the Rules tab shows the rules above and that you clicked
**Publish**, not just typed them in.

**6. Test locally**
```bash
npx serve .
```
Open it, create a surprise, confirm the generated link is short
(`?id=...`, not a huge `#...` blob), open that link in a new tab, confirm
it loads and unlocks correctly.

**7. Deploy (same as before — still git + GitHub Pages, no Firebase
Hosting needed)**
```bash
git add .
git commit -m "Switch to Firestore for storage, shorter links"
git push
```
Firestore works fine from a site hosted anywhere (GitHub Pages included)
— it's just an API call from the browser, not tied to Firebase Hosting.

## One thing to know
Old links you may have already sent (the long `#...` ones) will stop
working after this change — the code no longer reads that format. If you
haven't sent a real link yet, this doesn't matter. If you have, regenerate
and resend it after deploying.

