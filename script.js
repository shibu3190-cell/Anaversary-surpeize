// CONFIG will be populated from URL
let CONFIG = { title: "", msg: "", pass: "" };

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('data')) {
        try {
            // Decode the data from the URL
            const decoded = JSON.parse(atob(params.get('data')));
            CONFIG = decoded;
            startCelebration();
        } catch (e) {
            console.error("Invalid Link");
        }
    }
});

function generateLink() {
    const data = {
        title: document.getElementById('setup-title').value,
        msg: document.getElementById('setup-msg').value,
        pass: document.getElementById('setup-pass').value
    };
    
    if(!data.title || !data.pass) return alert("Please fill title and password");

    const encoded = btoa(JSON.stringify(data));
    const url = window.location.origin + window.location.pathname + '?data=' + encoded;
    
    document.getElementById('share-url').value = url;
    document.getElementById('link-output').classList.remove('hidden');
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
        const x = Math.random() * (document.getElementById('game-area').clientWidth - 44);
        const y = Math.random() * (document.getElementById('game-area').clientHeight - 44);
        target.style.left = x + 'px';
        target.style.top = y + 'px';
    };
    target.onclick = (e) => {
        score++;
        document.getElementById('score').innerText = score;
        if(score >= 10) document.getElementById('win-overlay').classList.remove('hidden');
        move();
    };
    setInterval(move, 1500);
}

function imgError(img) {
    img.parentElement.style.background = "linear-gradient(45deg, #ff758f, #ffafbd)";
    img.parentElement.innerHTML += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px">💝</div>';
    img.style.display = 'none';
}
