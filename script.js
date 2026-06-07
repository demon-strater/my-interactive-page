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
    const particleFrame = document.querySelector('.particle-frame');
    const renaissanceFrame = document.querySelector('.renaissance-frame');
    const baroqueFrame = document.querySelector('.baroque-frame');
    const romanticismFrame = document.querySelector('.romanticism-frame');
    const impressionismTimeFrame = document.querySelector('.impressionism-time-frame');

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
            label: 'Surrealist Sequence'
        }
    ];

    const tracks = {
        morning: {
            title: 'Morning Music',
            info: 'Bright dream image',
            tag: 'Morning',
            audio: morningMusic
        },
        night: {
            title: 'Night Music',
            info: 'Dark dream image',
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
    let carouselTargetOffset = 0;
    let scrollSnapTimer = null;

    const interactions = [
        { hour: 1, title: 'RENAISSANCE', meta: 'c. 1400-1600', status: 'Available', site: 'renaissance', top: '#c8a86b', bottom: '#3a2510' },
        { hour: 2, title: 'SURREALISM', meta: '1924-1966', status: 'Available', site: 'impressionism', top: '#ff7a59', bottom: '#77325f' },
        { hour: 3, title: 'BAUHAUS', meta: '1919-1933', status: 'Coming soon', top: '#f5c84b', bottom: '#283c8f' },
        { hour: 4, title: 'IMPRESSIONISM', meta: 'c. 1874-1886', status: 'Available', site: 'impressionism-time', top: '#a5d96a', bottom: '#4b8aa0' },
        { hour: 5, title: 'ROMANTICISM', meta: 'c. 1798-1850', status: 'Available', site: 'romanticism', top: '#6b7f99', bottom: '#07101c' }
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

    function recenterCarouselOffsets(cardCount) {
        const limit = cardCount * 40;

        if (Math.abs(carouselOffset) < limit && Math.abs(carouselTargetOffset) < limit) {
            return;
        }

        const shift = Math.round(carouselOffset / cardCount) * cardCount;
        carouselOffset -= shift;
        carouselTargetOffset -= shift;
    }

    function smoothstep(edge0, edge1, value) {
        const span = edge1 - edge0;
        if (span === 0) {
            return value >= edge1 ? 1 : 0;
        }

        const t = Math.max(0, Math.min(1, (value - edge0) / span));
        return t * t * (3 - 2 * t);
    }

    function updateTimelineState() {
        timelineFrame = null;

        if (!body.classList.contains('view-hub')) {
            return;
        }

        const cardCount = timelineCards.length;
        recenterCarouselOffsets(cardCount);

        if (!isTimelineDragging) {
            const distanceToTarget = carouselTargetOffset - carouselOffset;
            carouselOffset += distanceToTarget * 0.12;

            if (Math.abs(distanceToTarget) < 0.0008) {
                carouselOffset = carouselTargetOffset;
            }
        }

        const railRect = timelineRail.getBoundingClientRect();
        const compactScreen = window.matchMedia('(max-width: 900px), (max-height: 820px)').matches;
        const radiusX = compactScreen
            ? Math.min(railRect.width * 0.34, Math.max(railRect.width * 0.29, 230))
            : Math.max(railRect.width * 0.4, 370);
        const radiusY = compactScreen
            ? Math.max(railRect.height * 0.76, 500)
            : Math.max(railRect.height * 0.84, 640);
        const activeIndex = ((Math.round(carouselOffset) % cardCount) + cardCount) % cardCount;

        timelineCards.forEach((card, index) => {
            const angle = Math.PI - ((index - carouselOffset) / cardCount) * Math.PI * 2;
            const baseX = Math.cos(angle) * radiusX;
            const rightLift = baseX * 0.58 * smoothstep(0, radiusX * 0.92, baseX);
            const x = baseX + rightLift;
            const y = Math.sin(angle) * radiusY + (compactScreen ? 98 : 190);
            const front = (1 - Math.cos(angle)) / 2;
            const easedFront = front * front * (3 - 2 * front);
            const tilt = Math.sin(angle) * -5;

            card.style.setProperty('--card-x', `${x.toFixed(1)}px`);
            card.style.setProperty('--card-y', `${y.toFixed(1)}px`);
            card.style.setProperty('--card-scale', (0.26 + easedFront * 0.78).toFixed(3));
            card.style.setProperty('--card-gray', (0.76 - easedFront * 0.76).toFixed(3));
            card.style.setProperty('--card-saturation', (0.45 + easedFront * 0.9).toFixed(3));
            card.style.setProperty('--card-opacity', (0.2 + easedFront * 0.8).toFixed(3));
            card.style.setProperty('--card-rotate', `${tilt.toFixed(2)}deg`);
            card.style.zIndex = String(Math.round(easedFront * 1000));
        });

        selectedHour = Number(timelineCards[activeIndex].dataset.hour);
        const interaction = selectedInteraction();

        featureHour.textContent = interaction.hour.toString().padStart(2, '0');
        featureTitle.textContent = interaction.title;
        featureMeta.textContent = interaction.meta;
        if (timelineHand) {
            timelineHand.style.transform = `translateX(-50%) rotate(${selectedHour * 30}deg)`;
        }

        timelineCards.forEach(card => {
            card.classList.toggle('active', Number(card.dataset.hour) === selectedHour);
        });

        if (!isTimelineDragging && Math.abs(carouselTargetOffset - carouselOffset) > 0.0008) {
            requestTimelineState();
        }
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
        const currentIndex = ((Math.round(carouselTargetOffset) % cardCount) + cardCount) % cardCount;
        let delta = cardIndex - currentIndex;

        if (delta > cardCount / 2) {
            delta -= cardCount;
        } else if (delta < -cardCount / 2) {
            delta += cardCount;
        }

        carouselTargetOffset -= delta;
        requestTimelineState();
    }

    function openCard(card) {
        const interactionHour = Number(card.dataset.hour);
        const interaction = interactions.find(item => item.hour === interactionHour) || interactions[0];
        selectedHour = interactionHour;

        if (interaction.site) {
            openInteraction(card, interaction);
        } else {
            rotateCardToFront(card);
        }
    }

    function parseCssUrl(value) {
        const match = value.match(/url\(["']?(.+?)["']?\)/);
        return match ? match[1] : '';
    }

    function loadImageSize(src) {
        return new Promise(resolve => {
            if (!src) {
                resolve(null);
                return;
            }

            const image = new Image();
            image.onload = () => resolve({
                width: image.naturalWidth || image.width,
                height: image.naturalHeight || image.height
            });
            image.onerror = () => resolve(null);
            image.src = src;
        });
    }

    function containRect(bounds, ratio) {
        if (!ratio || !Number.isFinite(ratio)) {
            return bounds;
        }

        const boundsRatio = bounds.width / bounds.height;
        let width = bounds.width;
        let height = bounds.height;

        if (boundsRatio > ratio) {
            width = height * ratio;
        } else {
            height = width / ratio;
        }

        return {
            left: bounds.left + (bounds.width - width) / 2,
            top: bounds.top + (bounds.height - height) / 2,
            width,
            height
        };
    }

    async function createArtworkTransition(card) {
        const cardStyle = window.getComputedStyle(card);
        const cardRect = card.getBoundingClientRect();
        const artImage = cardStyle.getPropertyValue('--art-image').trim();
        const isArtCard = artImage && artImage !== 'none';
        const imageSrc = parseCssUrl(artImage);
        const imageSize = await loadImageSize(imageSrc);
        const imageRatio = imageSize ? imageSize.width / imageSize.height : null;
        const sourceBounds = isArtCard
            ? {
                left: cardRect.left,
                top: cardRect.top,
                width: cardRect.width * 0.64,
                height: cardRect.height
            }
            : {
                left: cardRect.left,
                top: cardRect.top,
                width: cardRect.width,
                height: cardRect.height
            };
        const startRect = isArtCard ? containRect(sourceBounds, imageRatio) : sourceBounds;
        const backdrop = document.createElement('div');
        const clone = document.createElement('div');

        backdrop.className = 'artwork-transition-backdrop';
        clone.className = 'artwork-transition-clone';
        clone.style.left = `${startRect.left}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;

        if (isArtCard) {
            clone.style.backgroundImage = artImage;
        } else {
            clone.style.background = cardStyle.backgroundColor || cardStyle.getPropertyValue('--feature-color');
            clone.textContent = card.querySelector('strong')?.textContent || '';
        }

        document.body.append(backdrop, clone);

        requestAnimationFrame(() => {
            backdrop.classList.add('visible');
        });

        return { backdrop, clone, imageRatio };
    }

    function getInteractionArtworkRect(interaction) {
        if (interaction.site === 'impressionism') {
            return document.querySelector('.impressionism-site .window-reveal')?.getBoundingClientRect();
        }

        if (interaction.site === 'impressionism-time' && impressionismTimeFrame) {
            try {
                const frameRect = impressionismTimeFrame.getBoundingClientRect();
                const imageShell = impressionismTimeFrame.contentDocument?.querySelector('.image-shell');

                if (imageShell) {
                    const imageRect = imageShell.getBoundingClientRect();
                    return {
                        left: frameRect.left + imageRect.left,
                        top: frameRect.top + imageRect.top,
                        width: imageRect.width,
                        height: imageRect.height
                    };
                }

                return frameRect;
            } catch (error) {
                return impressionismTimeFrame.getBoundingClientRect();
            }
        }

        const activeContent = document.querySelector(`.view-${interaction.site} .interaction-content, body.view-${interaction.site} .interaction-content`);
        const fallbackRect = activeContent?.getBoundingClientRect();
        const targetWidth = Math.min(window.innerWidth * 0.64, 920);
        const targetHeight = Math.min(window.innerHeight * 0.72, 680);

        return fallbackRect || {
            left: (window.innerWidth - targetWidth) / 2,
            top: (window.innerHeight - targetHeight) / 2,
            width: targetWidth,
            height: targetHeight
        };
    }

    function moveCloneToRect(clone, rect) {
        clone.classList.add('settled');
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
    }

    function revealInteraction(interaction) {
        body.classList.remove('view-hub');
        body.classList.remove('view-impressionism', 'view-particle', 'view-schema-architecture', 'view-fluid-collision', 'view-renaissance', 'view-baroque', 'view-romanticism', 'view-impressionism-time');
        body.classList.add('view-interaction', `view-${interaction.site}`);

        if (interaction.site === 'impressionism') {
            updateScenes();
        } else {
            pauseAllMusic();
            body.classList.remove('night-background');

            if (interaction.site === 'particle') {
                resetParticleFrame();
            }

            if (interaction.site === 'renaissance') {
                resetRenaissanceFrame();
            }

            if (interaction.site === 'baroque') {
                resetBaroqueFrame();
            }

            if (interaction.site === 'romanticism') {
                resetRomanticismFrame();
            }

            if (interaction.site === 'impressionism-time') {
                resetImpressionismTimeFrame();
            }
        }
    }

    function openInteraction(card, interaction) {
        if (isInteractionOpening || body.classList.contains('view-interaction')) {
            return;
        }

        isInteractionOpening = true;
        card.classList.add('transition-source');
        body.classList.add('artwork-opening');
        createArtworkTransition(card).then(transition => {
            if (!isInteractionOpening) {
                transition.backdrop.remove();
                transition.clone.remove();
                return;
            }

            setTimeout(() => {
                revealInteraction(interaction);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const targetRect = containRect(getInteractionArtworkRect(interaction), transition.imageRatio);
                        moveCloneToRect(transition.clone, targetRect);
                    });
                });

                setTimeout(() => {
                    body.classList.add('artwork-arrived');
                    transition.backdrop.classList.add('leaving');
                    transition.clone.classList.add('leaving');

                    setTimeout(() => {
                        transition.backdrop.remove();
                        transition.clone.remove();
                        card.classList.remove('transition-source');
                        body.classList.remove('artwork-opening', 'artwork-arrived');
                        isInteractionOpening = false;
                    }, 620);
                }, 860);
            }, 520);
        });
    }

    function resetRenaissanceFrame() {
        if (!renaissanceFrame) {
            return;
        }

        const sendResize = () => {
            try {
                renaissanceFrame.contentWindow?.postMessage('renaissance:resize', '*');
            } catch (error) {
                console.error('Renaissance resize failed:', error);
            }
        };

        if (!renaissanceFrame.src) {
            renaissanceFrame.addEventListener('load', sendResize, { once: true });
            renaissanceFrame.src = renaissanceFrame.dataset.src || 'renaissance.html';
            return;
        }

        if (renaissanceFrame.contentWindow) {
            sendResize();
            setTimeout(sendResize, 120);
            setTimeout(sendResize, 360);
        }

        requestAnimationFrame(sendResize);
    }

    function resetParticleFrame() {
        if (!particleFrame) {
            return;
        }

        requestAnimationFrame(() => {
            try {
                particleFrame.contentWindow?.postMessage({ type: 'particle:reset' }, '*');
            } catch (error) {
                console.error('Particle reset failed:', error);
            }
        });
    }

    function resetBaroqueFrame() {
        if (!baroqueFrame) {
            return;
        }

        baroqueFrame.src = baroqueFrame.dataset.src || 'baroque.html';
    }

    function resetRomanticismFrame() {
        if (!romanticismFrame) {
            return;
        }

        romanticismFrame.src = romanticismFrame.dataset.src || 'romanticism.html';
    }

    function resetImpressionismTimeFrame() {
        if (!impressionismTimeFrame) {
            return;
        }

        impressionismTimeFrame.src = impressionismTimeFrame.dataset.src || 'impressionism.html';
    }

    function closeInteraction() {
        pauseAllMusic();
        body.classList.remove('view-interaction', 'view-impressionism', 'view-particle', 'view-schema-architecture', 'view-fluid-collision', 'view-renaissance', 'view-baroque', 'view-romanticism', 'view-impressionism-time', 'night-background');
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
        const rawDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        // 기기별 deltaY 편차 제한 (트랙패드/마우스 동일 감도 보장)
        const capped = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), 120);
        carouselTargetOffset -= capped * 0.003;
        recenterCarouselOffsets(timelineCards.length);
        requestTimelineState();

        // 스크롤 멈춘 후 가장 가까운 카드 위치로 스냅
        clearTimeout(scrollSnapTimer);
        scrollSnapTimer = setTimeout(() => {
            carouselTargetOffset = Math.round(carouselTargetOffset);
            requestTimelineState();
        }, 180);
    }, { passive: false });

    timelineRail.addEventListener('pointerdown', event => {
        isTimelineDragging = true;
        hasTimelineDragged = false;
        timelineStartX = event.clientX;
        timelineStartOffset = carouselTargetOffset;
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

        carouselTargetOffset = timelineStartOffset + distance * 0.01;
        carouselOffset = carouselTargetOffset;
        recenterCarouselOffsets(timelineCards.length);
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
