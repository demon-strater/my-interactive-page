document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    const pullChain = document.getElementById('pullChain');
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    const body = document.body;
    const playPauseBtn = document.getElementById('playPauseBtn');
    const trackInfo = document.getElementById('trackInfo');

    const scenes = {
        morning: document.getElementById('morningScene'),
        night: document.getElementById('nightScene'),
        vincentMorning: document.getElementById('vincentMorningScene'),
        vincentNight: document.getElementById('vincentNightScene')
    };

    // Audio objects
    const clickSound = new Audio('music/swich.mp3');
    clickSound.volume = 0.5;
    clickSound.load();

    const morningMusic = new Audio('music/morning music.mp3');
    morningMusic.loop = true;
    morningMusic.volume = 0.4;
    morningMusic.load();

    const nightMusic = new Audio('music/night music.mp3');
    nightMusic.loop = true;
    nightMusic.volume = 0.4;
    nightMusic.load();

    const plingSound = new Audio('music/Pling.mp3');
    plingSound.volume = 0.6;
    plingSound.load();

    // State variables
    const imageSets = [
        { morning: scenes.morning, night: scenes.night },
        { morning: scenes.vincentMorning, night: scenes.vincentNight }
    ];
    let currentSetIndex = 0;
    let isNight = false;
    let isMusicPlaying = false;

    // --- Functions ---

    function playClickSound() {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Audio play failed:", e));
    }

    function playPlingSound() {
        plingSound.currentTime = 0;
        plingSound.play().catch(e => console.error("Pling sound play failed:", e));
    }

    function managePlayback() {
        const activeTrack = isNight ? nightMusic : morningMusic;
        const inactiveTrack = isNight ? morningMusic : nightMusic;

        inactiveTrack.pause();
        inactiveTrack.currentTime = 0;

        if (isMusicPlaying) {
            activeTrack.play().catch(e => console.error("Music play failed:", e));
            playPauseBtn.innerHTML = '❚❚';
            playPauseBtn.style.paddingLeft = '0px'; // Reset padding for pause icon
        } else {
            activeTrack.pause();
            playPauseBtn.innerHTML = '▶';
            playPauseBtn.style.paddingLeft = '4px'; // Re-apply padding for play icon
        }
    }

    function updateTrackInfo() {
        const trackName = isNight ? "Night Music" : "Morning Music";
        const color = isNight ? "#fff" : "#333";
        trackInfo.textContent = trackName;
        trackInfo.style.color = color;
        playPauseBtn.style.color = color;
    }

    function updateScenes() {
        // Hide all scenes first
        for (const key in scenes) {
            scenes[key].style.opacity = 0;
        }

        const currentSet = imageSets[currentSetIndex];

        if (isNight) {
            currentSet.morning.style.opacity = 0;
            currentSet.night.style.opacity = 1;document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    const pullChain = document.getElementById('pullChain');
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    const glassPanel = document.querySelector('.glass-panel');
    const body = document.body;
    const playPauseBtn = document.getElementById('playPauseBtn');
    const trackInfo = document.getElementById('trackInfo');

    const scenes = {
        morning: document.getElementById('morningScene'),
        night: document.getElementById('nightScene'),
        vincentMorning: document.getElementById('vincentMorningScene'),
        vincentNight: document.getElementById('vincentNightScene')
    };

    // Audio objects
    const clickSound = new Audio('music/swich.mp3');
    clickSound.volume = 0.5;
    clickSound.load();

    const morningMusic = new Audio('music/morning music.mp3');
    morningMusic.loop = true;
    morningMusic.volume = 0.4;
    morningMusic.load();

    const nightMusic = new Audio('music/night music.mp3');
    nightMusic.loop = true;
    nightMusic.volume = 0.4;
    nightMusic.load();

    const plingSound = new Audio('music/Pling.mp3');
    plingSound.volume = 0.6;
    plingSound.load();

    // State variables
    const imageSets = [
        { morning: scenes.morning, night: scenes.night },
        { morning: scenes.vincentMorning, night: scenes.vincentNight }
    ];
    let currentSetIndex = 0;
    let isNight = false;
    let isMusicPlaying = false;

    // --- Functions ---

    function playClickSound() {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Audio play failed:", e));
    }

    function playPlingSound() {
        plingSound.currentTime = 0;
        plingSound.play().catch(e => console.error("Pling sound play failed:", e));
    }

    function managePlayback() {
        const activeTrack = isNight ? nightMusic : morningMusic;
        const inactiveTrack = isNight ? morningMusic : nightMusic;

        inactiveTrack.pause();
        inactiveTrack.currentTime = 0;

        if (isMusicPlaying) {
            activeTrack.play().catch(e => console.error("Music play failed:", e));
            playPauseBtn.innerHTML = '❚❚';
            playPauseBtn.style.paddingLeft = '0px'; // Reset padding for pause icon
        } else {
            activeTrack.pause();
            playPauseBtn.innerHTML = '▶';
            playPauseBtn.style.paddingLeft = '4px'; // Re-apply padding for play icon
        }
    }

    function updateTrackInfo() {
        const trackName = isNight ? "Night Music" : "Morning Music";
        const color = isNight ? "#fff" : "#333";
        trackInfo.textContent = trackName;
        trackInfo.style.color = color;
        playPauseBtn.style.color = color;
    }

    function updateScenes() {
        // Hide all scenes first
        for (const key in scenes) {
            scenes[key].style.opacity = 0;
        }

        const currentSet = imageSets[currentSetIndex];

        if (isNight) {
            currentSet.morning.style.opacity = 0;
            currentSet.night.style.opacity = 1;
            body.classList.add('night-background');
            pullChain.classList.remove('black-cord');
        } else {
            currentSet.morning.style.opacity = 1;
            currentSet.night.style.opacity = 0;
            body.classList.remove('night-background');
            pullChain.classList.add('black-cord');
        }
        
        updateTrackInfo();
        managePlayback();
    }

    function goLeft() {
        playPlingSound();
        currentSetIndex = (currentSetIndex - 1 + imageSets.length) % imageSets.length;
        isNight = false;
        updateScenes();
    }

    function goRight() {
        playPlingSound();
        currentSetIndex = (currentSetIndex + 1) % imageSets.length;
        isNight = false;
        updateScenes();
    }

    // --- Event Listeners ---

    playPauseBtn.addEventListener('click', () => {
        isMusicPlaying = !isMusicPlaying;
        managePlayback();
    });

    pullChain.addEventListener('click', () => {
        playClickSound();
        isNight = !isNight;

        pullChain.classList.add('pulled');
        setTimeout(() => pullChain.classList.remove('pulled'), 150);
        setTimeout(updateScenes, 500);
    });

    leftArrow.addEventListener('click', goLeft);
    rightArrow.addEventListener('click', goRight);

    // Swipe listener
    const listener = SwipeListener(glassPanel);
    glassPanel.addEventListener('swipe', function (e) {
        const directions = e.detail.directions;
        if (directions.left) {
            goRight();
        }
        if (directions.right) {
            goLeft();
        }
    });

    // --- Initial State ---
    updateScenes();
});
