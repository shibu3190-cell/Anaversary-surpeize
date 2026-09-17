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

/* ---------------- Romantic Web Audio Synthesizer & Sound FX Engine ---------------- */
let audioCtx = null;
let isAudioMuted = false;
let bgMusicInterval = null;
let bgMusicStep = 0;
let masterGain = null;
let isMusicPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Gentle celesta/music box chime note
function playTone(freq, duration = 0.5, type = "sine", gainLevel = 0.25, timeOffset = 0) {
  const ctx = getAudioContext();
  if (!ctx || isAudioMuted) return;

  const startTime = ctx.currentTime + timeOffset;
  const osc = ctx.createOscillator();
  const noteGain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Soft attack, gentle bell decay
  noteGain.gain.setValueAtTime(0.0001, startTime);
  noteGain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.04);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(noteGain);
  noteGain.connect(masterGain || ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// Warm chord arpeggio for opening envelope / letter
function playEnvelopeChime() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    playTone(freq, 0.6, "sine", 0.18, i * 0.07);
  });
}

// Crisp sweet pop sound when a heart is caught
function playHeartCatchSound(currentScore) {
  const scale = [440, 493.88, 554.37, 659.25, 739.99, 880]; // A4, B4, C#5, E5, F#5, A5
  const baseFreq = scale[Math.min(currentScore - 1, scale.length - 1)] || 523.25;
  playTone(baseFreq, 0.22, "sine", 0.22, 0);
  playTone(baseFreq * 1.5, 0.18, "triangle", 0.12, 0.04);
}

// Celebratory fanfare chime when all hearts are caught
function playCelebrationFanfare() {
  const melody = [
    { freq: 523.25, dur: 0.2, delay: 0 },
    { freq: 659.25, dur: 0.2, delay: 0.14 },
    { freq: 783.99, dur: 0.22, delay: 0.28 },
    { freq: 1046.50, dur: 0.6, delay: 0.44 },
    { freq: 1318.51, dur: 0.8, delay: 0.62 }
  ];
  melody.forEach(n => {
    playTone(n.freq, n.dur, "sine", 0.22, n.delay);
  });
}

// Soft looping acoustic lullaby (Canon-style romantic arpeggio progression)
function startRomanticMelody() {
  if (bgMusicInterval) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  isMusicPlaying = true;
  updateMusicToggleUI();

  // Romantic progression in C major / A minor
  // Beautiful music box / rhodes timbre
  const arpeggios = [
    [523.25, 659.25, 783.99, 1046.50], // C
    [392.00, 493.88, 587.33, 783.99],  // G
    [440.00, 523.25, 659.25, 880.00],  // Am
    [349.23, 440.00, 523.25, 698.46],  // F
    [523.25, 659.25, 783.99, 1046.50], // C
    [349.23, 440.00, 523.25, 698.46],  // F
    [392.00, 493.88, 587.33, 783.99],  // G
    [523.25, 659.25, 783.99, 1046.50]  // C
  ];

  bgMusicStep = 0;
  let noteIndex = 0;

  bgMusicInterval = setInterval(() => {
    if (isAudioMuted || !isMusicPlaying) return;

    const currentChord = arpeggios[bgMusicStep];
    const freq = currentChord[noteIndex];

    playTone(freq, 0.48, "sine", 0.08, 0);

    noteIndex++;
    if (noteIndex >= currentChord.length) {
      noteIndex = 0;
      bgMusicStep = (bgMusicStep + 1) % arpeggios.length;
    }
  }, 420);
}

function stopRomanticMelody() {
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
  isMusicPlaying = false;
  updateMusicToggleUI();
}

function toggleRomanticMelody() {
  getAudioContext();
  if (isMusicPlaying) {
    stopRomanticMelody();
    isAudioMuted = true;
  } else {
    isAudioMuted = false;
    startRomanticMelody();
  }
  updateMusicToggleUI();
}

function updateMusicToggleUI() {
  const btn = document.getElementById("musicToggleBtn");
  if (!btn) return;
  if (!isMusicPlaying || isAudioMuted) {
    btn.classList.add("muted");
    btn.setAttribute("title", "Play music");
    btn.setAttribute("aria-label", "Play music");
  } else {
    btn.classList.remove("muted");
    btn.setAttribute("title", "Pause music");
    btn.setAttribute("aria-label", "Pause music");
  }
}

