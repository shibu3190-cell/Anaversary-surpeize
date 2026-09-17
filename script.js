let CONFIG = {
  title: "",
  message: "",
  customGreeting: "",
  bgImage: null,
  password: "",
  photos: [],
  expiresAt: null,
  maxClicks: 10,
  clickCount: 0
};

let score = 0;
const targetScore = 5; // Updated: exactly 5 times to catch heart
let sliderInterval = null;
let heartsTimer = null;
let targetDriftTimer = null;

/* ---------------- Image compression (robust across iOS & desktop) ---------------- */
async function resizeImage(file, maxWidth = 800, quality = 0.70) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that photo. Please try a different file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.onload = () => {
        try {
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

          let result = canvas.toDataURL("image/jpeg", quality);
          // If still large, scale down further to guarantee safety inside document limits
          if (result.length > 200000) {
            const smallerCanvas = document.createElement("canvas");
            smallerCanvas.width = Math.round(width * 0.7);
            smallerCanvas.height = Math.round(height * 0.7);
            const sCtx = smallerCanvas.getContext("2d");
            sCtx.drawImage(img, 0, 0, smallerCanvas.width, smallerCanvas.height);
            result = smallerCanvas.toDataURL("image/jpeg", 0.60);
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function notifyUser(msg) {
  const warningEl = document.getElementById("sizeWarning");
  if (warningEl) {
    warningEl.textContent = msg;
    warningEl.classList.remove("hidden");
  }
  try {
    alert(msg);
  } catch (e) {
    console.warn("Alert blocked:", msg);
  }
}

/* ---------------- Boot: figure out which screen to show ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.__firebasePromise) {
    try {
      await window.__firebasePromise;
    } catch (e) {
      console.warn("Firebase promise wait error:", e);
    }
  }

  const id = new URLSearchParams(window.location.search).get("id");

  if (id) {
    document.getElementById("creatorScreen").classList.add("hidden");
    try {
      let loaded = false;
      if (window.__fs && window.__db) {
        try {
          const { doc, getDoc, updateDoc, increment } = window.__fs;
          const docRef = doc(window.__db, "surprises", id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            CONFIG = snap.data();
            loaded = true;

            // Check link expiration: 12 hours limit
            const now = Date.now();
            if (CONFIG.expiresAt && now > CONFIG.expiresAt) {
              throw new Error("This surprise link has expired (12 hours limit reached).");
            }

            // Check click limit: 10 views maximum
            const currentClicks = (CONFIG.clickCount || 0) + 1;
            const maxClicks = typeof CONFIG.maxClicks === "number" ? CONFIG.maxClicks : 10;
            if (currentClicks > maxClicks) {
              throw new Error("This surprise link has reached its maximum view limit (10 clicks).");
            }

            // Record click counter asynchronously in Firestore
            try {
              if (updateDoc && increment) {
                updateDoc(docRef, { clickCount: increment(1) }).catch(() => {});
              }
            } catch (err) {
              console.warn("Could not increment clickCount:", err);
            }
          }
        } catch (fsErr) {
          if (fsErr.message && (fsErr.message.includes("expired") || fsErr.message.includes("maximum view limit"))) {
            throw fsErr;
          }
          console.warn("Firestore fetch error, attempting server fallback:", fsErr);
        }
      }

      if (!loaded) {
        const res = await fetch('/api/surprises/' + encodeURIComponent(id));
        if (res.ok) {
          CONFIG = await res.json();
          loaded = true;
        } else if (res.status === 410) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "This surprise link has expired.");
        }
      }

      if (!loaded || !CONFIG.title || !CONFIG.password) {
        throw new Error("No surprise found or this link has expired.");
      }

      document.getElementById("gateScreen").classList.remove("hidden");
      setupGate();
    } catch (error) {
      console.error("Link Data Error", error);
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;min-height:100vh;justify-content:center;align-items:center;text-align:center;font-family:sans-serif;padding:24px;background:#fff5f7;">
          <div style="font-size:42px;margin-bottom:12px;">⏳</div>
          <h2 style="color:#7a2142;margin:0 0 10px;font-family:Playfair Display, serif;">Link No Longer Available</h2>
          <p style="color:#664052;max-width:320px;line-height:1.5;margin-bottom:20px;">
            ${error.message || "This link seems broken or reached its 12-hour / 10-clicks privacy limit."}
          </p>
          <a href="${window.location.pathname}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#7a2142;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Create a New Surprise</a>
        </div>
      `;
    }
  } else {
    setupCreator();
  }
});

/* ---------------- Screen 1: Creator ---------------- */
function setupCreator() {
  const form = document.getElementById("creatorForm");
  const generateBtn = document.getElementById("generateBtn");
  const fileInput = document.getElementById("photoFiles");
  const bgFileInput = document.getElementById("bgFileInput");
  const preview = document.getElementById("photoPreview");
  const bgPreview = document.getElementById("bgPreview");
  const statusBadge = document.getElementById("cloudStatusBadge");
  const statusText = document.getElementById("cloudStatusText");
  const statusDot = statusBadge ? statusBadge.querySelector(".cloud-dot") : null;

  // Clean, unified status display: "Online"
  const updateCloudStatus = () => {
    if (!statusText || !statusDot) return;
    statusDot.className = "cloud-dot connected";
    statusText.textContent = "Online";
  };

  updateCloudStatus();
  window.addEventListener("firebase-ready", updateCloudStatus);
  if (window.__auth && window.__authModule) {
    try {
      window.__authModule.onAuthStateChanged(window.__auth, updateCloudStatus);
    } catch (e) {
      console.warn("Auth state watch:", e);
    }
  }

  // Instant local thumbnail preview for photos
  fileInput.addEventListener("change", (e) => {
    preview.innerHTML = "";
    Array.from(e.target.files).slice(0, 3).forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      preview.appendChild(img);
    });
  });

  // Preview for optional background image
  if (bgFileInput && bgPreview) {
    bgFileInput.addEventListener("change", (e) => {
      bgPreview.innerHTML = "";
      const file = e.target.files && e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const img = document.createElement("img");
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
        bgPreview.appendChild(img);
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = fileInput.files;
    const password = document.getElementById("passwordInput").value.trim();

    if (files.length < 1) {
      notifyUser("Please select at least 1 photo (up to 3 photos).");
      return;
    }
    if (!password) {
      notifyUser("Please set a passcode.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerText = "Processing photos...";

    try {
      const photos = [];
      const count = Math.min(files.length, 3);
      for (let i = 0; i < count; i++) {
        const compressed = await resizeImage(files[i]);
        photos.push(compressed);
      }

      // If user uploaded 1 or 2, duplicate for a smooth 3-slide visual carousel
      while (photos.length < 3) {
        photos.push(photos[0]);
      }

      // Process optional background image for game completion
      let bgImage = null;
      if (bgFileInput && bgFileInput.files && bgFileInput.files[0]) {
        generateBtn.innerText = "Processing background...";
        bgImage = await resizeImage(bgFileInput.files[0], 900, 0.65);
      }

      const customGreeting = (document.getElementById("customGreetingInput")?.value || "").trim();
      const now = Date.now();

      const data = {
        title: document.getElementById("titleInput").value.trim(),
        message: document.getElementById("messageInput").value.trim(),
        customGreeting: customGreeting || "Every one of those hearts is really just... me, thinking about you.",
        bgImage: bgImage || null,
        password: password,
        photos: photos,
        createdAt: now,
        expiresAt: now + (12 * 60 * 60 * 1000), // Valid for 12 hours
        maxClicks: 10,                         // Valid for 10 clicks maximum
        clickCount: 0,
        creatorUid: (window.__auth && window.__auth.currentUser) ? window.__auth.currentUser.uid : null
      };

      // Check approx payload size
      const approxSize = JSON.stringify(data).length;
      if (approxSize > 920000) {
        throw new Error("Photos are slightly too large for cloud storage — please choose smaller files.");
      }

      generateBtn.innerText = "Saving...";

      let savedId = null;
      if (window.__fs && window.__db) {
        try {
          const { collection, addDoc } = window.__fs;
          const ref = await addDoc(collection(window.__db, "surprises"), data);
          if (ref && ref.id) {
            savedId = ref.id;
          }
        } catch (fsErr) {
          console.warn("Firestore save failed, falling back to local server storage:", fsErr);
        }
      }

      if (!savedId) {
        const res = await fetch('/api/surprises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          throw new Error("Could not save surprise. Please check your connection and try again.");
        }
        const json = await res.json();
        savedId = json.id;
      }

      const finalUrl = window.location.origin + window.location.pathname + "?id=" + savedId;

      const urlBox = document.getElementById("generatedUrl");
      urlBox.value = finalUrl;
      document.getElementById("linkResult").classList.remove("hidden");
      urlBox.select();
      if (navigator.clipboard) navigator.clipboard.writeText(finalUrl).catch(() => {});
      document.getElementById("sizeWarning").classList.add("hidden");

      const openPreviewBtn = document.getElementById("openPreviewBtn");
      if (openPreviewBtn) {
        openPreviewBtn.onclick = () => window.open(finalUrl, "_blank");
      }
    } catch (err) {
      notifyUser("Error: " + err.message);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerText = "Create the Link";
    }
  });

  document.getElementById("copyBtn").addEventListener("click", () => {
    const copyInput = document.getElementById("generatedUrl");
    copyInput.select();
    if (navigator.clipboard) navigator.clipboard.writeText(copyInput.value).catch(() => {});
    const btn = document.getElementById("copyBtn");
    btn.innerText = "Copied!";
    setTimeout(() => { btn.innerText = "Copy Again"; }, 2000);
  });
}

/* ---------------- Screen 2: Passcode gate ---------------- */
function setupGate() {
  const unlockBtn = document.getElementById("unlockBtn");
  const passInput = document.getElementById("unlockPasscode");
  const gateError = document.getElementById("gateError");
  const gateCard = document.querySelector("#gateScreen .gate-card");
  const gateScreen = document.getElementById("gateScreen");

  const verifyPasscode = () => {
    if (passInput.value.trim() === CONFIG.password) {
      gateError.classList.add("hidden");
      burstHearts(16);
      gateCard.classList.add("leaving");
      setTimeout(() => {
        gateScreen.classList.add("hidden");
        gateCard.classList.remove("leaving");
        startCelebration();
      }, 380);
    } else {
      gateError.classList.remove("hidden");
      gateCard.classList.add("shake");
      setTimeout(() => gateCard.classList.remove("shake"), 350);
    }
  };

  unlockBtn.addEventListener("click", verifyPasscode);
  passInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verifyPasscode();
  });
}

/* ---------------- Screen 3: Celebration ---------------- */
function startCelebration() {
  document.title = CONFIG.title || "A Surprise For You";
  document.getElementById("celebrationTitle").innerText = CONFIG.title;

  const msgCard = document.getElementById("messageCard");
  if (CONFIG.message && CONFIG.message.trim()) {
    document.getElementById("displayMessage").innerText = CONFIG.message;
    msgCard.classList.remove("hidden");
  } else {
    msgCard.classList.add("hidden");
  }

  const celebScreen = document.getElementById("celebrationScreen");
  celebScreen.classList.remove("hidden");
  requestAnimationFrame(() => celebScreen.classList.add("revealing"));

  if (CONFIG.photos && CONFIG.photos.length >= 3) {
    document.getElementById("slide1").src = CONFIG.photos[0];
    document.getElementById("slide2").src = CONFIG.photos[1];
    document.getElementById("slide3").src = CONFIG.photos[2];
  }

  // Setup "Create Another" flow button
  const createAnotherBtn = document.getElementById("createAnotherBtn");
  if (createAnotherBtn) {
    createAnotherBtn.onclick = () => {
      window.location.href = window.location.pathname;
    };
  }

  initSlider();
  startAmbientHearts();

  // Wait for layout so the game area has real dimensions before placing the target.
  requestAnimationFrame(() => initGame());
}

function initSlider() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = Array.from(document.querySelectorAll(".slider-dots .dot"));
  let currentSlide = 0;

  function show(idx) {
    slides[currentSlide] && slides[currentSlide].classList.remove("active");
    dots[currentSlide] && dots[currentSlide].classList.remove("active");
    currentSlide = idx;
    slides[currentSlide] && slides[currentSlide].classList.add("active");
    dots[currentSlide] && dots[currentSlide].classList.add("active");
  }

  function resetTimer() {
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(() => show((currentSlide + 1) % slides.length), 3500);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => { show(i); resetTimer(); });
    dot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(i); resetTimer(); }
    });
  });

  resetTimer();
}

