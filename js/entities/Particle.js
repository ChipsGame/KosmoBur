class Particle {
    constructor(x, y, type, color, size = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;

        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200 - 100;
        this.life = 1.0;
        this.decay = 0.5 + Math.random() * 1.0;
        this.size = size !== null ? size : (5 + Math.random() * 10);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 10;

        // Специфика типов
        if (type === 'dust') {
            this.vy = -50 - Math.random() * 100;
            this.decay = 0.3;
            this.size = size !== null ? size : (3 + Math.random() * 5);
        } else if (type === 'debris') {
            this.vy = -200 - Math.random() * 200;
            this.decay = 1.5;
            this.size = size !== null ? size : (4 + Math.random() * 8);
        } else if (type === 'spark') {
            this.vx = (Math.random() - 0.5) * 300;
            this.vy = (Math.random() - 0.5) * 300 - 50;
            this.decay = 2.0;
            this.size = size !== null ? size : (2 + Math.random() * 3);
        } else if (type === 'explosion') {
            this.vx = (Math.random() - 0.5) * 400;
            this.vy = (Math.random() - 0.5) * 400;
            this.decay = 1.0;
            this.size = size !== null ? size : (8 + Math.random() * 12);
        } else if (type === 'chip') {
            this.vx = (Math.random() - 0.5) * 150;
            this.vy = -100 - Math.random() * 150;
            this.decay = 1.0;
            this.size = size !== null ? size : (2 + Math.random() * 4);
        }
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 500 * dt; // гравитация
        this.life -= this.decay * dt;
        this.rotation += this.rotationSpeed * dt;
    }

    render(ctx, camera) {
        const screenY = this.y - camera.y;
        const alpha = Math.max(0, this.life);

        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        
        switch (this.type) {
            case 'spark':
                // Искры - яркие точки
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Свечение искр
                ctx.globalAlpha = alpha * 0.5;
                ctx.fillStyle = '#ffffaa';
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'explosion':
                // Взрыв - круги с градиентом
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(0.5, '#ffaa00');
                gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'dust':
                // Пыль - полупрозрачные круги
                ctx.globalAlpha = alpha * 0.7;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                // Обычные частицы (debris, chip)
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                
                // Контур для объема
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
                break;
        }
        
        ctx.restore();
    }
}