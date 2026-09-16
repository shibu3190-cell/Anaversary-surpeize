# Interactive Celebration & Surprise

A fully static, zero-backend interactive celebration site deployed via GitHub Pages.

## Features
- **Client-Side Generation:** Create custom surprise cards directly from the browser without an external server or database.
- **Client-Side Encryption:** Compresses and encrypts photos on the fly using native Web Crypto (AES-GCM 256-bit). Photos are stored directly inside the URL hash.
- **Passcode Protected:** Only recipients with the correct secret passcode can decrypt and view the surprise message and memories.
- **Interactive Mini-Game:** Catch-the-hearts game that reveals the final celebration screen once a score of 10 is reached.

## How to Use
1. Open the live GitHub Pages link.
2. Fill in the occasion title, your custom message, and choose a secret passcode.
3. Select 3 photos from your device.
4. Tap **Create Surprise Link** to generate the encrypted URL.
5. Send the generated link and passcode to the recipient.
