let CONFIG = { title: "", msg: "", pass: "" };

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('d');
    
    if (dataParam) {
        try {
            // Robust decoding for special characters/emojis
            const decoded = JSON.parse(decodeURIComponent(escape(atob(dataParam))));
            CONFIG = decoded;
            startCelebration();
        } catch (e) {
            console.error("Link error:", e);
            alert("The link seems broken. Please generate a new one.");
        }
    }
});

function generateLink() {
    const t = document.getElementById('setup-title').value;
    const m = document.getElementById('setup-msg').value;
    const p = document.getElementById('setup-pass').value;
    
    if(!t || !p) {
        alert("Please enter at least a Title and Password.");
        return;
    }

    const data = { title: t, msg: m, pass: p };
    // Robust encoding for special characters/emojis
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    
    // Build URL safely
    const baseUrl = window.location.href.split('?')[0];
    const finalUrl = baseUrl + '?d=' + encoded;
    
    const output = document.getElementById('link-output');
    const input = document.getElementById('share-url');
    
    input.value = finalUrl;
    output.classList.remove('hidden');
    
    // Scroll to the link
    input.scrollIntoView({ behavior: 'smooth' });
}

function copyLink() {
    const copyText = document.getElementById("share-url");
    copyText.select();
    copyText.setSelectionRange(0, 99999); 
    navigator.clipboard.writeText(copyText.value);
    
    const btn = document.getElementById('copy-btn');
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = "Copy Link", 2000);
}

function startCelebration() {
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('hidden');
    
    document.getElementById('display-title').innerText = CONFIG.title;
    document.getElementById('display-msg').innerText = CONFIG.msg;
    
    const bg = document.getElementById('landing-bg');
    bg.style.backgroundImage = "url('assets/photo1.jpg')";
    
    document.getElementById('landing-screen').classList.remove('hidden');
    document.getElementById('landing-screen').classList.add('active');
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
        setTimeout(() => input.parentElement.classList.remove('shake'), 400);
    }
}

function switchScreen(oldId, newId) {
    document.getElementById(oldId).classList.remove('active');
    setTimeout(() => {
        document.getElementById(oldId).classList.add('hidden');
        document.getElementById(newId).classList.remove('hidden');
        document.getElementById(newId).classList.add('active');
    }, 500);
}

// Slider
let currentSlide = 0;
function moveSlide(step) {
    const wrapper = document.getElementById('slider-wrapper');
    currentSlide = (currentSlide + step + 3) % 3;
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
}
setInterval(() => moveSlide(1), 4000);

// Game
let score = 0;
function initGame() {
    const target = document.getElementById('target');
    const move = () => {
        const area = document.getElementById('game-area');
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
    setInterval(move, 1500);
}

function imgError(img) {
    const parent = img.parentElement;
    parent.style.background = "linear-gradient(45deg, #ff758f, #ffafbd)";
    parent.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:50px">💝</div>';
}
