/**
 * Всплывающий текст (числа +монет, критические удары и т.д.)
 * Оптимизировано для мобильных устройств
 */
class FloatingText {
    constructor(x, y, text, options = {}) {
        this.x = x;
        this.y = y;
        this.text = text;
        
        // Настройки по умолчанию
        const defaults = {
            color: '#ffd700',           // Цвет текста
            size: 24,                   // Размер шрифта
            life: 1.0,                  // Время жизни (сек)
            vy: -80,                    // Скорость вверх
            vx: 0,                      // Горизонтальная скорость
            font: 'bold Arial',
            shadow: true,               // Тень
            outline: true,              // Обводка
            scale: 1.0,                 // Начальный масштаб
            maxScale: 1.3               // Максимальный масштаб
        };
        
        this.options = { ...defaults, ...options };
        
        // Состояние
        this.life = this.options.life;
        this.maxLife = this.options.life;
        this.vx = this.options.vx + (Math.random() - 0.5) * 20;
        this.vy = this.options.vy;
        this.scale = this.options.scale;
        this.alpha = 1;
        
        // Фаза анимации
        this.phase = 0;
    }
    
    update(dt) {
        this.phase += dt * 5;
        
        // Движение
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Гравитация (легкая)
        this.vy += 30 * dt;
        
        // Анимация масштаба (быстрое увеличение, затем уменьшение)
        const progress = 1 - (this.life / this.maxLife);
        if (progress < 0.2) {
            // Фаза появления - увеличиваем
            this.scale = this.options.scale + (this.options.maxScale - this.options.scale) * (progress / 0.2);
        } else {
            // Фаза исчезновения - уменьшаем
            this.scale = this.options.maxScale * (this.life / this.maxLife);
        }
        
        // Уменьшаем жизнь
        this.life -= dt;
        
        // Прозрачность в конце
        if (this.life < 0.3) {
            this.alpha = this.life / 0.3;
        }
        
        return this.life > 0;
    }
    
    render(ctx, camera) {
        const screenY = this.y - camera.y;
        
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.alpha;
        
        // Обводка
        if (this.options.outline) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(this.text, 0, 0);
        }
        
        // Тень
        if (this.options.shadow) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(this.text, 2, 2);
        }
        
        // Основной текст
        ctx.fillStyle = this.options.color;
        ctx.font = `${this.options.size}px ${this.options.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);
        
        ctx.restore();
    }
}

/**
 * Менеджер всплывающего текста
 */
class FloatingTextManager {
    constructor(game) {
        this.game = game;
        this.texts = [];
        
        // Лимит для производительности
        this.maxTexts = 15;
    }
    
    /**
     * Добавить всплывающий текст
     */
    add(x, y, text, options = {}) {
        // Если слишком много текстов - удаляем старые
        if (this.texts.length >= this.maxTexts) {
            this.texts.shift();
        }
        
        // Небольшое случайное смещение
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 20;
        
        this.texts.push(new FloatingText(x + offsetX, y + offsetY, text, options));
    }
    
    /**
     * Добавить текст получения монет
     */
    addCoins(x, y, amount, isCrit = false) {
        const text = `+${amount}🪙`;
        const options = {
            color: isCrit ? '#ff6b6b' : '#ffd700',
            size: isCrit ? 32 : 26,
            vy: -100 - Math.random() * 30,
            life: isCrit ? 1.2 : 0.9,
            maxScale: isCrit ? 1.5 : 1.2
        };
        this.add(x, y, text, options);
    }
    
    /**
     * Добавить текст критического удара
     */
    addCrit(x, y) {
        this.add(x, y, 'КРИТ!', {
            color: '#ff3333',
            size: 28,
            vy: -120,
            life: 0.8,
            maxScale: 1.4
        });
    }
    
    /**
     * Добавить текст супер-удара
     */
    addSuper(x, y) {
        this.add(x, y, 'x2 УДАР!', {
            color: '#00ffff',
            size: 26,
            vy: -110,
            life: 0.9,
            maxScale: 1.3
        });
    }
    
    /**
     * Добавить текст получения руды
     */
    addOre(x, y, amount) {
        this.add(x, y, `+${amount}💎`, {
            color: '#00bfff',
            size: 24,
            vy: -90,
            life: 1.0,
            maxScale: 1.2
        });
    }
    
    update(dt) {
        this.texts = this.texts.filter(text => text.update(dt));
    }
    
    render(ctx, camera) {
        for (const text of this.texts) {
            text.render(ctx, camera);
        }
    }
    
    /**
     * Очистить все тексты
     */
    clear() {
        this.texts = [];
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FloatingText, FloatingTextManager };
}