/* ---------------- Image compression (robust across iOS & desktop) ---------------- */
async function resizeImage(file, maxWidth = 640, quality = 0.65) {
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
          // If still larger than 140KB, scale down further to guarantee safety inside 1MB document limit with 3+ photos
          if (result.length > 140000) {
            const smallerCanvas = document.createElement("canvas");
            smallerCanvas.width = Math.round(width * 0.7);
            smallerCanvas.height = Math.round(height * 0.7);
            const sCtx = smallerCanvas.getContext("2d");
            sCtx.drawImage(img, 0, 0, smallerCanvas.width, smallerCanvas.height);
            result = smallerCanvas.toDataURL("image/jpeg", 0.55);
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
  const alertBox = document.getElementById("creatorErrorAlert");
  if (alertBox) {
    alertBox.textContent = msg;
    alertBox.classList.remove("hidden");
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const warningEl = document.getElementById("sizeWarning");
  if (warningEl) {
    warningEl.textContent = msg;
    warningEl.classList.remove("hidden");
  }
}

/* ---------------- Unique User Identification & Rate Limiting ---------------- */
function getOrCreateUserId() {
  if (window.__auth && window.__auth.currentUser && window.__auth.currentUser.uid) {
    return window.__auth.currentUser.uid;
  }
  let localId = localStorage.getItem("surprise_user_id");
  if (!localId) {
    localId = "usr_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
    localStorage.setItem("surprise_user_id", localId);
  }
  return localId;
}

function checkUserHourlyRateLimit(userId) {
  const key = "surprise_creations_" + userId;
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  let records = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) records = JSON.parse(raw);
  } catch {
    records = [];
  }
  records = records.filter(ts => typeof ts === "number" && ts > oneHourAgo);
  if (records.length >= 10) {
    const oldest = records[0];
    const waitMins = Math.ceil((oldest + (60 * 60 * 1000) - now) / 60000);
    throw new Error(`Rate limit reached: You can create a maximum of 10 links per hour. Please wait ~${waitMins} minute(s) before creating another.`);
  }
  return function recordCreation() {
    records.push(Date.now());
    try {
      localStorage.setItem(key, JSON.stringify(records));
    } catch {}
  };
}

