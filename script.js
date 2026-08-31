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
    const hubBgTint = document.getElementById('hubBgTint');
    const cinematicStage = document.getElementById('cinematicStage');
    const hubScreen = document.getElementById('hubScreen');
    const interactionScreen = document.getElementById('interactionScreen');

    const hubTintColors = {
        'renaissance-card':  'rgba(205, 158, 64, 0.22)',
        'surrealism-card':   'rgba(48, 74, 152, 0.18)',
        'impressionism-card':'rgba(196, 148, 172, 0.20)',
        'bauhaus-card':      'rgba(208, 58, 38, 0.15)',
        'romanticism-card':  'rgba(108, 130, 152, 0.19)',
    };

    function updateHubTint(card) {
        if (!hubBgTint) return;
        const key = Object.keys(hubTintColors).find(c => card.classList.contains(c));
        hubBgTint.style.backgroundColor = key ? hubTintColors[key] : 'transparent';
    }

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
            title: 'Surreal 1',
            info: 'Surreal image sequence',
            tag: 'Surreal 1',
            audio: morningMusic
        },
        night: {
            title: 'Surreal 2',
            info: 'Surreal image sequence',
            tag: 'Surreal 2',
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
    let pointerDownCardSnapshot = null;
    let timelineStartX = 0;
    let timelineStartOffset = 0;
    let carouselOffset = 0;
    let carouselTargetOffset = 0;
    let lastSelectedHour = -1;
    let themeRevealTimer = null;
    const artworkMoveDuration = 1200;

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

    function triggerThemeReveal(activeCard) {
        if (themeRevealTimer) {
            clearTimeout(themeRevealTimer);
            themeRevealTimer = null;
        }

        timelineCards.forEach(card => card.classList.remove('theme-reveal'));
        activeCard.classList.add('theme-reveal');

        themeRevealTimer = setTimeout(() => {
            activeCard.classList.remove('theme-reveal');
            themeRevealTimer = null;
        }, 760);
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

    function movementKey(title) {
        return String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
            carouselOffset += distanceToTarget * 0.09;

            if (Math.abs(distanceToTarget) < 0.0008) {
                carouselOffset = carouselTargetOffset;
            }
        }

        // The rail lives inside a fixed-ratio 16:9 stage. Using its own layout
        // size keeps the orbit proportional when the browser is letterboxed.
        const railWidth = timelineRail.clientWidth;
        const railHeight = timelineRail.clientHeight;
        const activeIndex = ((Math.round(carouselOffset) % cardCount) + cardCount) % cardCount;
        const radiusX = railWidth * 0.58;
        const radiusY = railHeight * 0.92;
        // Card positions are translated from CSS left: 50%, so a negative offset
        // places the orbit center in the left half of the viewport.
        const orbitCenterX = railWidth * 0.33;
        const orbitCenterY = railHeight * 0.42;

        function wrapDelta(index, offset, count) {
            let delta = index - offset;
            delta = ((delta + count / 2) % count + count) % count - count / 2;
            return delta;
        }

        timelineCards.forEach((card, index) => {
            const angle = Math.PI - ((index - carouselOffset) / cardCount) * Math.PI * 2;
            const baseX = Math.cos(angle) * radiusX;
            const baseY = Math.sin(angle) * radiusY;
            const x = orbitCenterX + baseX;
            const y = orbitCenterY + baseY;
            const front = (1 - Math.cos(angle)) / 2;
            const emphasis = front * front * (3 - 2 * front);
            const scale = 0.2 + emphasis * 0.8;
            const distance = Math.abs(index - carouselOffset);
            const presence = 0.18 + emphasis * 0.82;
            const ribbonTilt = Math.sin(angle) * -6;
            card.style.setProperty('--card-x', `${x.toFixed(1)}px`);
            card.style.setProperty('--card-y', `${y.toFixed(1)}px`);
            card.style.setProperty('--card-scale', scale.toFixed(3));
            card.style.setProperty('--card-scale-x', '1');
            card.style.setProperty('--card-scale-y', '1');
            card.style.setProperty('--art-pan-x', '0px');
            card.style.setProperty('--art-pan-y', '0px');
            card.style.setProperty('--art-scale', '1');
            card.style.setProperty('--card-gray', (0.82 - emphasis * 0.82).toFixed(3));
            card.style.setProperty('--card-saturation', (0.4 + emphasis * 0.95).toFixed(3));
            card.style.setProperty('--card-opacity', Math.min(1, 0.22 + emphasis * 0.78).toFixed(3));
            card.style.setProperty('--card-rotate', `${ribbonTilt.toFixed(2)}deg`);
            card.style.zIndex = String(Math.round(emphasis * 1000));
        });

        selectedHour = Number(timelineCards[activeIndex].dataset.hour);
        const interaction = selectedInteraction();

        if (selectedHour !== lastSelectedHour) {
            lastSelectedHour = selectedHour;
            updateHubTint(timelineCards[activeIndex]);
            triggerThemeReveal(timelineCards[activeIndex]);
        }

        featureHour.textContent = interaction.hour.toString().padStart(2, '0');
        featureTitle.textContent = interaction.title;
        featureMeta.textContent = interaction.meta;
        if (hubScreen) {
            hubScreen.dataset.movement = movementKey(interaction.title);
        }
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

    function openCard(card, snapshot = null) {
        const interactionHour = Number(card.dataset.hour);
        const interaction = interactions.find(item => item.hour === interactionHour) || interactions[0];
        selectedHour = interactionHour;

        if (interaction.site) {
            openInteraction(card, interaction, snapshot);
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

    function containRectWithAngle(bounds, ratio) {
        const contained = containRect(bounds, ratio);
        contained.angle = bounds.angle || 0;
        return contained;
    }

    function readElementAngle(element) {
        if (!element) {
            return 0;
        }

        const transform = window.getComputedStyle(element).transform;
        if (!transform || transform === 'none') {
            return 0;
        }

        try {
            const matrix = new DOMMatrixReadOnly(transform);
            const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
            return Number.isFinite(angle) ? angle : 0;
        } catch (error) {
            return 0;
        }
    }

    function getStageRect() {
        const rect = cinematicStage?.getBoundingClientRect();

        if (rect && rect.width > 0 && rect.height > 0) {
            return rect;
        }

        return {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    function getFallbackArtworkTarget(interaction, imageRatio) {
        const stage = getStageRect();
        const presets = {
            renaissance: { width: 0.58, height: 0.58, x: 0.5, y: 0.48, angle: 0 },
            romanticism: { width: 0.62, height: 0.7, x: 0.5, y: 0.5, angle: 0 },
            particle: { width: 0.7, height: 0.72, x: 0.5, y: 0.5, angle: 0 },
            'fluid-collision': { width: 0.7, height: 0.72, x: 0.5, y: 0.5, angle: 0 }
        };
        const preset = presets[interaction.site] || { width: 0.62, height: 0.66, x: 0.5, y: 0.5, angle: 0 };
        const bounds = {
            left: stage.left + stage.width * (preset.x - preset.width / 2),
            top: stage.top + stage.height * (preset.y - preset.height / 2),
            width: stage.width * preset.width,
            height: stage.height * preset.height,
            angle: preset.angle
        };

        return containRectWithAngle(bounds, imageRatio);
    }

    function rectToArtworkRect(rect, angle = 0) {
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            angle
        };
    }

    function fitRectToRatio(rect, ratio) {
        if (!ratio || !Number.isFinite(ratio) || !rect || rect.width <= 0 || rect.height <= 0) {
            return rect;
        }

        const rectRatio = rect.width / rect.height;
        let width = rect.width;
        let height = rect.height;

        if (rectRatio > ratio) {
            width = height * ratio;
        } else {
            height = width / ratio;
        }

        return {
            left: rect.left + (rect.width - width) / 2,
            top: rect.top + (rect.height - height) / 2,
            width,
            height,
            angle: rect.angle || 0
        };
    }

    function scaleRectFromCenter(rect, scale) {
        if (!rect || !Number.isFinite(scale) || scale <= 0) {
            return rect;
        }

        const width = rect.width * scale;
        const height = rect.height * scale;

        return {
            left: rect.left + (rect.width - width) / 2,
            top: rect.top + (rect.height - height) / 2,
            width,
            height,
            angle: rect.angle || 0
        };
    }

    function readCardScale(card) {
        const value = window.getComputedStyle(card).getPropertyValue('--card-scale').trim();
        const scale = Number.parseFloat(value);
        return Number.isFinite(scale) ? scale : 1;
    }

    function createCardSnapshot(card) {
        const cardStyle = window.getComputedStyle(card);

        return {
            rect: card.getBoundingClientRect(),
            scale: readCardScale(card),
            angle: readElementAngle(card),
            offsetWidth: card.offsetWidth,
            offsetHeight: card.offsetHeight,
            artBgSize: cardStyle.getPropertyValue('--art-bg-size') || 'auto 85%',
            artImage: cardStyle.getPropertyValue('--art-image').trim(),
            backgroundColor: cardStyle.backgroundColor || cardStyle.getPropertyValue('--feature-color'),
            isRenaissance: card.classList.contains('renaissance-card'),
            title: card.querySelector('strong')?.textContent || ''
        };
    }

    function rotatePoint(x, y, degrees) {
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    }

    function parseBackgroundSize(value, boxWidth, boxHeight, imageRatio) {
        const normalized = value.trim();

        if (!imageRatio || !Number.isFinite(imageRatio)) {
            return { width: boxWidth, height: boxHeight };
        }

        if (normalized.includes('72%')) {
            const width = boxWidth * 0.72;
            return { width, height: width / imageRatio };
        }

        const percentMatch = normalized.match(/auto\s+([\d.]+)%/);
        if (percentMatch) {
            const height = boxHeight * (Number.parseFloat(percentMatch[1]) / 100);
            return { width: height * imageRatio, height };
        }

        return containRect({ left: 0, top: 0, width: boxWidth, height: boxHeight }, imageRatio);
    }

    function getArtworkStartRect(snapshot, imageRatio, isArtCard) {
        const cardRect = snapshot.rect;
        const startAngle = snapshot.angle;
        const cardWidth = snapshot.offsetWidth * snapshot.scale;
        const cardHeight = snapshot.offsetHeight * snapshot.scale;
        let artworkWidth = cardWidth;
        let artworkHeight = cardHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (isArtCard && snapshot.isRenaissance) {
            const containerWidth = cardWidth * 0.84;
            const contained = containRect({ left: 0, top: 0, width: containerWidth, height: cardHeight }, imageRatio);
            artworkWidth = contained.width;
            artworkHeight = contained.height;
            offsetX = -cardWidth / 2 + containerWidth / 2;
        } else if (isArtCard) {
            const rendered = parseBackgroundSize(snapshot.artBgSize, cardWidth, cardHeight, imageRatio);
            artworkWidth = rendered.width;
            artworkHeight = rendered.height;
            offsetX = -cardWidth / 2 + artworkWidth / 2;
        }

        const rotatedOffset = rotatePoint(offsetX, offsetY, startAngle);
        const centerX = cardRect.left + cardRect.width / 2 + rotatedOffset.x;
        const centerY = cardRect.top + cardRect.height / 2 + rotatedOffset.y;

        return {
            left: centerX - artworkWidth / 2,
            top: centerY - artworkHeight / 2,
            width: artworkWidth,
            height: artworkHeight
        };
    }

    async function createArtworkTransition(card, snapshot = createCardSnapshot(card)) {
        const artImage = snapshot.artImage;
        const isArtCard = artImage && artImage !== 'none';
        const imageSrc = parseCssUrl(artImage);
        const imageSize = await loadImageSize(imageSrc);
        const imageRatio = imageSize ? imageSize.width / imageSize.height : null;
        const startAngle = snapshot.angle;
        const startRect = getArtworkStartRect(snapshot, imageRatio, isArtCard);
        const backdrop = document.createElement('div');
        const clone = document.createElement(isArtCard && imageSrc ? 'img' : 'div');

        backdrop.className = 'artwork-transition-backdrop';
        clone.className = 'artwork-transition-clone';
        clone.style.left = `${startRect.left}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;
        clone.style.transform = `rotate(${startAngle.toFixed(2)}deg)`;

        if (isArtCard) {
            if (clone instanceof HTMLImageElement) {
                clone.src = imageSrc;
                clone.alt = '';
                clone.decoding = 'async';
            } else {
                clone.style.backgroundImage = artImage;
            }
        } else {
            clone.style.background = snapshot.backgroundColor;
            clone.textContent = snapshot.title;
        }

        cinematicStage.append(backdrop, clone);

        requestAnimationFrame(() => {
            backdrop.classList.add('visible');
        });

        return { backdrop, clone, imageRatio, startRect, startAngle };
    }

    function getInteractionArtworkRect(interaction) {
        const stage = getStageRect();

        if (interaction.site === 'impressionism') {
            const scene = document.querySelector('.impressionism-site .window-reveal .scene');
            const windowReveal = document.querySelector('.impressionism-site .window-reveal');
            const targetElement = scene || windowReveal;

            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        angle: readElementAngle(targetElement)
                    };
                }
            }
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
                        height: imageRect.height,
                        angle: readElementAngle(imageShell)
                    };
                }

                return rectToArtworkRect(frameRect, readElementAngle(impressionismTimeFrame));
            } catch (error) {
                const rect = impressionismTimeFrame.getBoundingClientRect();
                return rectToArtworkRect(rect, readElementAngle(impressionismTimeFrame));
            }
        }

        if (interaction.site === 'renaissance' && renaissanceFrame) {
            const rect = renaissanceFrame.getBoundingClientRect();
            return rectToArtworkRect(rect, readElementAngle(renaissanceFrame));
        }

        if (interaction.site === 'romanticism' && romanticismFrame) {
            const rect = romanticismFrame.getBoundingClientRect();
            return rectToArtworkRect(rect, readElementAngle(romanticismFrame));
        }

        const siteElement = document.querySelector(`.${interaction.site}-site`);
        // If the site has a specific artwork container, use it. 
        // Otherwise use the whole site container but constrained.
        const artworkContainer = siteElement?.querySelector('.window-reveal .scene, .window-reveal, iframe, .player-shell, .artwork-target, .easel');
        const targetElement = artworkContainer || siteElement;
        const rect = targetElement?.getBoundingClientRect();

        if (rect && rect.width > 0 && rect.width < window.innerWidth * 0.96 && rect.height < window.innerHeight * 0.96) {
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                angle: readElementAngle(targetElement)
            };
        }

        return getFallbackArtworkTarget(interaction, null);
    }

    async function moveCloneToRect(clone, startRect, targetRect, targetAngle = 0) {
        if (!targetRect || !Number.isFinite(targetRect.left) || !Number.isFinite(targetRect.top) || !Number.isFinite(targetRect.width) || !Number.isFinite(targetRect.height) || targetRect.width <= 0 || targetRect.height <= 0) {
            targetRect = getFallbackArtworkTarget({ site: 'fallback' }, null);
            targetAngle = 0;
        }

        const fromTransform = clone.style.transform || 'rotate(0deg)';
        const toTransform = `rotate(${targetAngle.toFixed(2)}deg)`;

        clone.getBoundingClientRect();
        clone.classList.add('moving');

        const animation = clone.animate([
            {
                left: `${startRect.left}px`,
                top: `${startRect.top}px`,
                width: `${startRect.width}px`,
                height: `${startRect.height}px`,
                transform: fromTransform
            },
            {
                left: `${targetRect.left}px`,
                top: `${targetRect.top}px`,
                width: `${targetRect.width}px`,
                height: `${targetRect.height}px`,
                transform: toTransform
            }
        ], {
            duration: artworkMoveDuration,
            easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
            fill: 'forwards'
        });

        try {
            await animation.finished;
        } catch (error) {
            // If the animation is interrupted, still place the artwork at the target.
        }

        clone.style.left = `${targetRect.left}px`;
        clone.style.top = `${targetRect.top}px`;
        clone.style.width = `${targetRect.width}px`;
        clone.style.height = `${targetRect.height}px`;
        clone.style.transform = toTransform;
    }

    async function moveCloneToArtworkRect(clone, transition, targetRect) {
        const startRect = fitRectToRatio(transition.startRect, transition.imageRatio);
        const fittedTargetRect = fitRectToRatio(scaleRectFromCenter(targetRect, 0.7), transition.imageRatio);
        fittedTargetRect.top -= targetRect.height * 0.07;
        return moveCloneToRect(clone, startRect, fittedTargetRect, fittedTargetRect.angle || 0);
    }

    function revealInteraction(interaction) {
        if (!body.classList.contains('artwork-opening')) {
            body.classList.remove('view-hub');
        }

        body.classList.remove('measuring');
        body.classList.remove('view-impressionism', 'view-particle', 'view-schema-architecture', 'view-fluid-collision', 'view-renaissance', 'view-baroque', 'view-romanticism', 'view-impressionism-time');
        body.classList.add('view-interaction', `view-${interaction.site}`);

        if (interaction.site === 'impressionism') {
            isNight = false;
            // No longer auto-triggering music here
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

    function updateSiteTransition(interaction) {
        featureHour.textContent = String(interaction.hour).padStart(2, '0');
        featureTitle.textContent = interaction.title;
        featureMeta.textContent = interaction.meta;
        siteTransition.style.setProperty('--transition-color', interaction.top || '#405478');
        siteTransition.style.setProperty('--transition-color-deep', interaction.bottom || '#111827');
    }

    async function openInteraction(card, interaction, snapshot = null) {
        if (isInteractionOpening || body.classList.contains('view-interaction')) {
            return;
        }

        isInteractionOpening = true;
        card.classList.add('transition-source');
        updateSiteTransition(interaction);

        // Pre-load iframes immediately
        if (interaction.site === 'impressionism-time' && impressionismTimeFrame && !impressionismTimeFrame.src) {
            impressionismTimeFrame.src = impressionismTimeFrame.dataset.src || 'impressionism.html';
        }

        if (interaction.site === 'impressionism') {
            isNight = false;
            isMusicPlaying = false; // Ensure it's false during transition
            nightMusic.pause();
            nightMusic.currentTime = 0;
        }

        // Phase 1: let the selected movement's color fill the stage.
        siteTransition.classList.remove('leaving');
        siteTransition.classList.add('show');
        body.classList.add('artwork-opening');

        // Phase 2: swap content once the color veil covers the stage.
        setTimeout(() => {
            // The site is revealed behind the movement-colored veil.
            body.classList.add('view-interaction', `view-${interaction.site}`);
            revealInteraction(interaction);
            requestAnimationFrame(() => body.classList.add('site-revealing'));

            // Phase 3: dissolve the veil into the site.
            setTimeout(() => {
                siteTransition.classList.add('leaving');
            }, 50);

            // Phase 4: Final cleanup
            setTimeout(() => {
                siteTransition.classList.remove('show', 'leaving');
                card.classList.remove('transition-source');
                body.classList.remove('view-hub', 'artwork-opening', 'artwork-arrived', 'site-revealing');
                isInteractionOpening = false;

                // Play music only after the interaction site is fully revealed
                if (interaction.site === 'impressionism') {
                    isMusicPlaying = true;
                    updateScenes(); // This triggers managePlayback() -> audio.play()
                }
            }, 900);

        }, 450); // Slightly more than the 400ms CSS transition
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

        if (!impressionismTimeFrame.src) {
            impressionismTimeFrame.src = impressionismTimeFrame.dataset.src || 'impressionism.html';
        }
    }

    function closeInteraction() {
        pauseAllMusic();
        body.classList.remove('view-interaction', 'view-impressionism', 'view-particle', 'view-schema-architecture', 'view-fluid-collision', 'view-renaissance', 'view-baroque', 'view-romanticism', 'view-impressionism-time', 'night-background');
        body.classList.remove('artwork-opening', 'artwork-arrived');
        body.classList.add('view-hub');
        isNight = false;
        isInteractionOpening = false;
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
        carouselTargetOffset -= capped * 0.00135;
        recenterCarouselOffsets(timelineCards.length);
        requestTimelineState();

    }, { passive: false });

    timelineRail.addEventListener('pointerdown', event => {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const card = target ? target.closest('.timeline-card') : null;

        isTimelineDragging = true;
        hasTimelineDragged = false;
        pointerDownCardSnapshot = card ? { card, snapshot: createCardSnapshot(card) } : null;
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

        carouselTargetOffset = timelineStartOffset + distance * 0.0068;
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
            const snapshot = pointerDownCardSnapshot?.card === card ? pointerDownCardSnapshot.snapshot : createCardSnapshot(card);
            openCard(card, snapshot);
        }

        pointerDownCardSnapshot = null;

        setTimeout(() => {
            hasTimelineDragged = false;
        }, 120);
    });

    timelineRail.addEventListener('pointercancel', () => {
        isTimelineDragging = false;
        hasTimelineDragged = false;
        pointerDownCardSnapshot = null;
        timelineRail.classList.remove('dragging');
    });

    timelineCards.forEach(card => {
        card.addEventListener('focus', () => {
            rotateCardToFront(card);
        });
    });

    // Hand tracking is isolated in hand-tracking.js and communicates through
    // these events so mouse, touch and wheel controls continue to work.
    window.addEventListener('handnavigate', event => {
        if (!body.classList.contains('view-hub') || isInteractionOpening) return;
        carouselTargetOffset += Number(event.detail?.delta || 0);
        recenterCarouselOffsets(timelineCards.length);
        requestTimelineState();
    });

    window.addEventListener('handhome', () => {
        if (!body.classList.contains('view-hub')) closeInteraction();
    });

    window.addEventListener('handback', () => {
        if (!body.classList.contains('view-hub')) closeInteraction();
    });

    let handPointerTarget = null;
    let handHoverCandidate = null;
    let handHoverCandidateSince = 0;
    let handHoverTarget = null;
    let handDidDrag = false;
    let handScrollLastY = null;
    const handHoverDwellMs = 120;

    function nearbyInteractiveTarget(targetDocument, x, y, radius = 56) {
        const interactiveSelector = 'button, a, input, select, textarea, [role="button"], [tabindex], canvas';
        const offsets = [
            [0, 0], [-radius, 0], [radius, 0], [0, -radius], [0, radius],
            [-radius * 0.7, -radius * 0.7], [radius * 0.7, -radius * 0.7],
            [-radius * 0.7, radius * 0.7], [radius * 0.7, radius * 0.7]
        ];
        let exactTarget = null;

        for (const [offsetX, offsetY] of offsets) {
            const element = targetDocument.elementFromPoint(x + offsetX, y + offsetY);
            if (!exactTarget) exactTarget = element;
            const interactive = element?.closest?.(interactiveSelector);
            if (interactive) return interactive;
        }

        return exactTarget || targetDocument.body;
    }

    function handEventTarget(screenX, screenY) {
        const topElement = document.elementFromPoint(screenX, screenY);
        if (!topElement) return null;

        if (topElement instanceof HTMLIFrameElement) {
            try {
                const frameRect = topElement.getBoundingClientRect();
                const frameWindow = topElement.contentWindow;
                const frameDocument = topElement.contentDocument;
                if (!frameWindow || !frameDocument) return null;
                const x = (screenX - frameRect.left) * (frameWindow.innerWidth / frameRect.width);
                const y = (screenY - frameRect.top) * (frameWindow.innerHeight / frameRect.height);
                const radius = 56 * (frameWindow.innerWidth / frameRect.width);
                return { target: nearbyInteractiveTarget(frameDocument, x, y, radius), view: frameWindow, x, y };
            } catch (error) {
                return null;
            }
        }

        return { target: nearbyInteractiveTarget(document, screenX, screenY), view: window, x: screenX, y: screenY };
    }

    function dispatchHandEvent(destination, type, EventClass, buttons) {
        if (!destination?.target) return;
        const EventConstructor = destination.view[EventClass] || window[EventClass];
        destination.target.dispatchEvent(new EventConstructor(type, {
            bubbles: true,
            cancelable: true,
            view: destination.view,
            clientX: destination.x,
            clientY: destination.y,
            button: 0,
            buttons,
            pointerId: 91,
            pointerType: 'touch',
            isPrimary: true
        }));
    }

    function sameHandTarget(first, second) {
        return Boolean(first && second && first.target === second.target && first.view === second.view);
    }

    function ensureHandFeedbackStyles(targetDocument) {
        if (targetDocument.getElementById('hand-feedback-styles')) return;
        const style = targetDocument.createElement('style');
        style.id = 'hand-feedback-styles';
        style.textContent = `
            .hand-hover-target:not(canvas):not(body) {
                outline: 2px solid rgba(215, 181, 124, 0.9) !important;
                outline-offset: 5px !important;
                filter: brightness(1.06) !important;
            }
            .hand-commit-target:not(canvas):not(body) {
                outline: 3px solid rgba(255, 244, 222, 0.96) !important;
                outline-offset: 3px !important;
                filter: brightness(1.12) !important;
            }
        `;
        targetDocument.head?.appendChild(style);
    }

    function clearHandTargetFeedback(destination, className) {
        destination?.target?.classList?.remove(className);
    }

    function setStableHandTarget(destination, now) {
        const cursor = document.getElementById('handCursor');
        if (!sameHandTarget(destination, handHoverCandidate)) {
            handHoverCandidate = destination;
            handHoverCandidateSince = now;
            if (!sameHandTarget(destination, handHoverTarget)) {
                clearHandTargetFeedback(handHoverTarget, 'hand-hover-target');
                handHoverTarget = null;
                cursor?.classList.remove('has-target');
            }
            return;
        }

        if (!handHoverTarget && now - handHoverCandidateSince >= handHoverDwellMs) {
            handHoverTarget = destination;
            ensureHandFeedbackStyles(destination.view.document);
            destination.target.classList?.add('hand-hover-target');
            cursor?.classList.add('has-target');
        }
    }

    function resetHandTargeting() {
        clearHandTargetFeedback(handHoverTarget, 'hand-hover-target');
        clearHandTargetFeedback(handPointerTarget, 'hand-commit-target');
        handHoverCandidate = null;
        handHoverTarget = null;
        handHoverCandidateSince = 0;
        handDidDrag = false;
        document.getElementById('handCursor')?.classList.remove('has-target', 'is-committed', 'is-dragging');
    }

    window.addEventListener('handpointer', event => {
        if (body.classList.contains('view-hub')) {
            handScrollLastY = null;
        }
        const detail = event.detail;
        const currentTarget = handEventTarget(detail.x, detail.y);
        const gestureEvents = Array.isArray(detail.events) ? detail.events : [];
        const pinchEntered = gestureEvents.find(item => item.type === 'pinch' && item.state === 'entered');
        const pinchReleased = gestureEvents.find(item => item.type === 'pinch' && item.state === 'released');
        const dragEvent = gestureEvents.find(item => item.type === 'drag');

        if (detail.fist) {
            if (handPointerTarget) {
                dispatchHandEvent(handPointerTarget, 'pointerup', 'PointerEvent', 0);
                dispatchHandEvent(handPointerTarget, 'mouseup', 'MouseEvent', 0);
            }
            handPointerTarget = null;
            handScrollLastY = null;
            resetHandTargeting();
            return;
        }

        if (!detail.pinching) setStableHandTarget(currentTarget, performance.now());

        if (pinchEntered) {
            handScrollLastY = detail.y;
            handPointerTarget = handHoverTarget;
            handDidDrag = false;
            if (handPointerTarget) {
                clearHandTargetFeedback(handPointerTarget, 'hand-hover-target');
                handPointerTarget.target.classList?.add('hand-commit-target');
                document.getElementById('handCursor')?.classList.add('is-committed');
                if (!body.classList.contains('view-hub')) {
                    dispatchHandEvent(handPointerTarget, 'pointerdown', 'PointerEvent', 1);
                    dispatchHandEvent(handPointerTarget, 'mousedown', 'MouseEvent', 1);
                }
            }
        } else if (detail.pinching && handPointerTarget) {
            const dragTarget = handPointerTarget || currentTarget;
            if (dragTarget && currentTarget) {
                dragTarget.x = currentTarget.x;
                dragTarget.y = currentTarget.y;
            }
            if (dragEvent || detail.dragging) {
                handDidDrag = true;
                document.getElementById('handCursor')?.classList.add('is-dragging');

                const supportsWheelGesture = body.classList.contains('view-romanticism') ||
                    body.classList.contains('view-baroque') ||
                    body.classList.contains('view-fluid-collision');
                const verticalDelta = handScrollLastY === null ? 0 : detail.y - handScrollLastY;
                if (supportsWheelGesture && Math.abs(verticalDelta) > 2.5 && currentTarget?.target) {
                    const WheelConstructor = currentTarget.view.WheelEvent || window.WheelEvent;
                    currentTarget.target.dispatchEvent(new WheelConstructor('wheel', {
                        bubbles: true,
                        cancelable: true,
                        view: currentTarget.view,
                        clientX: currentTarget.x,
                        clientY: currentTarget.y,
                        deltaY: -verticalDelta * 2.8,
                        deltaMode: 0
                    }));
                }
                handScrollLastY = detail.y;
            }
            dispatchHandEvent(dragTarget, 'pointermove', 'PointerEvent', 1);
            dispatchHandEvent(dragTarget, 'mousemove', 'MouseEvent', 1);
        } else {
            dispatchHandEvent(currentTarget, 'pointermove', 'PointerEvent', 0);
            dispatchHandEvent(currentTarget, 'mousemove', 'MouseEvent', 0);
        }

        if (pinchReleased) {
            if (body.classList.contains('view-hub') && !pinchReleased.dragged && !isInteractionOpening) {
                const hoveredCard = handPointerTarget?.target?.closest?.('.timeline-card');
                const activeCard = hoveredCard || document.querySelector('.timeline-card.active');
                if (activeCard) openCard(activeCard, createCardSnapshot(activeCard));
            }
            const releaseTarget = handPointerTarget || currentTarget;
            if (releaseTarget && currentTarget) {
                releaseTarget.x = currentTarget.x;
                releaseTarget.y = currentTarget.y;
            }
            if (!body.classList.contains('view-hub')) {
                dispatchHandEvent(releaseTarget, 'pointerup', 'PointerEvent', 0);
                dispatchHandEvent(releaseTarget, 'mouseup', 'MouseEvent', 0);
                if (!pinchReleased.dragged && !handDidDrag) {
                    dispatchHandEvent(releaseTarget, 'click', 'MouseEvent', 0);
                    playSound(plingSound, 'Hand selection');
                }
            }
            clearHandTargetFeedback(handPointerTarget, 'hand-commit-target');
            document.getElementById('handCursor')?.classList.remove('is-committed', 'is-dragging');
            handPointerTarget = null;
            handScrollLastY = null;
            handHoverTarget = null;
            handHoverCandidate = null;
            handDidDrag = false;
        }
    });

    window.addEventListener('handcancel', () => {
        if (handPointerTarget) {
            dispatchHandEvent(handPointerTarget, 'pointerup', 'PointerEvent', 0);
            dispatchHandEvent(handPointerTarget, 'mouseup', 'MouseEvent', 0);
        }
        handPointerTarget = null;
        handScrollLastY = null;
        resetHandTargeting();
    });

    window.addEventListener('resize', requestTimelineState);

    playPauseBtn.addEventListener('click', () => {
        isMusicPlaying = !isMusicPlaying;
        managePlayback();
    });

    const pullChainPositionKey = 'surrealism-pull-chain-position';
    let pullChainClickTimer = null;
    let pullChainMovable = false;
    let pullChainDragging = false;
    let pullChainMoved = false;
    let pullChainDragStartX = 0;
    let pullChainDragStartY = 0;
    let pullChainOffsetX = 0;
    let pullChainOffsetY = 0;
    let pullChainStartOffsetX = 0;
    let pullChainStartOffsetY = 0;

    try {
        const savedPosition = JSON.parse(localStorage.getItem(pullChainPositionKey));
        if (Number.isFinite(savedPosition?.x) && Number.isFinite(savedPosition?.y)) {
            pullChainOffsetX = savedPosition.x;
            pullChainOffsetY = savedPosition.y;
            pullChain.style.setProperty('--chain-drag-x', `${pullChainOffsetX}px`);
            pullChain.style.setProperty('--chain-drag-y', `${pullChainOffsetY}px`);
        }
    } catch (error) {
        console.warn('Could not restore lamp chain position.', error);
    }

    pullChain.addEventListener('click', () => {
        if (pullChainMoved || pullChainMovable) return;
        clearTimeout(pullChainClickTimer);
        pullChainClickTimer = setTimeout(() => {
            playSound(clickSound, 'Audio');
            isNight = !isNight;
            pullChain.classList.add('pulled');
            setTimeout(() => pullChain.classList.remove('pulled'), body.classList.contains('view-impressionism') ? 260 : 150);
            setTimeout(updateScenes, 280);
        }, 240);
    });

    pullChain.addEventListener('dblclick', event => {
        if (!body.classList.contains('view-impressionism')) return;
        event.preventDefault();
        clearTimeout(pullChainClickTimer);
        pullChainMovable = !pullChainMovable;
        pullChain.classList.toggle('is-movable', pullChainMovable);
        pullChain.setAttribute('aria-label', pullChainMovable
            ? 'Lamp chain unlocked. Drag to reposition; double-click to lock.'
            : 'Switch day and night');

        if (!pullChainMovable) {
            localStorage.setItem(pullChainPositionKey, JSON.stringify({
                x: pullChainOffsetX,
                y: pullChainOffsetY
            }));
        }
    });

    pullChain.addEventListener('pointerdown', event => {
        if (!pullChainMovable || !body.classList.contains('view-impressionism')) return;
        event.preventDefault();
        pullChainDragging = true;
        pullChainMoved = false;
        pullChainDragStartX = event.clientX;
        pullChainDragStartY = event.clientY;
        pullChainStartOffsetX = pullChainOffsetX;
        pullChainStartOffsetY = pullChainOffsetY;
        pullChain.classList.add('is-dragging');
        pullChain.setPointerCapture(event.pointerId);
    });

    pullChain.addEventListener('pointermove', event => {
        if (!pullChainDragging) return;
        const stageRect = cinematicStage.getBoundingClientRect();
        const scaleX = stageRect.width / cinematicStage.offsetWidth || 1;
        const scaleY = stageRect.height / cinematicStage.offsetHeight || 1;
        pullChainOffsetX = pullChainStartOffsetX + (event.clientX - pullChainDragStartX) / scaleX;
        pullChainOffsetY = pullChainStartOffsetY + (event.clientY - pullChainDragStartY) / scaleY;
        pullChain.style.setProperty('--chain-drag-x', `${pullChainOffsetX}px`);
        pullChain.style.setProperty('--chain-drag-y', `${pullChainOffsetY}px`);
        if (Math.hypot(event.clientX - pullChainDragStartX, event.clientY - pullChainDragStartY) > 3) {
            pullChainMoved = true;
        }
    });

    function finishPullChainDrag(event) {
        if (!pullChainDragging) return;
        pullChainDragging = false;
        pullChain.classList.remove('is-dragging');
        if (pullChain.hasPointerCapture(event.pointerId)) pullChain.releasePointerCapture(event.pointerId);
        setTimeout(() => { pullChainMoved = false; }, 100);
    }

    pullChain.addEventListener('pointerup', finishPullChainDrag);
    pullChain.addEventListener('pointercancel', finishPullChainDrag);

    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            setTrack(item.dataset.track);
        });
    });

    [morningMusic, nightMusic].forEach(audio => {
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('timeupdate', updateProgress);
    });

    if (leftArrow) leftArrow.addEventListener('click', goLeft);
    if (rightArrow) rightArrow.addEventListener('click', goRight);

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
    updateHubTint(document.querySelector('.timeline-card.active') || timelineCards[0]);

    async function updateArtworkPositions() {
        const artCards = document.querySelectorAll('.timeline-card.art-card');
        const beforeWidthRatio = 0.84;

        for (const card of artCards) {
            const cardW = card.offsetWidth;
            const cardH = card.offsetHeight;
            if (!cardW || !cardH) continue;

            // Non-renaissance cards use background-image directly — size based on actual image ratio
            if (!card.classList.contains('renaissance-card')) {
                const artImageValue = window.getComputedStyle(card).getPropertyValue('--art-image').trim();
                const match = artImageValue.match(/url\(["']?(.+?)["']?\)/);
                if (match) {
                    const imgSize = await loadImageSize(match[1]);
                    if (imgSize) {
                        const imgRatio = imgSize.width / imgSize.height;
                        const bgH = 0.95; // 95% of card height
                        const renderedW = bgH * cardH * imgRatio;

                        if (renderedW <= cardW * 0.72) {
                            // portrait / near-square: height-constrained, fits in left portion
                            const renderedFraction = renderedW / cardW;
                            card.style.setProperty('--art-bg-size', `auto ${(bgH * 100).toFixed(0)}%`);
                            card.style.setProperty('--artwork-left', `${((renderedFraction + 0.05) * 100).toFixed(1)}%`);
                        } else {
                            // landscape: width-constrained at 72% so text still has room
                            card.style.setProperty('--art-bg-size', '72% auto');
                            card.style.setProperty('--artwork-left', '77%');
                        }
                        continue;
                    }
                }
                card.style.setProperty('--art-bg-size', 'auto 95%');
                card.style.setProperty('--artwork-left', '60%');
                continue;
            }

            // Renaissance card uses ::before with contain sizing — compute dynamically
            const artImageValue = window.getComputedStyle(card).getPropertyValue('--art-image').trim();
            const match = artImageValue.match(/url\(["']?(.+?)["']?\)/);
            if (!match) continue;

            const imgSize = await loadImageSize(match[1]);
            if (!imgSize) continue;

            const containerRatio = (cardW * beforeWidthRatio) / cardH;
            const imgRatio = imgSize.width / imgSize.height;

            const renderedFraction = imgRatio >= containerRatio
                ? beforeWidthRatio
                : (cardH * imgRatio) / cardW;

            card.style.setProperty('--artwork-left', `${((renderedFraction + 0.05) * 100).toFixed(1)}%`);
        }
    }

    updateArtworkPositions();
    window.addEventListener('resize', updateArtworkPositions);
});
