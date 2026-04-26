export default class PlayerInput {
    constructor(scene) {
        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT');
        this.prevSpace = false;
        this.prevShift = false;
    }

    update() {
        this.prevSpace = this.kb.SPACE.isDown;
        this.prevShift = this.kb.SHIFT.isDown;
    }

    isSpaceDown() { return this.kb.SPACE.isDown; }
    isSpaceJustPressed() { return this.kb.SPACE.isDown && !this.prevSpace; }
    isShiftJustPressed() { return this.kb.SHIFT.isDown && !this.prevShift; }

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