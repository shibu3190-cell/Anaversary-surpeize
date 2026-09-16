let CONFIG = {
  title: "",
  message: "",
  password: "",
  photos: []
};

let score = 0;
const targetScore = 10;
let sliderInterval = null;

// Lightweight image resizer (keeps memory low to prevent mobile UI freeze)
function resizeImage(file, maxWidth = 320, quality = 0.5) {
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
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
        photos: photos
      };

      const base64String = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const finalUrl = window.location.origin + window.location.pathname + "#" + encodeURIComponent(base64String);

      document.getElementById("generatedUrl").value = finalUrl;
      document.getElementById("linkResult").classList.remove("hidden");
    } catch (err) {
      alert("Error: " + err.message);
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

function startCelebration() {
  document.title = CONFIG.title;
  document.getElementById("celebrationTitle").innerText = CONFIG.title;
  document.getElementById("displayMessage").innerText = CONFIG.message;

  // 1. Reveal celebration screen first so container dimensions are measurable
  const celebScreen = document.getElementById("celebrationScreen");
  celebScreen.classList.remove("hidden");

  // Load photos into slides
  if (CONFIG.photos && CONFIG.photos.length >= 3) {
    document.getElementById("slide1").src = CONFIG.photos[0];
    document.getElementById("slide2").src = CONFIG.photos[1];
    document.getElementById("slide3").src = CONFIG.photos[2];
  }

  initSlider();

  // 2. Wait for browser layout to complete before computing game coordinates
  requestAnimationFrame(() => {
    initGame();
  });
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

  score = 0;
  scoreDisplay.innerText = "0";
  target.style.display = "block";

  function moveTarget() {
    const areaW = gameArea.clientWidth || 300;
    const areaH = gameArea.clientHeight || 220;

    const maxX = Math.max(areaW - 60, 40);
    const maxY = Math.max(areaH - 60, 40);

    const randX = Math.floor(Math.random() * maxX) + 30;
    const randY = Math.floor(Math.random() * maxY) + 30;

    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
  }

  function hit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    score++;
    scoreDisplay.innerText = score;

    if (score >= targetScore) {
      target.style.display = "none";
      winOverlay.classList.remove("hidden");
    } else {
      moveTarget();
    }
  }

  target.onpointerdown = hit;

  closeOverlayBtn.onclick = () => {
    winOverlay.classList.add("hidden");
  };

  moveTarget();
}
