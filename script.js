let CONFIG = { title: "", msg: "", pass: "" };

// 1. IMMEDIATE DETECTION (Runs before anything else)
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('d');
    if (data) {
        try {
            // Use decodeURIComponent + escape to handle emojis/special chars
            CONFIG = JSON.parse(decodeURIComponent(escape(atob(data))));
            window.isCelebration = true;
        } catch (e) {
            console.error("Link Data Error");
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    if (window.isCelebration) {
        startCelebration();
    }
});

function generateLink() {
    const t = document.getElementById('setup-title').value;
    const m = document.getElementById('setup-msg').value;
    const p = document.getElementById('setup-pass').value;
    
    if(!t || !p) return alert("Please enter a Title and Password");

    const dataObj = { title: t, msg: m, pass: p };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataObj))));
    
    // Get clean URL without existing parameters
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    const finalUrl = cleanUrl + "?d=" + encoded;
    
    const input = document.getElementById('share-url');
    input.value = finalUrl;
    document.getElementById('link-output').classList.remove('hidden');
    
    // Auto-copy to clipboard
    input.select();
    navigator.clipboard.writeText(finalUrl);
}

function startCelebration() {
    // Hide setup, show landing
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('active');
    
    document.getElementById('display-title').innerText = CONFIG.title;
    document.getElementById('display-msg').innerText = CONFIG.msg;
    
    const bg = document.getElementById('landing-bg');
    bg.style.backgroundImage = "url('assets/photo1.jpg')";
    
    const landing = document.getElementById('landing-screen');
    landing.classList.remove('hidden');
    setTimeout(() => landing.classList.add('active'), 50);
}

function showPasswordGate() {
    switchScreen('landing-screen', 'password-screen');
}

function checkPassword() {
    const input = document.getElementById('pass-input');
    if (input.value === CONFIG.pass) {
        document.getElementById('final-title').innerText = CONFIG.title;
        document.getElementById('final-msg').innerText = CONFIG.msg;
        switchScreen('password-screen', 'main-content');
        initGame();
    } else {
        input.parentElement.classList.add('shake');
        document.getElementById('error-msg').style.display = 'block';
        setTimeout(() => input.parentElement.classList.remove('shake'), 300);
    }
}

function switchScreen(oldId, newId) {
    const oldS = document.getElementById(oldId);
    const newS = document.getElementById(newId);
    oldS.classList.remove('active');
    setTimeout(() => {
        oldS.classList.add('hidden');
        newS.classList.remove('hidden');
        setTimeout(() => newS.classList.add('active'), 50);
    }, 400);
}

// Slider Logic
let curSlide = 0;
function moveSlide(step) {
    const wrapper = document.getElementById('slider-wrapper');
    curSlide = (curSlide + step + 3) % 3;
    wrapper.style.transform = `translateX(-${curSlide * 100}%)`;
}
setInterval(() => moveSlide(1), 4000);

// Game Logic
let score = 0;
function initGame() {
    const target = document.getElementById('target');
    const area = document.getElementById('game-area');
    const move = () => {
        const x = Math.random() * (area.clientWidth - 50);
        const y = Math.random() * (area.clientHeight - 50);
        target.style.left = x + 'px';
        target.style.top = y + 'px';
    };
    const hit = (e) => {
        e.preventDefault();
        score++;
        document.getElementById('score').innerText = score;
        if(score >= 10) document.getElementById('win-overlay').classList.remove('hidden');
        move();
    };
    target.addEventListener('touchstart', hit);
    target.addEventListener('click', hit);
    setInterval(move, 1800);
}

function imgErr(img) {
    img.parentElement.style.background = "linear-gradient(45deg, #ff758f, #ffafbd)";
    img.parentElement.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:40px">💝</div>';
}
