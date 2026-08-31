import { FilesetResolver, HandLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { HAND_CONFIG } from './hand/interaction-config.js';
import { GestureStateMachine } from './hand/gesture-state-machine.js';

const root = document.getElementById('handTracker');
const toggle = document.getElementById('handTrackerToggle');
const label = document.getElementById('handTrackerLabel');
const preview = document.getElementById('handTrackerPreview');
const status = document.getElementById('handTrackerStatus');
const video = document.getElementById('handTrackerVideo');
const canvas = document.getElementById('handTrackerCanvas');
const handCursor = document.getElementById('handCursor');
const context = canvas.getContext('2d');
const gestures = new GestureStateMachine(HAND_CONFIG);

const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

let landmarker;
let stream;
let animationFrame;
let running = false;
let lastVideoTime = -1;
let cursorX = null;
let cursorY = null;
let navigationX = null;
let handInRange = false;
let palmWindingSign = 0;
let palmCalibrationCandidate = 0;
let palmCalibrationFrames = 0;
let trackingLostSince = 0;

function setStatus(message) {
    status.textContent = message;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFingerExtended(points, tip, pip) {
    return distance(points[tip], points[0]) > distance(points[pip], points[0]) * 1.16;
}

function visibleHandSize(points) {
    const xValues = points.map(point => point.x);
    const yValues = points.map(point => point.y);
    return Math.max(
        Math.max(...xValues) - Math.min(...xValues),
        Math.max(...yValues) - Math.min(...yValues)
    );
}

function palmWinding(points) {
    const wrist = points[0];
    const indexKnuckle = points[5];
    const littleKnuckle = points[17];
    const winding =
        (indexKnuckle.x - wrist.x) * (littleKnuckle.y - wrist.y) -
        (indexKnuckle.y - wrist.y) * (littleKnuckle.x - wrist.x);
    return Math.abs(winding) >= HAND_CONFIG.palm.windingThreshold ? Math.sign(winding) : 0;
}

function calibratePalm(points) {
    const windingSign = palmWinding(points);
    const extendedCount = [[8, 6], [12, 10], [16, 14], [20, 18]]
        .filter(([tip, pip]) => isFingerExtended(points, tip, pip)).length;

    if (!windingSign || extendedCount < 3) {
        palmCalibrationCandidate = 0;
        palmCalibrationFrames = 0;
        return false;
    }

    if (palmCalibrationCandidate === windingSign) palmCalibrationFrames += 1;
    else {
        palmCalibrationCandidate = windingSign;
        palmCalibrationFrames = 1;
    }

    if (palmCalibrationFrames >= HAND_CONFIG.palm.calibrationFrames) {
        palmWindingSign = windingSign;
    }
    return palmWindingSign !== 0;
}

function drawHand(points) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(214, 189, 145, 0.92)';
    context.fillStyle = '#fff';
    context.lineWidth = 2;
    context.lineCap = 'round';

    for (const [start, end] of CONNECTIONS) {
        context.beginPath();
        context.moveTo(points[start].x * canvas.width, points[start].y * canvas.height);
        context.lineTo(points[end].x * canvas.width, points[end].y * canvas.height);
        context.stroke();
    }

    for (const point of points) {
        context.beginPath();
        context.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, Math.PI * 2);
        context.fill();
    }
}

function emitGestureFrame(points, handedness, now) {
    const rawX = (1 - points[8].x) * window.innerWidth;
    const rawY = points[8].y * window.innerHeight;
    const smoothing = HAND_CONFIG.cursor.smoothing;
    cursorX = cursorX === null ? rawX : cursorX * (1 - smoothing) + rawX * smoothing;
    cursorY = cursorY === null ? rawY : cursorY * (1 - smoothing) + rawY * smoothing;

    const palmSize = Math.max(distance(points[0], points[9]), 0.04);
    const pinchRatio = distance(points[4], points[8]) / palmSize;
    const extendedCount = [[8, 6], [12, 10], [16, 14], [20, 18]]
        .filter(([tip, pip]) => isFingerExtended(points, tip, pip)).length;
    const fist = extendedCount === 0 &&
        distance(points[4], points[9]) / palmSize < HAND_CONFIG.fist.thumbToPalmRatio;
    const result = gestures.update({ pinchRatio, x: cursorX, y: cursorY, fist, now });

    handCursor.style.left = `${cursorX}px`;
    handCursor.style.top = `${cursorY}px`;
    handCursor.classList.add('is-visible');
    handCursor.classList.toggle('is-pinching', result.pinching);
    handCursor.classList.toggle('is-dragging', result.dragging);
    handCursor.classList.remove('is-uncertain');

    const backEvent = result.events.find(event => event.type === 'back');
    const fistEvent = result.events.find(event => event.type === 'fist');
    if (backEvent && !document.body.classList.contains('view-hub')) {
        window.dispatchEvent(new CustomEvent('handback'));
    }

    if (document.body.classList.contains('view-hub') && !result.pinching && !fist) {
        const currentNavigationX = 1 - points[9].x;
        if (navigationX !== null) {
            const delta = currentNavigationX - navigationX;
            if (Math.abs(delta) >= HAND_CONFIG.cursor.navigationDeadZone) {
                window.dispatchEvent(new CustomEvent('handnavigate', {
                    detail: { delta: delta * HAND_CONFIG.cursor.navigationGain }
                }));
            }
        }
        navigationX = currentNavigationX;
    } else {
        navigationX = null;
    }

    window.dispatchEvent(new CustomEvent('handpointer', {
        detail: {
            x: cursorX,
            y: cursorY,
            events: result.events,
            pinching: result.pinching,
            dragging: result.dragging,
            fist,
            confidence: handedness?.score ?? 0.5
        }
    }));

    if (fistEvent && !document.body.classList.contains('view-hub')) {
        setStatus(`BACK ${Math.round(fistEvent.progress * 100)}%`);
    } else if (result.dragging) setStatus('DRAGGING');
    else if (result.pinching) setStatus('COMMITTED');
    else setStatus('TARGET READY');
}

