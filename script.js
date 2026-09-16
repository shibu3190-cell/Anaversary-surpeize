let CONFIG = {
  title: "",
  message: "",
  password: ""
};

let score = 0;
const targetScore = 10;
let sliderInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dParam = urlParams.get("d");

  if (dParam) {
    // Hide creator form screen
    document.getElementById("creatorScreen").classList.add("hidden");

    try {
      // Decode the URL param safely
      const jsonString = decodeURIComponent(escape(atob(decodeURIComponent(dParam))));
      CONFIG = JSON.parse(jsonString);

      if (!CONFIG.title || !CONFIG.password) {
        throw new Error("Missing required config values");
      }

      // Show Gate Screen
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
    // No 'd' param, regular creator flow
    setupCreator();
  }
});

// Setup Link Generation Flow
function setupCreator() {
  const form = document.getElementById("creatorForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    generateLink();
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

function generateLink() {
  const data = {
    title: document.getElementById("titleInput").value.trim(),
    message: document.getElementById("messageInput").value.trim(),
    password: document.getElementById("passwordInput").value.trim()
  };

  // Base64 encode with unicode support
  const base64String = btoa(unescape(encodeURIComponent(JSON.stringify(data))));

  // Encoded parameter prevents '+' sign corruption
  const finalUrl = window.location.origin + window.location.pathname + "?d=" + encodeURIComponent(base64String);

  document.getElementById("generatedUrl").value = finalUrl;
  document.getElementById("linkResult").classList.remove("hidden");
}

// Setup Password Gate Flow
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

// Start Celebration Flow
function startCelebration() {
  // Update browser tab title
  document.title = CONFIG.title;

  document.getElementById("celebrationTitle").innerText = CONFIG.title;
  document.getElementById("displayMessage").innerText = CONFIG.message;
  document.getElementById("celebrationScreen").classList.remove("hidden");

  initSlider();
  initGame();
}

// Image Slider Autoplay
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

// Game Logic with single pointer interaction
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

  // Pointerdown captures both touch and click without double-firing
  target.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    hit();
  });

  closeOverlayBtn.addEventListener("click", () => {
    winOverlay.classList.add("hidden");
  });

  moveTarget();
}
