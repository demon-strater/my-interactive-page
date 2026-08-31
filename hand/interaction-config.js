export const HAND_CONFIG = Object.freeze({
    range: {
        enterSize: 0.16,
        exitSize: 0.13
    },
    palm: {
        windingThreshold: 0.008,
        calibrationFrames: 12
    },
    cursor: {
        smoothing: 0.36,
        navigationDeadZone: 0.0025,
        navigationGain: 5.0
    },
    pinch: {
        enterRatio: 0.38,
        exitRatio: 0.55,
        dragThresholdPx: 14
    },
    fist: {
        thumbToPalmRatio: 1.15,
        holdMs: 700
    },
    targeting: {
        hoverDwellMs: 120,
        magnetRadiusPx: 56
    },
    tracking: {
        lossGraceMs: 180
    },
    scroll: {
        travelPx: 54,
        resetTravelPx: 32,
        wheelDelta: 260
    }
});
