const DEADZONE = 0.15;

export default class PlayerInput {
    constructor(scene) {
        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT,ESC,P');
        this._prevSpace = false;
        this._prevShift = false;
        this._prevPause = false;
        this._prevA = false;    // gamepad jump
        this._prevX = false;    // gamepad dash
        this._prevStart = false; // gamepad pause
        this._gpIndex = null;
        this._gpAxes = { lx: 0, ly: 0 };
        this._gpButtons = { a: false, x: false, start: false };
    }

    _pollGamepad() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;
        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) { gp = gamepads[i]; break; }
        }
        if (!gp) { this._gpIndex = null; return; }
        this._gpIndex = gp.index;
        this._gpAxes.lx = gp.axes[0] || 0;
        this._gpAxes.ly = gp.axes[1] || 0;
        // Standard Xbox mapping: A=0, RT=7, Start=9
        this._gpButtons.a      = gp.buttons[0]?.pressed || false;
        this._gpButtons.dash   = gp.buttons[7]?.pressed || false;
        this._gpButtons.start  = gp.buttons[9]?.pressed || false;
    }

    update() {
        this._pollGamepad();
    }

    _padA()    { return this._gpButtons.a; }
    _padDash() { return this._gpButtons.dash; }
    _padStart(){ return this._gpButtons.start; }

    isSpaceDown() {
        return this.kb.SPACE.isDown || this._padA();
    }

    isSpaceJustPressed() {
        const down = this.kb.SPACE.isDown || this._padA();
        const just = down && !this._prevSpace;
        this._prevSpace = down;
        return just;
    }

    isShiftJustPressed() {
        const down = this.kb.SHIFT.isDown || this._padDash();
        const just = down && !this._prevShift;
        this._prevShift = down;
        return just;
    }

    isPauseJustPressed() {
        const down = this.kb.ESC.isDown || this.kb.P.isDown || this._padStart();
        const just = down && !this._prevPause;
        this._prevPause = down;
        return just;
    }

    getMoveDirection() {
        // Gamepad analog stick takes priority
        const lx = this._gpAxes.lx;
        const ly = this._gpAxes.ly;
        const mag = Math.hypot(lx, ly);
        if (mag > DEADZONE) {
            return { x: lx / mag, y: ly / mag };
        }

        // Fallback to WASD
        const U = this.kb.W.isDown;
        const Dn = this.kb.S.isDown;
        const L = this.kb.A.isDown;
        const R = this.kb.D.isDown;

        let x = (R ? 1 : 0) - (L ? 1 : 0);
        let y = (Dn ? 1 : 0) - (U ? 1 : 0);

        if (x && y) { x *= 0.7071; y *= 0.7071; }
        return { x, y };
    }
}