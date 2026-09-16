const CONFIG = {
  password: "1234567",
  occasionTitle: "Happy Anniversary",
  landingMessage: "A journey of a thousand miles began with a single step. Click to see our story.",
  slides: [
    { image: "assets/photo1.jpg", caption: "Where it all began..." },
    { image: "assets/photo2.jpg", caption: "My favorite memory of us." },
    { image: "assets/photo3.jpg", caption: "To many more years together." }
  ],
  winMessage: "You've won my heart (again)! ❤️"
};

/**
 * NOTE: This is client-side security for a celebratory experience.
 * It is not intended for actual data protection.
 */

document.addEventListener('DOMContentLoaded', () => {
    initContent();
    createHearts();
    setupSlider();
});

function initContent() {
    document.getElementById('conf-title').innerText = CONFIG.occasionTitle;
    document.getElementById('conf-landing-msg').innerText = CONFIG.landingMessage;
    document.getElementById('conf-personal-title').innerText = CONFIG.occasionTitle;
    document.getElementById('conf-personal-msg').innerText = CONFIG.landingMessage;
    document.getElementById('conf-win-msg').innerText = CONFIG.winMessage;

    // Set landing background with fallback
    const bg = document.getElementById('landing-bg');
    const img = new Image();
    img.src = CONFIG.slides[0].image;
    img.onload = () => bg.style.backgroundImage = `url('${img.src}')`;
    img.onerror = () => bg.style.background = "linear-gradient(45deg, #ff758f, #ffafbd)";
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    target.classList.add('active');
}

function validatePassword() {
    const input = document.getElementById('pass-input');
    const error = document.getElementById('error-msg');
    if (input.value === CONFIG.password) {
        showScreen('screen-main');
        initGame();
    } else {
        input.parentElement.classList.add('shake');
        error.style.display = 'block';
        setTimeout(() => {
            input.parentElement.classList.remove('shake');
            input.value = '';
        }, 400);
    }
}

// Slider Logic
let currentSlide = 0;
let slideInterval;

function setupSlider() {
    const wrapper = document.getElementById('slider-wrapper');
    CONFIG.slides.forEach(slide => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.innerHTML = `
            <img src="${slide.image}" onerror="this.outerHTML='<div class=\'slide-fallback\'>🎉</div>'">
            <div class="caption" style="position:absolute; bottom:0; background:rgba(0,0,0,0.6); color:white; width:100%; padding:15px; font-size:14px;">${slide.caption}</div>
        `;
        wrapper.appendChild(div);
    });
    startAutoPlay();

    // Swipe Support
    let startX = 0;
    wrapper.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive: true});
    wrapper.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        if (startX - endX > 50) moveSlider(1);
        if (endX - startX > 50) moveSlider(-1);
    }, {passive: true});
}

function moveSlider(dir) {
    currentSlide = (currentSlide + dir + CONFIG.slides.length) % CONFIG.slides.length;
    document.getElementById('slider-wrapper').style.transform = `translateX(-${currentSlide * 100}%)`;
    startAutoPlay();
}

function startAutoPlay() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => moveSlider(1), 4000);
}

// Game Logic
let score = 0;
let gameTimer;

function initGame() {
    const target = document.getElementById('game-target');
    const triggerMove = () => {
        const area = document.getElementById('game-area');
        const x = Math.random() * (area.clientWidth - 50);
        const y = Math.random() * (area.clientHeight - 50);
        target.style.left = x + 'px';
        target.style.top = y + 'px';
        gameTimer = setTimeout(triggerMove, 1500);
    };

    const handleHit = (e) => {
        e.preventDefault();
        score++;
        document.getElementById('score-val').innerText = score;
        if (score >= 10) {
            document.getElementById('win-overlay').style.display = 'flex';
            clearTimeout(gameTimer);
        } else {
            clearTimeout(gameTimer);
            triggerMove();
        }
    };

    target.addEventListener('touchstart', handleHit);
    target.addEventListener('click', handleHit);
    triggerMove();
}

// Decorative Hearts
function createHearts() {
    const container = document.getElementById('heart-container');
    setInterval(() => {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.innerHTML = '❤';
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.fontSize = (Math.random() * 20 + 10) + 'px';
        heart.style.animationDuration = (Math.random() * 3 + 3) + 's';
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 6000);
    }, 800);
}
