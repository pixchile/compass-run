// SpatialGrid: divide el arena en celdas para consultas O(1) de muros cercanos
// Cada muro se inserta en todas las celdas que cruza. Las consultas devuelven
// solo los muros de las celdas relevantes en vez de iterar todo el array.
import { ARENA } from '../constants.js';

export default class SpatialGrid {
    constructor(cellSize = 250) {
        this.cellSize = cellSize;
        this.originX = ARENA.x;
        this.originY = ARENA.y;
        this.cols = Math.ceil(ARENA.w / cellSize);
        this.rows = Math.ceil(ARENA.h / cellSize);
        this.cells = new Array(this.cols * this.rows);
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = [];
        }
    }

    _cellIndex(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
        return row * this.cols + col;
    }

    _cellFor(x, y) {
        const col = Math.floor((x - this.originX) / this.cellSize);
        const row = Math.floor((y - this.originY) / this.cellSize);
        return this._cellIndex(col, row);
    }

    clear() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].length = 0;
        }
    }

    insert(line) {
        const { start, end } = line;

        // DDA sobre la grilla — visita cada celda que el segmento cruza
        let cx = Math.floor((start.x - this.originX) / this.cellSize);
        let cy = Math.floor((start.y - this.originY) / this.cellSize);
        const endCx = Math.floor((end.x - this.originX) / this.cellSize);
        const endCy = Math.floor((end.y - this.originY) / this.cellSize);

        const stepX = cx < endCx ? 1 : -1;
        const stepY = cy < endCy ? 1 : -1;
        const deltaX = Math.abs(endCx - cx);
        const deltaY = Math.abs(endCy - cy);
        let err = deltaX - deltaY;

        const seen = new Set();
        while (true) {
            const idx = this._cellIndex(cx, cy);
            if (idx !== -1 && !seen.has(idx)) {
                seen.add(idx);
                this.cells[idx].push(line);
            }

            if (cx === endCx && cy === endCy) break;

            const e2 = 2 * err;
            if (e2 > -deltaY) { err -= deltaY; cx += stepX; }
            if (e2 < deltaX)  { err += deltaX; cy += stepY; }
        }
    }

    build(lines) {
        for (const line of lines) {
            this.insert(line);
        }
    }

    // Muros no rotos en celdas que solapan un circulo centrado en (px, py) con radio
    query(px, py, radius) {
        const minCol = Math.max(0, Math.floor((px - this.originX - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((px - this.originX + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((py - this.originY - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((py - this.originY + radius) / this.cellSize));

        const result = [];
        const seen = new Set();

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                for (const line of this.cells[this._cellIndex(col, row)]) {
                    if (line._broken || seen.has(line)) continue;
                    seen.add(line);
                    result.push(line);
                }
            }
        }

        return result;
    }

    // Muros no rotos a lo largo de la linea (x1,y1) → (x2,y2)
    queryLine(x1, y1, x2, y2) {
        let cx = Math.floor((x1 - this.originX) / this.cellSize);
        let cy = Math.floor((y1 - this.originY) / this.cellSize);
        const endCx = Math.floor((x2 - this.originX) / this.cellSize);
        const endCy = Math.floor((y2 - this.originY) / this.cellSize);

        const stepX = cx < endCx ? 1 : -1;
        const stepY = cy < endCy ? 1 : -1;
        const deltaX = Math.abs(endCx - cx);
        const deltaY = Math.abs(endCy - cy);
        let err = deltaX - deltaY;

        const result = [];
        const seen = new Set();

        while (true) {
            const idx = this._cellIndex(cx, cy);
            if (idx !== -1) {
                for (const line of this.cells[idx]) {
                    if (line._broken || seen.has(line)) continue;
                    seen.add(line);
                    result.push(line);
                }
            }

            if (cx === endCx && cy === endCy) break;

            const e2 = 2 * err;
            if (e2 > -deltaY) { err -= deltaY; cx += stepX; }
            if (e2 < deltaX)  { err += deltaX; cy += stepY; }
        }

        return result;
    }
}
