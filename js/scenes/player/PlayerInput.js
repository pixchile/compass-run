export default class PlayerInput {
    constructor(scene) {
        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT,ESC,P');
        this._prevSpace = false;
        this._prevShift = false;
        this._prevPause = false;  // NUEVO
    }

    update() {}

    isSpaceDown() {
        return this.kb.SPACE.isDown;
    }

    isSpaceJustPressed() {
        const down = this.kb.SPACE.isDown;
        const just = down && !this._prevSpace;
        this._prevSpace = down;
        return just;
    }

    isShiftJustPressed() {
        const down = this.kb.SHIFT.isDown;
        const just = down && !this._prevShift;
        this._prevShift = down;
        return just;
    }

    // NUEVO: detecta ESC o P
    isPauseJustPressed() {
        const down = this.kb.ESC.isDown || this.kb.P.isDown;
        const just = down && !this._prevPause;
        this._prevPause = down;
        return just;
    }

    getMoveDirection() {
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