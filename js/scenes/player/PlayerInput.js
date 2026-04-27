export default class PlayerInput {
    constructor(scene) {
        this.kb = scene.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT');
        // Estado del frame anterior (inicialmente false)
        this._prevSpace = false;
        this._prevShift = false;
    }

    // Se llama una vez por frame, antes de leer las entradas
    update() {
        // No hacemos nada aquí; la gestión de estado se hace
        // directamente en los métodos de consulta.
    }

    isSpaceDown() {
        return this.kb.SPACE.isDown;
    }

    isSpaceJustPressed() {
        const down = this.kb.SPACE.isDown;
        const just = down && !this._prevSpace;
        this._prevSpace = down; // actualizar para el siguiente frame
        return just;
    }

    isShiftJustPressed() {
        const down = this.kb.SHIFT.isDown;
        const just = down && !this._prevShift;
        this._prevShift = down;
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