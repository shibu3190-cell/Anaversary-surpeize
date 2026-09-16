const CONFIG = {
  password: "1234567",
  occasionTitle: "Happy Birthday!",
  landingMessage: "A little surprise for someone special.",
  slides: [
    { image: "assets/photo1.jpg", caption: "The beginning of a beautiful journey." },
    { image: "assets/photo2.jpg", caption: "Every moment with you is a treasure." },
    { image: "assets/photo3.jpg", caption: "Here's to a future full of joy!" }
  ],
  winMessage: "You caught all the magic! You're amazing. ✨"
};

/** 
 * NOTE: This is client-side only security for a celebratory experience. 
 * It is not intended for sensitive data. 
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial UI Fill
    document.getElementById('landing-title').innerText = CONFIG.occasionTitle;
    document.getElementById('landing-msg').innerText = CONFIG.landingMessage;
    document.getElementById('main-title').innerText = CONFIG.occasionTitle;
    document.getElementById('win-msg-display').innerText = CONFIG.winMessage;

    // Handle Landing Background Fallback
    const lBg = document.getElementById('landing-bg');
    const img = new Image();
    img.src = CONFIG.slides[0].image;
    img.onload = () => lBg.style.backgroundImage = `url('${img.src}')`;
    
    // Setup Slider
    setupSlider();
});

// Navigation Flow
document.getElementById('btn-enter').addEventListener('click', () => {
    switchScreen('landing-screen', 'password-screen');
});

document.getElementById('btn-unlock').addEventListener('click', () => {
    const val = document.getElementById('pass-input').value;
    if (val === CONFIG.password) {
        switchScreen('password-screen', 'main-content');
        startGame();
    } else {
        const input = document.getElementById('pass-input');
        const err = document.getElementById('error-msg');
        input.classList.add('shake');
        err.style.display = 'block';
        setTimeout(() => {
            input.classList.remove('shake');
            input.value = '';
        }, 400);
    }
});

function switchScreen(oldId, newId) {
    document.getElementById(oldId).classList.remove('active');
    setTimeout(() => {
        document.getElementById(oldId).classList.add('hidden');
        document.getElementById(newId).classList.remove('hidden');
        setTimeout(() => document.getElementById(newId).classList.add('active'), 50);
    }, 500);
}

// Slider Logic
let currentSlide = 0;
let slideInterval;

function setupSlider() {
    const wrapper = document.getElementById('slides-wrapper');
    CONFIG.slides.forEach(s => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.innerHTML = `
            <img src="${s.image}" onerror="this.outerHTML='<div class=\'slide-fallback\'>💝</div>'">
            <div class="caption">${s.caption}</div>
        `;
        wrapper.appendChild(slide);
    });

    const update = () => {
        wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    };

    const next = () => {
        currentSlide = (currentSlide + 1) % CONFIG.slides.length;
        update();
    };

    const prev = () => {
        currentSlide = (currentSlide - 1 + CONFIG.slides.length) % CONFIG.slides.length;
        update();
    };

    document.getElementById('next-btn').addEventListener('click', () => { next(); startTimer(); });
    document.getElementById('prev-btn').addEventListener('click', () => { prev(); startTimer(); });

    // Swipe Support
    let startX = 0;
    wrapper.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive: true});
    wrapper.addEventListener('touchend', e => {
        let diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? next() : prev();
            startTimer();
        }
    }, {passive: true});

    const startTimer = () => {
        clearInterval(slideInterval);
        slideInterval = setInterval(next, 4000);
    };
    startTimer();
}

// Game Logic
let score = 0;
let gameTimer;
const target = document.getElementById('target');
const board = document.getElementById('game-board');

function startGame() {
    moveTarget();
    target.addEventListener('touchstart', handleHit);
    target.addEventListener('mousedown', handleHit);
}

function handleHit(e) {
    e.preventDefault();
    score++;
    document.getElementById('score').innerText = score;
    if (score >= 10) {
        document.getElementById('win-screen').classList.remove('hidden');
        clearTimeout(gameTimer);
    } else {
        moveTarget();
    }
}

function moveTarget() {
    clearTimeout(gameTimer);
    const x = Math.random() * (board.clientWidth - 50);
    const y = Math.random() * (board.clientHeight - 50);
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    gameTimer = setTimeout(moveTarget, 1500);
}
