let CONFIG = {
  title: "",
  message: "",
  password: "",
  photos: []
};

let score = 0;
const targetScore = 10;
let sliderInterval = null;

// Safe Uint8Array to Base64 (prevents call stack overflow on large buffers)
function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Safe Base64 to Uint8Array
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// UTF-8 string encoding / decoding for JSON payloads
function stringToUint8(str) {
  return new TextEncoder().encode(str);
}

function uint8ToString(bytes) {
  return new TextDecoder().decode(bytes);
}

// Web Crypto Key Derivation (PBKDF2)
async function deriveKey(password, salt, usage) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

// Encrypt string with AES-GCM
async function encryptPayload(text, password) {
  const data = stringToUint8(text);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, "encrypt");

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);

  return bufferToBase64(combined.buffer);
}

// Decrypt string with AES-GCM
async function decryptPayload(base64Data, password) {
  const data = base64ToBuffer(base64Data);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encryptedBytes = data.slice(28);

  const key = await deriveKey(password, salt, "decrypt");
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedBytes
  );

  return uint8ToString(new Uint8Array(decryptedBuffer));
}

// Compress images to tight WebP dimensions to allow fitting in URL hash
function compressImage(file, maxWidth = 380, quality = 0.55) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Read hash payload or query param 'd'
  const rawHash = window.location.hash ? window.location.hash.substring(1) : "";
  const urlParams = new URLSearchParams(window.location.search);
  const dataParam = rawHash || urlParams.get("d");

  if (dataParam) {
    document.getElementById("creatorScreen").classList.add("hidden");

    try {
      const jsonString = uint8ToString(base64ToBuffer(decodeURIComponent(dataParam)));
      CONFIG = JSON.parse(jsonString);

      if (!CONFIG.title || !CONFIG.password) {
        throw new Error("Missing config values");
      }

      document.getElementById("gateScreen").classList.remove("hidden");
      setupGate();
    } catch (error) {
      console.error("Link Data Error", error);
      document.body.innerHTML = `
        <div style="display: flex; height: 100vh; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; padding: 20px;">
          <h2>This link seems broken — please ask for a new one</h2>
        </div>
      `;
    }
  } else {
    setupCreator();
  }
});

function setupCreator() {
  const form = document.getElementById("creatorForm");
  const generateBtn = document.getElementById("generateBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = document.getElementById("photoFiles").files;
    const password = document.getElementById("passwordInput").value.trim();

    if (files.length < 3) {
      alert("Please select 3 photos.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerText = "Encrypting photos...";

    try {
      const encryptedPhotos = [];
      for (let i = 0; i < 3; i++) {
        const compressed = await compressImage(files[i]);
        const encrypted = await encryptPayload(compressed, password);
        encryptedPhotos.push(encrypted);
      }

      const data = {
        title: document.getElementById("titleInput").value.trim(),
        message: document.getElementById("messageInput").value.trim(),
        password: password,
        photos: encryptedPhotos
      };

      const jsonStr = JSON.stringify(data);
      const base64Data = bufferToBase64(stringToUint8(jsonStr).buffer);
      const finalUrl = window.location.origin + window.location.pathname + "#" + encodeURIComponent(base64Data);

      document.getElementById("generatedUrl").value = finalUrl;
      document.getElementById("linkResult").classList.remove("hidden");
    } catch (err) {
      alert("Encryption error: " + err.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerText = "Create Surprise Link";
    }
  });

  document.getElementById("copyBtn").addEventListener("click", () => {
    const copyInput = document.getElementById("generatedUrl");
    copyInput.select();
    navigator.clipboard.writeText(copyInput.value);
    document.getElementById("copyBtn").innerText = "Copied!";
    setTimeout(() => {
      document.getElementById("copyBtn").innerText = "Copy Link";
    }, 2000);
  });
}

function setupGate() {
  const unlockBtn = document.getElementById("unlockBtn");
  const passInput = document.getElementById("unlockPasscode");
  const gateError = document.getElementById("gateError");

  const verifyPasscode = async () => {
    if (passInput.value.trim() === CONFIG.password) {
      document.getElementById("gateScreen").classList.add("hidden");
      await startCelebration();
    } else {
      gateError.classList.remove("hidden");
    }
  };

  unlockBtn.addEventListener("click", verifyPasscode);
  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verifyPasscode();
  });
}

async function startCelebration() {
  document.title = CONFIG.title;
  document.getElementById("celebrationTitle").innerText = CONFIG.title;
  document.getElementById("displayMessage").innerText = CONFIG.message;
  document.getElementById("celebrationScreen").classList.remove("hidden");

  // Decrypt photos directly in memory
  const slideIds = ["slide1", "slide2", "slide3"];
  for (let i = 0; i < slideIds.length; i++) {
    try {
      const dataUrl = await decryptPayload(CONFIG.photos[i], CONFIG.password);
      document.getElementById(slideIds[i]).src = dataUrl;
    } catch (err) {
      console.error(`Decryption failed for photo ${i + 1}:`, err);
    }
  }

  initSlider();
  initGame();
}

function initSlider() {
  const slides = document.querySelectorAll(".slide");
  let currentSlide = 0;

  if (sliderInterval) clearInterval(sliderInterval);

  sliderInterval = setInterval(() => {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
  }, 3000);
}

function initGame() {
  const target = document.getElementById("target");
  const gameArea = document.getElementById("gameArea");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const winOverlay = document.getElementById("winOverlay");
  const closeOverlayBtn = document.getElementById("closeOverlayBtn");

  function moveTarget() {
    const maxX = gameArea.clientWidth - 50;
    const maxY = gameArea.clientHeight - 50;

    const randX = Math.floor(Math.random() * maxX) + 25;
    const randY = Math.floor(Math.random() * maxY) + 25;

    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
  }

  function hit() {
    score++;
    scoreDisplay.innerText = score;

    if (score >= targetScore) {
      target.style.display = "none";
      winOverlay.classList.remove("hidden");
    } else {
      moveTarget();
    }
  }

  // Pointerdown handles both touch and click once without double firing
  target.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    hit();
  });

  closeOverlayBtn.addEventListener("click", () => {
    winOverlay.classList.add("hidden");
  });

  moveTarget();
}
