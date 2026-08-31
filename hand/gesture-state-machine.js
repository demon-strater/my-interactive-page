export class GestureStateMachine {
    constructor(config) {
        this.config = config;
        this.reset();
    }

    reset() {
        this.pinchState = 'open';
        this.pinchOrigin = null;
        this.dragging = false;
        this.fistSince = 0;
        this.fistTriggered = false;
    }

    cancel() {
        const wasCommitted = this.pinchState === 'pinched';
        this.reset();
        return wasCommitted ? [{ type: 'pinch', state: 'cancelled' }] : [];
    }

    update(frame) {
        const events = [];
        const { pinchRatio, x, y, fist, now } = frame;
        const { enterRatio, exitRatio, dragThresholdPx } = this.config.pinch;

        if (this.pinchState === 'open' && !fist && pinchRatio <= enterRatio) {
            this.pinchState = 'pinched';
            this.pinchOrigin = { x, y };
            this.dragging = false;
            events.push({ type: 'pinch', state: 'entered', x, y });
        } else if (this.pinchState === 'pinched') {
            const movement = this.pinchOrigin
                ? Math.hypot(x - this.pinchOrigin.x, y - this.pinchOrigin.y)
                : 0;

            if (pinchRatio >= exitRatio || fist) {
                events.push({
                    type: 'pinch',
                    state: 'released',
                    x,
                    y,
                    dragged: this.dragging,
                    movement
                });
                this.pinchState = 'open';
                this.pinchOrigin = null;
                this.dragging = false;
            } else if (!this.dragging && movement >= dragThresholdPx) {
                this.dragging = true;
                events.push({ type: 'drag', state: 'entered', x, y, movement });
            } else {
                events.push({
                    type: this.dragging ? 'drag' : 'pinch',
                    state: 'held',
                    x,
                    y,
                    movement
                });
            }
        }

        if (fist) {
            if (!this.fistSince) this.fistSince = now;
            const elapsed = now - this.fistSince;
            if (!this.fistTriggered && elapsed >= this.config.fist.holdMs) {
                this.fistTriggered = true;
                events.push({ type: 'back', state: 'entered' });
            }
            events.push({
                type: 'fist',
                state: this.fistTriggered ? 'held' : 'candidate',
                progress: Math.min(1, elapsed / this.config.fist.holdMs)
            });
        } else {
            this.fistSince = 0;
            this.fistTriggered = false;
        }

        return {
            events,
            pinching: this.pinchState === 'pinched',
            dragging: this.dragging
        };
    }
}