function cancelInteraction(message, uncertain = false) {
    gestures.cancel();
    window.dispatchEvent(new CustomEvent('handcancel'));
    cursorX = null;
    cursorY = null;
    navigationX = null;
    handCursor.classList.remove('is-visible', 'is-pinching', 'is-dragging');
    handCursor.classList.toggle('is-uncertain', uncertain);
    setStatus(message);
}

function handleTrackingLoss(now) {
    if (!trackingLostSince) trackingLostSince = now;
    const elapsed = now - trackingLostSince;
    if (elapsed < HAND_CONFIG.tracking.lossGraceMs) {
        handCursor.classList.add('is-uncertain');
        setStatus('TRACKING UNCERTAIN');
        return;
    }
    handInRange = false;
    cancelInteraction('SHOW YOUR HAND');
}

async function trackingLoop() {
    if (!running) return;
    const now = performance.now();

    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, now);
        const points = result.landmarks?.[0];
        const handedness = result.handedness?.[0]?.[0];

        if (!points) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            handleTrackingLoss(now);
        } else {
            trackingLostSince = 0;
            const handSize = visibleHandSize(points);
            handInRange = handInRange
                ? handSize >= HAND_CONFIG.range.exitSize
                : handSize >= HAND_CONFIG.range.enterSize;

            if (!handInRange) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                cancelInteraction('MOVE HAND CLOSER');
            } else if (!palmWindingSign) {
                const calibrated = calibratePalm(points);
                context.clearRect(0, 0, canvas.width, canvas.height);
                cancelInteraction(calibrated ? 'PALM CALIBRATED' : 'HOLD YOUR PALM OPEN');
            } else if (palmWinding(points) !== palmWindingSign) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                cancelInteraction('SHOW YOUR PALM');
            } else {
                drawHand(points);
                emitGestureFrame(points, handedness, now);
            }
        }
    }

    animationFrame = requestAnimationFrame(trackingLoop);
}

async function createLandmarker() {
    if (landmarker) return;
    setStatus('LOADING HAND MODEL');
    const wasmRoot = new URL('./vendor/mediapipe/wasm/', window.location.href).href;
    const vision = await FilesetResolver.forVisionTasks(wasmRoot);
    const modelAssetPath = new URL('./vendor/mediapipe/hand_landmarker.task', window.location.href).href;
    const options = {
        baseOptions: { modelAssetPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.58,
        minHandPresenceConfidence: 0.58,
        minTrackingConfidence: 0.52
    };

    try {
        landmarker = await HandLandmarker.createFromOptions(vision, options);
    } catch (gpuError) {
        console.warn('GPU hand tracking unavailable; using CPU.', gpuError);
        options.baseOptions = { modelAssetPath, delegate: 'CPU' };
        landmarker = await HandLandmarker.createFromOptions(vision, options);
    }
}

function resetSession() {
    gestures.reset();
    cursorX = null;
    cursorY = null;
    navigationX = null;
    handInRange = false;
    palmWindingSign = 0;
    palmCalibrationCandidate = 0;
    palmCalibrationFrames = 0;
    trackingLostSince = 0;
}

async function start() {
    preview.hidden = false;
    toggle.disabled = true;
    try {
        await createLandmarker();
        setStatus('ALLOW CAMERA ACCESS');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        resetSession();
        running = true;
        root.classList.add('is-active');
        toggle.setAttribute('aria-pressed', 'true');
        label.textContent = 'HAND';
        setStatus('HOLD YOUR PALM OPEN');
        trackingLoop();
    } catch (error) {
        console.error('Hand tracking failed:', error);
        setStatus(error.name === 'NotAllowedError' ? 'CAMERA ACCESS REQUIRED' : 'HAND TRACKING UNAVAILABLE');
    } finally {
        toggle.disabled = false;
    }
}

function stop() {
    running = false;
    cancelAnimationFrame(animationFrame);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    root.classList.remove('is-active');
    toggle.setAttribute('aria-pressed', 'false');
    label.textContent = 'HAND';
    preview.hidden = true;
    resetSession();
    handCursor.classList.remove('is-visible', 'is-pinching', 'is-dragging', 'is-uncertain');
}

toggle.addEventListener('click', () => running ? stop() : start());
window.addEventListener('pagehide', stop);
