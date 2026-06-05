document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const timelineRail = document.querySelector('.timeline-rail');
    const timelineTrack = document.getElementById('timelineTrack');
    const timelineCards = document.querySelectorAll('.timeline-card');
    const timelineHand = document.getElementById('timelineHand');
    const featureHour = document.getElementById('featureHour');
    const featureTitle = document.getElementById('featureTitle');
    const featureMeta = document.getElementById('featureMeta');
    const siteTransition = document.getElementById('siteTransition');
    const transitionPanel = document.getElementById('transitionPanel');
    const transitionHour = document.getElementById('transitionHour');
    const transitionTitle = document.getElementById('transitionTitle');
    const transitionMeta = document.getElementById('transitionMeta');
    const backToShelf = document.getElementById('backToShelf');
    const pullChain = document.getElementById('pullChain');
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const trackTitle = document.getElementById('trackTitle');
    const trackInfo = document.getElementById('trackInfo');
    const albumTag = document.getElementById('albumTag');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const albumArtContainer = document.querySelector('.album-art-container');
    const playlistItems = document.querySelectorAll('.playlist-item');

    const scenes = {
        morning: document.getElementById('morningScene'),
        night: document.getElementById('nightScene'),
        vincentMorning: document.getElementById('vincentMorningScene'),
        vincentNight: document.getElementById('vincentNightScene')
    };

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

    const imageSets = [
        {
            morning: scenes.morning,
            night: scenes.night,
            label: 'Impression Sunrise'
        },
        {
            morning: scenes.vincentMorning,
            night: scenes.vincentNight,
            label: 'Vincent Collection'
        }
    ];

    const tracks = {
        morning: {
            title: 'Morning Music',
            info: 'Soft light, open air',
            tag: 'Morning',
            audio: morningMusic
        },
        night: {
            title: 'Night Music',
            info: 'Deep blue, quiet glow',
            tag: 'Night',
            audio: nightMusic
        }
    };

    let currentSetIndex = 0;
    let isNight = false;
    let isMusicPlaying = false;
    let rafId = null;
    let isInteractionOpening = false;
    let selectedHour = 1;
    let timelineFrame = null;
    let isTimelineDragging = false;
    let hasTimelineDragged = false;
    let timelineStartX = 0;
    let timelineStartOffset = 0;
    let carouselOffset = 0;

    const interactions = [
        { hour: 1, title: 'IMPRESSIONISM', meta: 'Music gallery', status: 'Available', site: 'impressionism', top: '#ff7a59', bottom: '#77325f' },
        { hour: 2, title: 'LIGHT STUDY', meta: 'Light and opacity', status: 'Coming soon', top: '#ffd166', bottom: '#9a5c2e' },
        { hour: 3, title: 'SOUND LOOP', meta: 'Reactive audio sketch', status: 'Coming soon', top: '#54d2c4', bottom: '#23566d' },
        { hour: 4, title: 'MEMORY GRID', meta: 'Pattern recall', status: 'Coming soon', top: '#9b8cff', bottom: '#3f3a7d' },
        { hour: 5, title: 'MOTION TYPE', meta: 'Kinetic typography', status: 'Coming soon', top: '#ff9bb3', bottom: '#7e3652' },
        { hour: 6, title: 'COLOR FIELD', meta: 'Chromatic controls', status: 'Coming soon', top: '#a5e66f', bottom: '#336b4a' },
        { hour: 7, title: 'TEXTURE MAP', meta: 'Surface explorer', status: 'Coming soon', top: '#67e8f9', bottom: '#2563eb' },
        { hour: 8, title: 'TYPE CLOCK', meta: 'Temporal letterforms', status: 'Coming soon', top: '#f0abfc', bottom: '#7c3aed' },
        { hour: 9, title: 'SHADOW ROOM', meta: 'Depth and contrast', status: 'Coming soon', top: '#fb7185', bottom: '#9f1239' },
        { hour: 10, title: 'NOISE BLOOM', meta: 'Generated particles', status: 'Coming soon', top: '#86efac', bottom: '#15803d' },
        { hour: 11, title: 'WAVE INDEX', meta: 'Rhythm interface', status: 'Coming soon', top: '#fde047', bottom: '#ca8a04' },
        { hour: 12, title: 'ORBIT NOTES', meta: 'Circular navigation', status: 'Coming soon', top: '#f97316', bottom: '#7f1d1d' }
    ];

    function activeKey() {
        return isNight ? 'night' : 'morning';
    }

    function activeTrack() {
        return tracks[activeKey()];
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return '0:00';
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    }

    function updateProgress() {
        const audio = activeTrack().audio;
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const percent = duration > 0 ? (audio.currentTime / duration) * 100 : 0;

        progressFill.style.width = `${Math.min(percent, 100)}%`;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        durationTimeEl.textContent = formatTime(duration);

        if (isMusicPlaying) {
            rafId = requestAnimationFrame(updateProgress);
        }
    }

    function stopProgressLoop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function playSound(audio, label) {
        audio.currentTime = 0;
        audio.play().catch(error => console.error(`${label} play failed:`, error));
    }

    function pauseAllMusic() {
        isMusicPlaying = false;
        stopProgressLoop();
        morningMusic.pause();
        nightMusic.pause();
        playPauseBtn.innerHTML = '&#9654;';
        playPauseBtn.setAttribute('aria-label', 'Play');
    }

    function selectedInteraction() {
        return interactions.find(item => item.hour === selectedHour) || interactions[0];
    }

    function updateTimelineState() {
        timelineFrame = null;

        if (!body.classList.contains('view-hub')) {
            return;
        }

        const railRect = timelineRail.getBoundingClientRect();
        const cardCount = timelineCards.length;
        const radiusX = Math.max(railRect.width * 0.62, 460);
        const radiusY = Math.max(railRect.height * 0.58, 340);
        const activeIndex = ((Math.round(carouselOffset) % cardCount) + cardCount) % cardCount;

        timelineCards.forEach((card, index) => {
            const angle = Math.PI - ((index - carouselOffset) / cardCount) * Math.PI * 2;
            const x = Math.cos(angle) * radiusX;
            const y = Math.sin(angle) * radiusY;
            const front = (1 - Math.cos(angle)) / 2;
            const easedFront = front * front * (3 - 2 * front);
            const tilt = Math.sin(angle) * -6;

            card.style.setProperty('--card-x', `${x.toFixed(1)}px`);
            card.style.setProperty('--card-y', `${y.toFixed(1)}px`);
            card.style.setProperty('--card-scale', (0.38 + easedFront * 0.84).toFixed(3));
            card.style.setProperty('--card-gray', (0.78 - easedFront * 0.78).toFixed(3));
            card.style.setProperty('--card-saturation', (0.42 + easedFront * 1.16).toFixed(3));
            card.style.setProperty('--card-opacity', (0.26 + easedFront * 0.74).toFixed(3));
            card.style.setProperty('--card-rotate', `${tilt.toFixed(2)}deg`);
            card.style.zIndex = String(Math.round(easedFront * 1000));
        });

        selectedHour = Number(timelineCards[activeIndex].dataset.hour);
        const interaction = selectedInteraction();

        featureHour.textContent = interaction.hour.toString().padStart(2, '0');
        featureTitle.textContent = interaction.title;
        featureMeta.textContent = interaction.meta;
        timelineHand.style.transform = `translateX(-50%) rotate(${selectedHour * 30}deg)`;

        timelineCards.forEach(card => {
            card.classList.toggle('active', Number(card.dataset.hour) === selectedHour);
        });
    }

    function requestTimelineState() {
        if (timelineFrame) {
            return;
        }

        timelineFrame = requestAnimationFrame(updateTimelineState);
    }

    function rotateCardToFront(card) {
        const cardIndex = Array.from(timelineCards).indexOf(card);

        if (cardIndex < 0) {
            return;
        }

        const cardCount = timelineCards.length;
        const currentIndex = ((Math.round(carouselOffset) % cardCount) + cardCount) % cardCount;
        let delta = cardIndex - currentIndex;

        if (delta > cardCount / 2) {
            delta -= cardCount;
        } else if (delta < -cardCount / 2) {
            delta += cardCount;
        }

        carouselOffset -= delta;
        requestTimelineState();
    }

    function openCard(card) {
        selectedHour = Number(card.dataset.hour);

        if (selectedInteraction().site === 'impressionism') {
            openInteraction(card);
        } else {
            rotateCardToFront(card);
        }
    }

    function openInteraction(card) {
        if (isInteractionOpening || body.classList.contains('view-interaction')) {
            return;
        }

        isInteractionOpening = true;
        const cardStyle = window.getComputedStyle(card);

        transitionPanel.style.setProperty('--transition-color', cardStyle.backgroundColor);
        transitionHour.textContent = card.querySelector('.card-hour')?.textContent || '01';
        transitionTitle.textContent = card.querySelector('strong')?.textContent || 'IMPRESSIONISM';
        transitionMeta.textContent = card.querySelector('small')?.textContent || 'Music gallery';
        siteTransition.classList.add('show');

        setTimeout(() => {
            body.classList.remove('view-hub');
            body.classList.add('view-interaction');
            siteTransition.classList.remove('show');
            isInteractionOpening = false;
            updateScenes();
        }, 680);
    }

    function closeInteraction() {
        pauseAllMusic();
        body.classList.remove('view-interaction', 'night-background');
        body.classList.add('view-hub');
        isNight = false;
        updateScenes();
        requestTimelineState();
    }

    function managePlayback() {
        const current = activeTrack().audio;
        const inactive = isNight ? morningMusic : nightMusic;

        inactive.pause();
        inactive.currentTime = 0;
        stopProgressLoop();

        if (isMusicPlaying) {
            current.play().catch(error => console.error('Music play failed:', error));
            playPauseBtn.innerHTML = '&#10073;&#10073;';
            playPauseBtn.setAttribute('aria-label', 'Pause');
            updateProgress();
        } else {
            current.pause();
            playPauseBtn.innerHTML = '&#9654;';
            playPauseBtn.setAttribute('aria-label', 'Play');
            updateProgress();
        }
    }

    function updateTrackUI() {
        const current = activeTrack();
        const collection = imageSets[currentSetIndex];

        trackTitle.textContent = current.title;
        trackInfo.textContent = `${current.info} - ${collection.label}`;
        albumTag.textContent = current.tag;

        playlistItems.forEach(item => {
            item.classList.toggle('active', item.dataset.track === activeKey());
        });
    }

    function updateScenes() {
        Object.values(scenes).forEach(scene => {
            scene.style.opacity = 0;
        });

        const currentSet = imageSets[currentSetIndex];

        if (isNight) {
            currentSet.night.style.opacity = 1;
            body.classList.add('night-background');
        } else {
            currentSet.morning.style.opacity = 1;
            body.classList.remove('night-background');
        }

        updateTrackUI();
        managePlayback();
    }

    function goLeft() {
        playSound(plingSound, 'Pling sound');
        currentSetIndex = (currentSetIndex - 1 + imageSets.length) % imageSets.length;
        updateScenes();
    }

    function goRight() {
        playSound(plingSound, 'Pling sound');
        currentSetIndex = (currentSetIndex + 1) % imageSets.length;
        updateScenes();
    }

    function setTrack(trackKey) {
        if ((trackKey === 'night') !== isNight) {
            isNight = trackKey === 'night';
            playSound(clickSound, 'Audio');
            pullChain.classList.add('pulled');
            setTimeout(() => pullChain.classList.remove('pulled'), 150);
        }

        updateScenes();
    }

    backToShelf.addEventListener('click', closeInteraction);

    timelineRail.addEventListener('wheel', event => {
        event.preventDefault();
        const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        carouselOffset -= delta * 0.004;
        requestTimelineState();
    }, { passive: false });

    timelineRail.addEventListener('pointerdown', event => {
        isTimelineDragging = true;
        hasTimelineDragged = false;
        timelineStartX = event.clientX;
        timelineStartOffset = carouselOffset;
        timelineRail.classList.add('dragging');
        timelineRail.setPointerCapture(event.pointerId);
    });

    timelineRail.addEventListener('pointermove', event => {
        if (!isTimelineDragging) {
            return;
        }

        const distance = event.clientX - timelineStartX;

        if (Math.abs(distance) > 6) {
            hasTimelineDragged = true;
        }

        carouselOffset = timelineStartOffset + distance * 0.01;
        requestTimelineState();
    });

    timelineRail.addEventListener('pointerup', event => {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const card = target ? target.closest('.timeline-card') : null;

        isTimelineDragging = false;
        timelineRail.classList.remove('dragging');
        timelineRail.releasePointerCapture(event.pointerId);

        if (card && !hasTimelineDragged) {
            openCard(card);
        }

        setTimeout(() => {
            hasTimelineDragged = false;
        }, 120);
    });

    timelineRail.addEventListener('pointercancel', () => {
        isTimelineDragging = false;
        hasTimelineDragged = false;
        timelineRail.classList.remove('dragging');
    });

    timelineCards.forEach(card => {
        card.addEventListener('focus', () => {
            rotateCardToFront(card);
        });
    });

    window.addEventListener('resize', requestTimelineState);

    playPauseBtn.addEventListener('click', () => {
        isMusicPlaying = !isMusicPlaying;
        managePlayback();
    });

    pullChain.addEventListener('click', () => {
        playSound(clickSound, 'Audio');
        isNight = !isNight;
        pullChain.classList.add('pulled');
        setTimeout(() => pullChain.classList.remove('pulled'), 150);
        setTimeout(updateScenes, 280);
    });

    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            setTrack(item.dataset.track);
        });
    });

    [morningMusic, nightMusic].forEach(audio => {
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('timeupdate', updateProgress);
    });

    leftArrow.addEventListener('click', goLeft);
    rightArrow.addEventListener('click', goRight);

    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    albumArtContainer.addEventListener('touchstart', event => {
        touchStartX = event.changedTouches[0].pageX;
    }, { passive: true });

    albumArtContainer.addEventListener('touchend', event => {
        touchEndX = event.changedTouches[0].pageX;

        if (touchEndX < touchStartX - swipeThreshold) {
            goRight();
        } else if (touchEndX > touchStartX + swipeThreshold) {
            goLeft();
        }
    });

    updateScenes();
    requestTimelineState();
});
