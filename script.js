let CONFIG = {
  title: "",
  message: "",
  password: "",
  photos: []
};

let score = 0;
const targetScore = 10;
let sliderInterval = null;
let heartsTimer = null;

/* ---------------- Image compression (with proper error handling) ---------------- */
// BUG FIX: original version never rejected the promise on file-read or image-load
// failure, so a bad file left the "Processing photos..." button stuck forever.
function resizeImage(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that photo. Try a different file."));
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
          resolve(canvas.toDataURL("image/jpeg", quality));
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
          const { doc, getDoc } = window.__fs;
          const snap = await getDoc(doc(window.__db, "surprises", id));
          if (snap.exists()) {
            CONFIG = snap.data();
            loaded = true;
          }
        } catch (fsErr) {
          console.warn("Firestore fetch error, attempting server fallback:", fsErr);
        }
      }

      if (!loaded) {
        const res = await fetch('/api/surprises/' + encodeURIComponent(id));
        if (res.ok) {
          CONFIG = await res.json();
          loaded = true;
        }
      }

      if (!loaded || !CONFIG.title || !CONFIG.password) {
        throw new Error("No surprise found for this link.");
      }

      document.getElementById("gateScreen").classList.remove("hidden");
      setupGate();
    } catch (error) {
      console.error("Link Data Error", error);
      document.body.innerHTML = `
        <div style="display:flex;height:100vh;justify-content:center;align-items:center;text-align:center;font-family:sans-serif;padding:20px;">
          <h2>This link seems broken — please ask for a new one</h2>
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
  const preview = document.getElementById("photoPreview");

  // Instant local thumbnail preview (separate from the compression pipeline
  // used at submit time, so picking photos feels responsive).
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = fileInput.files;
    const password = document.getElementById("passwordInput").value.trim();

    if (files.length < 3) {
      notifyUser("Please select at least 3 photos.");
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
      for (let i = 0; i < 3; i++) {
        const compressed = await resizeImage(files[i]);
        photos.push(compressed);
      }

      const data = {
        title: document.getElementById("titleInput").value.trim(),
        message: document.getElementById("messageInput").value.trim(),
        password: password,
        photos: photos,
        createdAt: Date.now()
      };

      // Check approx payload size
      const approxSize = JSON.stringify(data).length;
      if (approxSize > 900000) {
        throw new Error("These photos are too large even for Firestore's 1MB limit — please choose smaller photos.");
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
      document.getElementById("sizeWarning").classList.add("hidden"); // link itself is always short now
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

/* ---------------- Mini game ---------------- */
function initGame() {
  const target = document.getElementById("target");
  const gameArea = document.getElementById("gameArea");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const winOverlay = document.getElementById("winOverlay");
  const closeOverlayBtn = document.getElementById("closeOverlayBtn");
  const replayBtn = document.getElementById("replayBtn");

  score = 0;
  scoreDisplay.innerText = "0";
  target.style.display = "block";

  function moveTarget() {
    const areaW = gameArea.clientWidth || 300;
    const areaH = gameArea.clientHeight || 220;
    const maxX = Math.max(areaW - 50, 40);
    const maxY = Math.max(areaH - 50, 40);
    const randX = Math.floor(Math.random() * maxX) + 15;
    const randY = Math.floor(Math.random() * maxY) + 15;
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
  }

  // BUG FIX (previous prototype): binding both 'touchstart' and 'click' to the
  // same handler double-counted every tap on touch devices. onpointerdown
  // fires exactly once per interaction across mouse, touch, and pen.
  function hit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    score++;
    scoreDisplay.innerText = String(score);
    showScorePop(parseFloat(target.style.left) || 0, parseFloat(target.style.top) || 0, gameArea);

    if (score >= targetScore) {
      target.style.display = "none";
      launchConfetti();
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