/* ---------------- Boot: figure out which screen to show ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const creatorScreen = document.getElementById("creatorScreen");
  const receiverLoading = document.getElementById("receiverLoading");

  if (id) {
    // Instantly hide creator screen and show soft romantic loading animation
    if (creatorScreen) creatorScreen.classList.add("hidden");
    if (receiverLoading) receiverLoading.classList.remove("hidden");

    if (window.__firebasePromise) {
      try {
        await window.__firebasePromise;
      } catch (e) {
        console.warn("Firebase promise wait error:", e);
      }
    }

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

      // Smoothly dismiss receiver loading state
      if (receiverLoading) {
        receiverLoading.classList.add("fade-out");
        setTimeout(() => receiverLoading.classList.add("hidden"), 380);
      }

      document.getElementById("gateScreen").classList.remove("hidden");
      setupGate();
    } catch (error) {
      console.error("Link Data Error", error);
      if (receiverLoading) receiverLoading.classList.add("hidden");
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
    if (receiverLoading) receiverLoading.classList.add("hidden");
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
    const alertBox = document.getElementById("creatorErrorAlert");
    if (alertBox) alertBox.classList.add("hidden");

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
        bgImage = await resizeImage(bgFileInput.files[0], 700, 0.60);
      }

      const customGreeting = (document.getElementById("customGreetingInput")?.value || "").trim();
      const now = Date.now();
      const userId = getOrCreateUserId();
      const recordCreation = checkUserHourlyRateLimit(userId);

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
        creatorUid: userId
      };

      // Check approx payload size
      const approxSize = JSON.stringify(data).length;
      if (approxSize > 920000) {
        throw new Error("Photos are slightly too large for cloud storage — please choose smaller files.");
      }

      generateBtn.innerText = "Saving...";

      let savedId = null;
      let lastSaveError = null;

      if (window.__fs && window.__db) {
        try {
          const { collection, addDoc } = window.__fs;
          const ref = await addDoc(collection(window.__db, "surprises"), data);
          if (ref && ref.id) {
            savedId = ref.id;
          }
        } catch (fsErr) {
          lastSaveError = fsErr;
          console.warn("Firestore save failed, falling back to local server storage:", fsErr);
        }
      }

      if (!savedId) {
        try {
          const res = await fetch('/api/surprises', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify(data)
          });
          if (res.ok) {
            const json = await res.json();
            savedId = json.id;
          } else {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Server responded with status ${res.status}`);
          }
        } catch (apiErr) {
          console.error("API save failed:", apiErr);
          throw new Error(lastSaveError ? `Cloud error (${lastSaveError.message || lastSaveError.code}). Please try with slightly smaller photos.` : (apiErr.message || "Could not save surprise. Please check your connection and try again."));
        }
      }

      // Record successful creation for user's hourly limit
      recordCreation();

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
    getAudioContext();
    if (passInput.value.trim() === CONFIG.password) {
      gateError.classList.add("hidden");
      playEnvelopeChime();
      burstHearts(16);
      gateCard.classList.add("leaving");
      setTimeout(() => {
        gateScreen.classList.add("hidden");
        gateCard.classList.remove("leaving");
        startCelebration();
      }, 380);
    } else {
      playTone(220, 0.22, "sine", 0.2);
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

  const envelopeSection = document.getElementById("envelopeSection");
  const envelopeTeaser = document.getElementById("envelopeTeaser");
  const letterModal = document.getElementById("letterModal");
  const openEnvelopeBtn = document.getElementById("openEnvelopeBtn");
  const closeLetterBtn = document.getElementById("closeLetterBtn");
  const playGameFromLetterBtn = document.getElementById("playGameFromLetterBtn");
  const gameSection = document.getElementById("gameSection");

  if (CONFIG.message && CONFIG.message.trim()) {
    document.getElementById("displayMessage").innerText = CONFIG.message;
    envelopeSection.classList.remove("hidden");
    // Initial state: envelope closed
    envelopeTeaser.classList.remove("hidden");
    letterModal.classList.add("hidden");
    letterModal.classList.remove("folding");

    // Open Envelope handler
    openEnvelopeBtn.onclick = () => {
      getAudioContext();
      playEnvelopeChime();
      burstHearts(8);
      envelopeTeaser.classList.add("hidden");
      letterModal.classList.remove("hidden");
      letterModal.classList.remove("folding");
    };

    // Close button on top-right: fold back into envelope
    closeLetterBtn.onclick = () => {
      playTone(440, 0.25, "sine", 0.12);
      letterModal.classList.add("folding");
      setTimeout(() => {
        letterModal.classList.add("hidden");
        letterModal.classList.remove("folding");
        envelopeTeaser.classList.remove("hidden");
      }, 320);
    };

    // Cute "Click for more" button: unfold/advance to the game area with sweet animation
    playGameFromLetterBtn.onclick = () => {
      getAudioContext();
      playEnvelopeChime();
      burstHearts(12);
      // Fold back into envelope
      letterModal.classList.add("folding");
      setTimeout(() => {
        letterModal.classList.add("hidden");
        letterModal.classList.remove("folding");
        envelopeTeaser.classList.remove("hidden");
      }, 320);

      // Smoothly scroll down to the game panel and highlight it
      setTimeout(() => {
        if (gameSection) {
          gameSection.scrollIntoView({ behavior: "smooth", block: "center" });
          gameSection.classList.add("focus-highlight");
          setTimeout(() => gameSection.classList.remove("focus-highlight"), 1400);
        }
      }, 350);
    };
  } else {
    envelopeSection.classList.add("hidden");
  }

  const celebScreen = document.getElementById("celebrationScreen");
  celebScreen.classList.remove("hidden");
  requestAnimationFrame(() => celebScreen.classList.add("revealing"));

  // Dynamically setup slides based on actual photo count
  const sliderEl = document.querySelector(".hero .slider");
  const dotsContainer = document.getElementById("sliderDots");
  const photos = Array.isArray(CONFIG.photos) ? CONFIG.photos : [];
  const photoCount = Math.max(photos.length, 1);

  // Clear existing slides and dots
  const existingSlides = sliderEl.querySelectorAll(".slide");
  existingSlides.forEach(s => s.remove());
  dotsContainer.innerHTML = "";

  photos.forEach((src, idx) => {
    const img = document.createElement("img");
    img.id = `slide${idx + 1}`;
    img.alt = `Memory photo ${idx + 1}`;
    img.className = idx === 0 ? "slide active" : "slide";
    img.src = src;
    // Insert before hero-fade
    const heroFade = sliderEl.querySelector(".hero-fade");
    sliderEl.insertBefore(img, heroFade);

    if (photoCount > 1) {
      const dot = document.createElement("span");
      dot.className = idx === 0 ? "dot active" : "dot";
      dot.setAttribute("data-index", String(idx));
      dot.setAttribute("role", "button");
      dot.setAttribute("aria-label", `Show photo ${idx + 1}`);
      dot.setAttribute("tabindex", "0");
      dotsContainer.appendChild(dot);
    }
  });

  if (photoCount <= 1) {
    dotsContainer.style.display = "none";
  } else {
    dotsContainer.style.display = "flex";
  }

  // Setup "Create Another" flow button
  const createAnotherBtn = document.getElementById("createAnotherBtn");
  if (createAnotherBtn) {
    createAnotherBtn.onclick = () => {
      window.location.href = window.location.pathname;
    };
  }

  // Setup Romantic Music Toggle button
  const musicToggleBtn = document.getElementById("musicToggleBtn");
  if (musicToggleBtn) {
    musicToggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleRomanticMelody();
    };
  }

  // Initialize romantic background music (starts smoothly with user's unlock gesture)
  if (!isAudioMuted) {
    startRomanticMelody();
  } else {
    updateMusicToggleUI();
  }

  initSlider();
  startAmbientHearts();

  // Wait for layout so the game area has real dimensions before placing the target.
  requestAnimationFrame(() => initGame());
}

function initSlider() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = Array.from(document.querySelectorAll(".slider-dots .dot"));
  if (slides.length === 0) return;
  let currentSlide = 0;

  function show(idx) {
    if (slides.length <= 1) return;
    slides[currentSlide] && slides[currentSlide].classList.remove("active");
    dots[currentSlide] && dots[currentSlide].classList.remove("active");
    currentSlide = (idx + slides.length) % slides.length;
    slides[currentSlide] && slides[currentSlide].classList.add("active");
    dots[currentSlide] && dots[currentSlide].classList.add("active");
  }

  function resetTimer() {
    if (sliderInterval) clearInterval(sliderInterval);
    if (slides.length > 1) {
      sliderInterval = setInterval(() => show(currentSlide + 1), 3800);
    }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => { show(i); resetTimer(); });
    dot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(i); resetTimer(); }
    });
  });

  // Mobile swipe gesture support on slider
  const sliderEl = document.querySelector(".hero .slider");
  if (sliderEl && slides.length > 1) {
    let touchStartX = 0;
    let touchStartY = 0;
    sliderEl.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    sliderEl.addEventListener("touchend", (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        // Check if horizontal swipe was dominant
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            show(currentSlide + 1); // Swipe left -> next
          } else {
            show(currentSlide - 1); // Swipe right -> prev
          }
          resetTimer();
        }
      }
    }, { passive: true });
  }

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

  function triggerHaptic(pattern = [40]) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Silently ignore if vibrations are blocked by device policy
      }
    }
  }

  function hit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    score++;
    scoreDisplay.innerText = String(score);
    showScorePop(parseFloat(target.style.left) || 0, parseFloat(target.style.top) || 0, gameArea);

    if (score >= targetScore) {
      // Play celebratory chime fanfare
      playCelebrationFanfare();

      // Satisfying celebratory vibration pattern on winning (e.g. 50ms pulse, 60ms pause, 100ms pulse)
      triggerHaptic([50, 60, 100]);

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
      // Play sweet rising musical bell for each caught heart
      playHeartCatchSound(score);

      // Crisp, tactile single haptic tap on each caught heart
      triggerHaptic(40);
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