/* ---------------- Mini game (Gentle Drifting, 5 Hearts Target) ---------------- */
function initGame() {
  const target = document.getElementById("target");
  const gameArea = document.getElementById("gameArea");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const winOverlay = document.getElementById("winOverlay");
  const closeOverlayBtn = document.getElementById("closeOverlayBtn");
  const replayBtn = document.getElementById("replayBtn");
  const winGreetingText = document.getElementById("winGreetingText");
  const winBgBackdrop = document.getElementById("winBgBackdrop");
  const winCreateBtn = document.getElementById("winCreateBtn");

  score = 0;
  scoreDisplay.innerText = "0";
  target.style.display = "flex";

  if (targetDriftTimer) {
    clearInterval(targetDriftTimer);
    targetDriftTimer = null;
  }

  function moveTarget() {
    const areaW = gameArea.clientWidth || 300;
    const areaH = gameArea.clientHeight || 230;
    const maxX = Math.max(areaW - 60, 30);
    const maxY = Math.max(areaH - 60, 30);
    const randX = Math.floor(Math.random() * maxX) + 15;
    const randY = Math.floor(Math.random() * maxY) + 15;
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
  }

  // Gentle subtle continuous drift every 1.8 seconds so touches can miss if not timed well, but not frustratingly fast
  targetDriftTimer = setInterval(() => {
    if (score < targetScore) {
      const areaW = gameArea.clientWidth || 300;
      const areaH = gameArea.clientHeight || 230;
      const currentX = parseFloat(target.style.left) || 40;
      const currentY = parseFloat(target.style.top) || 40;
      // Gentle shift of 25-50px in random direction
      const deltaX = (Math.random() * 60 - 30);
      const deltaY = (Math.random() * 50 - 25);
      const newX = Math.min(Math.max(currentX + deltaX, 15), Math.max(areaW - 60, 20));
      const newY = Math.min(Math.max(currentY + deltaY, 15), Math.max(areaH - 60, 20));
      target.style.left = `${newX}px`;
      target.style.top = `${newY}px`;
    }
  }, 1800);

  function hit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    score++;
    scoreDisplay.innerText = String(score);
    showScorePop(parseFloat(target.style.left) || 0, parseFloat(target.style.top) || 0, gameArea);

    if (score >= targetScore) {
      if (targetDriftTimer) {
        clearInterval(targetDriftTimer);
        targetDriftTimer = null;
      }
      target.style.display = "none";

      // Configure customized greeting or fallback
      const greeting = CONFIG.customGreeting || "Every one of those hearts is really just... me, thinking about you.";
      if (winGreetingText) {
        winGreetingText.innerText = greeting;
      }

      // Configure customized background image if provided
      if (winBgBackdrop) {
        if (CONFIG.bgImage) {
          winBgBackdrop.style.backgroundImage = `url("${CONFIG.bgImage}")`;
          winBgBackdrop.classList.add("has-bg");
        } else {
          winBgBackdrop.style.backgroundImage = "none";
          winBgBackdrop.classList.remove("has-bg");
        }
      }

      launchConfetti();
      burstHearts(12);
      winOverlay.classList.remove("hidden");
    } else {
      moveTarget();
    }
  }

  target.onpointerdown = hit;

  closeOverlayBtn.onclick = () => winOverlay.classList.add("hidden");
  replayBtn.onclick = () => {
    winOverlay.classList.add("hidden");
    initGame();
  };

  if (winCreateBtn) {
    winCreateBtn.onclick = () => {
      window.location.href = window.location.pathname;
    };
  }

  moveTarget();
}

