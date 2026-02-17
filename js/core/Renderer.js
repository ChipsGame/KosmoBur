class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
    }

    // Вспомогательные методы отрисовки
    drawRoundedRect(x, y, width, height, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
        this.ctx.fill();
    }

    drawText(text, x, y, options = {}) {
        const {
            size = 20,
            color = 'white',
            align = 'center',
            font = 'Arial'
        } = options;

        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px ${font}`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }
}