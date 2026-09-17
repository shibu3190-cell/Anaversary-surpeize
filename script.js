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
let targetAnimationId = null;

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

// Naughty dodge whoosh / cute glissando sound when heart dodges a click
function playNaughtyDodgeSound() {
  playTone(587.33, 0.12, "sine", 0.16, 0);       // D5
  playTone(880.00, 0.16, "triangle", 0.12, 0.05); // A5 quick glide
}

// Celebratory joyous sound when hearts are caught or celebration is completed
function playCelebrationFanfare() {
  // Exuberant rising arpeggio chord followed by a bright sparkling chime
  const notes = [
    { freq: 523.25, dur: 0.18, delay: 0, type: "sine", vol: 0.24 },       // C5
    { freq: 659.25, dur: 0.18, delay: 0.10, type: "sine", vol: 0.24 },    // E5
    { freq: 783.99, dur: 0.20, delay: 0.20, type: "sine", vol: 0.26 },    // G5
    { freq: 1046.50, dur: 0.35, delay: 0.32, type: "sine", vol: 0.28 },   // C6
    { freq: 1318.51, dur: 0.50, delay: 0.44, type: "triangle", vol: 0.22 }, // E6
    { freq: 1567.98, dur: 0.85, delay: 0.58, type: "sine", vol: 0.26 }    // G6 joyous pinnacle
  ];
  notes.forEach(n => {
    playTone(n.freq, n.dur, n.type || "sine", n.vol || 0.22, n.delay);
  });
}

// Stops background music gracefully with an exuberant joyous sound
function stopMusicWithJoyousSound() {
  stopRomanticMelody();
  playCelebrationFanfare();
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

      // Display the Surprise ID code prominently for the creator
      const createdIdEl = document.getElementById("createdSurpriseId");
      if (createdIdEl) {
        createdIdEl.textContent = savedId;
      }
      const copyIdBtn = document.getElementById("copyIdBtn");
      if (copyIdBtn) {
        copyIdBtn.onclick = () => {
          if (navigator.clipboard) navigator.clipboard.writeText(savedId).catch(() => {});
          copyIdBtn.textContent = "Copied! ✨";
          setTimeout(() => { copyIdBtn.textContent = "📋 Copy ID"; }, 2000);
        };
      }

      // Pre-fill the lookup input in the manage tab
      const lookupInput = document.getElementById("lookupIdInput");
      if (lookupInput) {
        lookupInput.value = savedId;
      }

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
    setTimeout(() => { btn.innerText = "Copy Link"; }, 2000);
  });

  // Initialize the Track & Edit Management Panel
  setupCreatorManagement();
}