function showScorePop(x, y, container) {
  const pop = document.createElement("div");
  pop.className = "score-pop";
  pop.textContent = "+1";
  pop.style.left = x + "px";
  pop.style.top = y + "px";
  container.appendChild(pop);
  setTimeout(() => pop.remove(), 650);
}

/* ---------------- Ambient hearts + confetti ---------------- */
function spawnHeart(container) {
  const heart = document.createElement("span");
  heart.textContent = Math.random() > 0.5 ? "♥" : "💗";
  heart.style.left = Math.random() * 100 + "vw";
  heart.style.fontSize = (14 + Math.random() * 14) + "px";
  heart.style.animationDuration = (6 + Math.random() * 5) + "s";
  heart.style.setProperty("--drift", (Math.random() * 60 - 30) + "px");
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 11000);
}

function startAmbientHearts() {
  const layer = document.getElementById("floatingHearts");
  if (!layer) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (heartsTimer) return;
  heartsTimer = setInterval(() => spawnHeart(layer), 1600);
}

function burstHearts(count) {
  const layer = document.getElementById("floatingHearts");
  if (!layer) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnHeart(layer), i * 60);
  }
}

function launchConfetti() {
  const layer = document.getElementById("confettiLayer");
  if (!layer) return;
  layer.innerHTML = "";
  const colors = ["#c9557a", "#d6a75e", "#f4a6c1", "#7a2142", "#ffffff"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const size = 6 + Math.random() * 6;
    piece.style.width = size + "px";
    piece.style.height = (size * 1.6) + "px";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2.2 + Math.random() * 1.6) + "s";
    piece.style.animationDelay = (Math.random() * 0.4) + "s";
    layer.appendChild(piece);
  }
}
