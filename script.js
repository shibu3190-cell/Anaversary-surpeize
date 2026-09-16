let CONFIG = {
  title: "",
  message: "",
  password: "",
  photos: []
};

let score = 0;
const targetScore = 10;
let sliderInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  // Read payload from hash or query string
  const rawHash = window.location.hash ? window.location.hash.substring(1) : "";
  const urlParams = new URLSearchParams(window.location.search);
  const dataParam = rawHash || urlParams.get("d");

  if (dataParam) {
    document.getElementById("creatorScreen").classList.add("hidden");

    try {
      const jsonString = decodeURIComponent(escape(atob(decodeURIComponent(dataParam))));
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

// Crypto Key Derivation (PBKDF2)
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

// Compress image on the fly to keep URL size compact
function compressImage(file, maxWidth = 500, quality = 0.7) {
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

        // Convert to compact WebP base64
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Encrypt string data to base64
async function encryptPayload(text, password) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
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

  let binary = "";
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

// Decrypt base64 string
async function decryptPayload(base64Data, password) {
  const binary = atob(base64Data);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i);
  }

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encryptedBytes = data.slice(28);

  const key = await deriveKey(password, salt, "decrypt");
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// Creator Form Flow
function setupCreator() {
  const form = document.getElementById("creatorForm");
  const generateBtn = document.getElementById("generateBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = document.getElementById("photoFiles").files;
    const password = document.getElementById("passwordInput").value.trim();

    if (files.length < 3) {
      alert("Please select at least 3 photos.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerText = "Compressing & Encrypting...";

    // 1. Compress and encrypt photos
    const encryptedPhotos = [];
    for (let i = 0; i < 3; i++) {
      const compressedDataUrl = await compressImage(files[i]);
      const encryptedBlob = await encryptPayload(compressedDataUrl, password);
      encryptedPhotos.push(encryptedBlob);
    }

    // 2. Build URL with state payload
    const data = {
      title: document.getElementById("titleInput").value.trim(),
      message: document.getElementById("messageInput").value.trim(),
      password: password,
      photos: encryptedPhotos
    };

    const base64String = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const finalUrl = window.location.origin + window.location.pathname + "#" + encodeURIComponent(base64String);

    document.getElementById("generatedUrl").value = finalUrl;
    document.getElementById("linkResult").classList.remove("hidden");
    generateBtn.disabled = false;
    generateBtn.innerText = "Create Surprise Link";
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

// Gate Flow
function setupGate() {
  const unlockBtn = document.getElementById("unlockBtn");
  const passInput = document.getElementById("unlockPasscode");
  const gateError = document.getElementById("gateError");

  const verifyPasscode = () => {
    if (passInput.value.trim() === CONFIG.password) {
      document.getElementById("gateScreen").classList.add("hidden");
      startCelebration();
    } else {
      gateError.classList.remove("hidden");
    }
  };

  unlockBtn.addEventListener("click", verifyPasscode);
  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verifyPasscode();
  });
}

// Celebration Flow
async function startCelebration() {
  document.title = CONFIG.title;
  document.getElementById("celebrationTitle").innerText = CONFIG.title;
  document.getElementById("displayMessage").innerText = CONFIG.message;
  document.getElementById("celebrationScreen").classList.remove("hidden");

  // Decrypt photos straight from memory
  const slideIds = ["slide1", "slide2", "slide3"];
  for (let i = 0; i < slideIds.length; i++) {
    try {
      const dataUrl = await decryptPayload(CONFIG.photos[i], CONFIG.password);
      document.getElementById(slideIds[i]).src = dataUrl;
    } catch (err) {
      console.error(`Failed to decrypt photo ${i + 1}:`, err);
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

  target.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    hit();
  });

  closeOverlayBtn.addEventListener("click", () => {
    winOverlay.classList.add("hidden");
  });

  moveTarget();
}