/* ---------------- Creator Management & Status Tracking ---------------- */
function setupCreatorManagement() {
  const tabCreate = document.getElementById("tabCreateMode");
  const tabManage = document.getElementById("tabManageMode");
  const createPanel = document.getElementById("createPanel");
  const managePanel = document.getElementById("managePanel");
  const lookupBtn = document.getElementById("lookupBtn");
  const lookupInput = document.getElementById("lookupIdInput");
  const lookupError = document.getElementById("lookupError");
  const statusCard = document.getElementById("statusResultCard");

  if (!tabCreate || !tabManage) return;

  tabCreate.addEventListener("click", () => {
    tabCreate.classList.add("active");
    tabCreate.setAttribute("aria-selected", "true");
    tabManage.classList.remove("active");
    tabManage.setAttribute("aria-selected", "false");
    createPanel.classList.remove("hidden");
    managePanel.classList.add("hidden");
  });

  tabManage.addEventListener("click", () => {
    tabManage.classList.add("active");
    tabManage.setAttribute("aria-selected", "true");
    tabCreate.classList.remove("active");
    tabCreate.setAttribute("aria-selected", "false");
    managePanel.classList.remove("hidden");
    createPanel.classList.add("hidden");
    if (lookupInput.value.trim() && statusCard.classList.contains("hidden")) {
      lookupBtn.click();
    }
  });

  let currentManagedData = null;
  let currentManagedId = null;

  async function checkStatus() {
    const id = (lookupInput.value || "").trim();
    if (!id) {
      lookupError.textContent = "Please enter or paste a Surprise ID code.";
      lookupError.classList.remove("hidden");
      return;
    }
    lookupError.classList.add("hidden");
    lookupBtn.disabled = true;
    lookupBtn.textContent = "Checking...";

    try {
      let data = null;

      // 1. Try Firestore direct lookup
      if (window.__fs && window.__db) {
        try {
          const { doc, getDoc } = window.__fs;
          const snap = await getDoc(doc(window.__db, "surprises", id));
          if (snap.exists()) {
            const raw = snap.data();
            const now = Date.now();
            data = {
              id: snap.id,
              title: raw.title,
              message: raw.message,
              customGreeting: raw.customGreeting,
              password: raw.password,
              createdAt: raw.createdAt,
              expiresAt: raw.expiresAt,
              clickCount: raw.clickCount || 0,
              maxClicks: raw.maxClicks || 10,
              isExpired: raw.expiresAt ? (now > raw.expiresAt) : false,
              timeRemainingMs: Math.max(0, (raw.expiresAt || 0) - now),
              creatorUid: raw.creatorUid
            };
          }
        } catch (fsErr) {
          console.warn("Firestore lookup check error:", fsErr);
        }
      }

      // 2. Fallback to API status endpoint
      if (!data) {
        const res = await fetch(`/api/surprises/${encodeURIComponent(id)}/status`);
        if (res.ok) {
          data = await res.json();
        } else {
          const errRes = await res.json().catch(() => ({}));
          throw new Error(errRes.error || "Surprise not found. It may have expired or the ID is invalid.");
        }
      }

      currentManagedData = data;
      currentManagedId = id;

      // Render metrics
      document.getElementById("statusTitle").textContent = data.title || "Surprise Moment";
      
      const badge = document.getElementById("statusBadge");
      if (data.isExpired || (data.clickCount >= data.maxClicks)) {
        badge.className = "badge-expired";
        badge.textContent = "Expired / Limit Reached";
      } else {
        badge.className = "badge-active";
        badge.textContent = "Active & Live";
      }

      document.getElementById("statusClickCount").textContent = `${data.clickCount || 0} / ${data.maxClicks || 10}`;

      // Time remaining formatting
      const remainingMs = Math.max(0, (data.expiresAt || 0) - Date.now());
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      document.getElementById("statusTimeRemaining").textContent = remainingMs > 0 ? `${remainingHours}h ${remainingMins}m` : "Expired";

      // Created & Expires at human dates
      const createdDate = data.createdAt ? new Date(data.createdAt) : new Date();
      const expiresDate = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 12 * 3600000);
      document.getElementById("statusCreatedAt").textContent = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + createdDate.toLocaleDateString();
      document.getElementById("statusExpiresAt").textContent = expiresDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + expiresDate.toLocaleDateString();

      // Setup Link button
      const openBtn = document.getElementById("openManagedLinkBtn");
      const targetUrl = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(id);
      openBtn.onclick = () => window.open(targetUrl, "_blank");

      // Setup editable fields
      document.getElementById("editTitleInput").value = data.title || "";
      document.getElementById("editMessageInput").value = data.message || "";
      document.getElementById("editCustomGreetingInput").value = data.customGreeting || "";
      document.getElementById("editPasswordInput").value = data.password || "";

      statusCard.classList.remove("hidden");
    } catch (err) {
      lookupError.textContent = err.message || "Failed to look up surprise.";
      lookupError.classList.remove("hidden");
      statusCard.classList.add("hidden");
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = "Check";
    }
  }

  lookupBtn.addEventListener("click", checkStatus);
  lookupInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkStatus();
  });

  // Toggle Edit details section
  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const editContainer = document.getElementById("editFieldsContainer");
  const saveEditBtn = document.getElementById("saveEditBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editNotice = document.getElementById("editNotice");

  toggleEditBtn.addEventListener("click", () => {
    const isHidden = editContainer.classList.contains("hidden");
    if (isHidden) {
      editContainer.classList.remove("hidden");
      toggleEditBtn.textContent = "▲ Close Editor";
      if (editNotice) editNotice.classList.add("hidden");
    } else {
      editContainer.classList.add("hidden");
      toggleEditBtn.textContent = "✏️ Edit Details";
    }
  });

  cancelEditBtn.addEventListener("click", () => {
    editContainer.classList.add("hidden");
    toggleEditBtn.textContent = "✏️ Edit Details";
  });

  saveEditBtn.addEventListener("click", async () => {
    if (!currentManagedId) return;
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Saving...";
    if (editNotice) editNotice.classList.add("hidden");

    const updated = {
      title: document.getElementById("editTitleInput").value.trim(),
      message: document.getElementById("editMessageInput").value.trim(),
      customGreeting: document.getElementById("editCustomGreetingInput").value.trim(),
      password: document.getElementById("editPasswordInput").value.trim()
    };

    try {
      // 1. Update Firestore if accessible
      if (window.__fs && window.__db) {
        try {
          const { doc, updateDoc } = window.__fs;
          await updateDoc(doc(window.__db, "surprises", currentManagedId), updated);
        } catch (fsErr) {
          console.warn("Firestore update error:", fsErr);
        }
      }

      // 2. Also update server memory
      await fetch(`/api/surprises/${encodeURIComponent(currentManagedId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });

      if (editNotice) {
        editNotice.classList.remove("hidden");
        editNotice.textContent = "Changes saved successfully! ✨";
      }

      // Update card title
      document.getElementById("statusTitle").textContent = updated.title || "Surprise Moment";
    } catch (err) {
      alert("Could not update surprise: " + err.message);
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = "Save Changes";
    }
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

/* ---------------- Mini game (Organic Bezier Curve & Swaying Heart) ---------------- */
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

  if (targetAnimationId) {
    cancelAnimationFrame(targetAnimationId);
    targetAnimationId = null;
  }

  // Motion physics state
  let currentTargetSize = 52; // Dynamically adjusts size (36px to 58px)
  let currentPos = { x: 50, y: 50 };
  let startPos = { x: 50, y: 50 };
  let controlPoint1 = { x: 60, y: 60 };
  let controlPoint2 = { x: 70, y: 70 };
  let endPos = { x: 80, y: 80 };
  let pathStartTime = performance.now();
  let pathDuration = 2400; // ms to traverse bezier curve
  let swayPhase = Math.random() * Math.PI * 2;
  let isNaughtyDodging = false;
  let consecutiveDodges = 0; // Ensures heart doesn't dodge indefinitely

  // Playful size tiers for the heart: changes dynamically as score advances
  // (Starts cozy, shrinks playfully as player gets better, morphs playfully on close encounters)
  const sizePresets = [54, 48, 44, 40, 38];

  function applyHeartSize(sizePx) {
    currentTargetSize = sizePx;
    target.style.width = `${sizePx}px`;
    target.style.height = `${sizePx}px`;
    // Scale font size proportionally (approx 68% of bounding box)
    target.style.fontSize = `${(sizePx * 0.68).toFixed(1)}px`;
  }

  // Initial size
  applyHeartSize(sizePresets[0]);

  function getBounds() {
    const areaW = gameArea.clientWidth || 300;
    const areaH = gameArea.clientHeight || 200;
    const minPadding = 12;
    const maxX = Math.max(areaW - currentTargetSize - minPadding, minPadding);
    const maxY = Math.max(areaH - currentTargetSize - minPadding, minPadding);
    return { minX: minPadding, maxX, minY: minPadding, maxY };
  }

  function pickRandomPoint(bounds) {
    return {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
    };
  }

  // Cubic bezier calculation: B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
  function getCubicBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  // Generate a new organic bezier flight path within the game container
  function planNewBezierPath() {
    const bounds = getBounds();
    startPos = { ...currentPos };
    endPos = pickRandomPoint(bounds);

    // Pick control points that arc organically across the area
    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2;
    const offsetMag = Math.min(80, (bounds.maxX - bounds.minX) * 0.4);

    controlPoint1 = {
      x: Math.min(Math.max(midX + (Math.random() * 2 - 1) * offsetMag, bounds.minX), bounds.maxX),
      y: Math.min(Math.max(startPos.y + (Math.random() * 2 - 1) * offsetMag, bounds.minY), bounds.maxY)
    };
    controlPoint2 = {
      x: Math.min(Math.max(midX + (Math.random() * 2 - 1) * offsetMag, bounds.minX), bounds.maxX),
      y: Math.min(Math.max(endPos.y + (Math.random() * 2 - 1) * offsetMag, bounds.minY), bounds.maxY)
    };

    // Calculate dynamic flight duration proportional to distance
    const dist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
    pathDuration = Math.max(1600, Math.min(3200, dist * 10 + 1200));
    pathStartTime = performance.now();
  }

  // Set initial position
  const initialBounds = getBounds();
  currentPos = pickRandomPoint(initialBounds);
  target.style.left = `${currentPos.x}px`;
  target.style.top = `${currentPos.y}px`;
  planNewBezierPath();

  // Smooth sinusoidal ease-in-out
  function smoothEaseInOut(t) {
    return 0.5 * (1 - Math.cos(Math.PI * t));
  }

  // Continuous animation frame loop for fluid organic bezier & harmonic swaying motion
  function animateHeart(now) {
    if (score >= targetScore) return;

    const bounds = getBounds();
    const elapsed = now - pathStartTime;
    const progress = Math.min(elapsed / pathDuration, 1);
    const easedProgress = smoothEaseInOut(progress);

    // Calculate base bezier curve position
    const bezierPos = getCubicBezierPoint(easedProgress, startPos, controlPoint1, controlPoint2, endPos);

    // Add gentle organic pendulum sway (subtle sine & cosine drift)
    swayPhase += 0.035;
    const swayX = Math.sin(swayPhase) * 6;
    const swayY = Math.cos(swayPhase * 0.8) * 5;
    const rotationAngle = Math.sin(swayPhase * 1.2) * 12;

    // Strict boundary enforcement so target is never cropped or pushed outside
    const clampedX = Math.min(Math.max(bezierPos.x + swayX, bounds.minX), bounds.maxX);
    const clampedY = Math.min(Math.max(bezierPos.y + swayY, bounds.minY), bounds.maxY);

    currentPos = { x: clampedX, y: clampedY };
    target.style.left = `${clampedX.toFixed(1)}px`;
    target.style.top = `${clampedY.toFixed(1)}px`;
    target.style.transform = `rotate(${rotationAngle.toFixed(1)}deg)`;

    // When current curve completes, plan next organic path seamlessly
    if (progress >= 1) {
      planNewBezierPath();
    }

    targetAnimationId = requestAnimationFrame(animateHeart);
  }

  targetAnimationId = requestAnimationFrame(animateHeart);

  function triggerHaptic(pattern = [40]) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Silently ignore if vibrations are blocked by device policy
      }
    }
  }

  // Naughty phrases that pop up when the heart cheekily slips away
  const naughtyTeases = ["Almost! 😉", "Too slow! 💨", "Catch me! 🏃‍♀️", "So close! 💖", "Oops! ✨", "Not yet! 😜"];

  function showTeasePop(x, y, text) {
    const tease = document.createElement("div");
    tease.className = "tease-pop";
    tease.textContent = text;
    tease.style.left = `${Math.round(x)}px`;
    tease.style.top = `${Math.round(y)}px`;
    gameArea.appendChild(tease);
    setTimeout(() => tease.remove(), 750);
  }

  // Cheeky sideways jink / dodge when user tries to tap the heart
  function performNaughtyDodge(touchX, touchY) {
    if (isNaughtyDodging) return;
    isNaughtyDodging = true;
    consecutiveDodges++;

    // Play playful dodge audio whoosh
    playNaughtyDodgeSound();

    // Double-pulse teasing haptic flutter (30ms buzz, 30ms gap, 25ms buzz)
    triggerHaptic([30, 30, 25]);

    // Show cheeky tease speech bubble at touch location
    const teaseWord = naughtyTeases[Math.floor(Math.random() * naughtyTeases.length)];
    showTeasePop(currentPos.x + currentTargetSize / 2, currentPos.y - 12, teaseWord);

    // Compute dodge vector away from the touch position
    const bounds = getBounds();
    const centerX = currentPos.x + currentTargetSize / 2;
    const centerY = currentPos.y + currentTargetSize / 2;
    let dx = centerX - touchX;
    let dy = centerY - touchY;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;

    // Perpendicular sideways dart with slight backward push (naughty dodge)
    const sideAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2.5);
    const jumpDist = 55 + Math.random() * 35; // 55px to 90px quick side-step
    const jumpX = Math.cos(Math.atan2(dy, dx) + sideAngle) * jumpDist;
    const jumpY = Math.sin(Math.atan2(dy, dx) + sideAngle) * jumpDist;

    const newX = Math.min(Math.max(currentPos.x + jumpX, bounds.minX), bounds.maxX);
    const newY = Math.min(Math.max(currentPos.y + jumpY, bounds.minY), bounds.maxY);

    // Dynamic size pulse during dodge: heart shrinks slightly as if squishing/darting away
    const temporaryDodgeSize = Math.max(34, Math.round(currentTargetSize * 0.84));
    target.style.transform = `scale(0.85) rotate(${jumpX > 0 ? 18 : -18}deg)`;
    applyHeartSize(temporaryDodgeSize);
    target.classList.add("naughty-twitch");

    currentPos = { x: newX, y: newY };
    target.style.left = `${newX.toFixed(1)}px`;
    target.style.top = `${newY.toFixed(1)}px`;

    // Reset trajectory from new position
    planNewBezierPath();

    setTimeout(() => {
      target.classList.remove("naughty-twitch");
      // Restore normal tier size
      const currentTierSize = sizePresets[Math.min(score, sizePresets.length - 1)];
      applyHeartSize(currentTierSize);
      target.style.transform = "scale(1)";
      isNaughtyDodging = false;
    }, 240);
  }

  function handleTargetPointerDown(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    getAudioContext();

    const rect = target.getBoundingClientRect();
    const touchX = e.clientX || (rect.left + rect.width / 2);
    const touchY = e.clientY || (rect.top + rect.height / 2);

    // Playful naughty dodge mechanic:
    // With 50% probability (and if it hasn't dodged too many times consecutively),
    // the heart cheekily darts to the side to create a "miss touch" before being caught!
    const shouldNaughtyDodge = (consecutiveDodges < 1 || (score >= 2 && consecutiveDodges < 2)) && Math.random() < 0.52;

    if (shouldNaughtyDodge && !isNaughtyDodging) {
      performNaughtyDodge(touchX, touchY);
      return;
    }

    // Otherwise, successful heart catch!
    consecutiveDodges = 0;
    hit(e);
  }

  function hit(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    score++;
    scoreDisplay.innerText = String(score);
    showScorePop(currentPos.x, currentPos.y, gameArea);

    // Dynamically evolve the heart's size as score increases!
    // Starts generous (54px), progressively gets nimbler (48px, 44px, 40px, 38px)
    const nextSize = sizePresets[Math.min(score, sizePresets.length - 1)];
    applyHeartSize(nextSize);

    // Brief joyful squish bounce on capture
    target.style.transform = "scale(1.28)";
    setTimeout(() => {
      if (target) target.style.transform = "scale(1)";
    }, 180);

    if (score >= targetScore) {
      // Stop romantic background music and trigger celebratory fanfare joyous sound
      stopMusicWithJoyousSound();

      // Satisfying celebratory vibration pattern on winning (e.g. 50ms pulse, 60ms pause, 100ms pulse)
      triggerHaptic([60, 60, 120, 80, 180]);

      if (targetAnimationId) {
        cancelAnimationFrame(targetAnimationId);
        targetAnimationId = null;
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

      // Crisp, tactile satisfying haptic tap on each caught heart
      triggerHaptic([45, 20, 35]);

      // Instantly start an energetic reactive curved dodge when caught
      planNewBezierPath();
    }
  }

  target.onpointerdown = handleTargetPointerDown;

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
