/**
 * СИСТЕМА ВВОДА - КЛИКЕР
 * Обрабатывает клики вместо зажатия
 */
class Input {
    constructor(game) {
        this.game = game;
        this.isPressed = false;      // Для совместимости со старым кодом
        this.clickProcessed = false; // Флаг что клик обработан
        
        // Защита от повторных кликов
        this.lastClickTime = 0;
        this.minClickInterval = 50;  // Минимум 50мс между кликами
        
        // Статистика кликов
        this.totalClicks = 0;
        this.clicksPerSecond = 0;
        this.clickHistory = [];      // История кликов для расчёта CPS
        
        // Для клавиатуры - отслеживаем зажатие
        this.keyPressed = false;
        
        // Позиция последнего клика для эффекта
        this.lastClickX = null;
        this.lastClickY = null;
        
        // Эффекты кликов
        this.clickEffects = [];
        
        this.setupListeners();
    }

    setupListeners() {
        const canvas = this.game.canvas;
        const gameContainer = document.getElementById('game-container');

        // ЛЕВАЯ кнопка мыши - клик ВЕЗДЕ на game-container
        gameContainer.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Только левая кнопка
                // Не обрабатываем клики по UI элементам
                if (e.target.closest('#ui-layer') || e.target.closest('.modal')) {
                    return;
                }
                e.stopPropagation();
                // Сохраняем позицию клика относительно canvas
                const rect = canvas.getBoundingClientRect();
                this.lastClickX = (e.clientX - rect.left) * (canvas.width / rect.width);
                this.lastClickY = (e.clientY - rect.top) * (canvas.height / rect.height);
                this.onClick();
            }
        });
        
        // ПРАВАЯ кнопка мыши - только блокируем меню, без клика
        gameContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Тач - тап ВЕЗДЕ на game-container
        gameContainer.addEventListener('touchstart', (e) => {
            // Не обрабатываем тачи по UI элементам
            if (e.target.closest('#ui-layer') || e.target.closest('.modal')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            // Сохраняем позицию тача относительно canvas
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.lastClickX = (touch.clientX - rect.left) * (canvas.width / rect.width);
            this.lastClickY = (touch.clientY - rect.top) * (canvas.height / rect.height);
            this.onClick();
        }, { passive: false });

        // Клавиатура (для ПК) - пробел или стрелка вниз
        // ОБРАБАТЫВАЕМ ТОЛЬКО keydown с защитой от повторов
        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowDown') && !this.keyPressed) {
                e.preventDefault();
                this.keyPressed = true;
                this.onClick();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowDown') {
                this.keyPressed = false;
            }
        });
        
        // === ЧИТ: клавиша C = +99999 монет и руды ===
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyC') {
                this.game.economy.addCoins(99999);
                this.game.economy.addOre(99999);
                this.game.showNotification('💰 ЧИТ: +99999 🪙 и 💎!', '#ffd700', 3000);
            }
        });
    }
    
    /**
     * Обработка клика
     */
    onClick() {
        const now = Date.now();
        
        // Защита от слишком частых кликов (дребезг)
        if (now - this.lastClickTime < this.minClickInterval) {
            return;
        }
        this.lastClickTime = now;
        
        // Устанавливаем флаг клика (будет сброшен в update)
        this.isPressed = true;
        this.clickProcessed = false;
        
        // Статистика
        this.totalClicks++;
        
        // Добавляем в историю для CPS
        this.clickHistory.push(now);
        
        // Очищаем старые клики (старше 1 секунды)
        this.clickHistory = this.clickHistory.filter(time => now - time < 1000);
        this.clicksPerSecond = this.clickHistory.length;
        
        // Добавляем визуальный эффект клика
        this.addClickEffect();
    }
    
    /**
     * Добавить эффект клика в Canvas
     */
    addClickEffect() {
        // Если есть позиция клика - создаём эффект там
        // Иначе - в центре экрана (для клавиатуры)
        const x = this.lastClickX !== null ? this.lastClickX : this.game.width / 2;
        const y = this.lastClickY !== null ? this.lastClickY : this.game.height / 2;
        
        this.clickEffects.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: 60,
            alpha: 1,
            life: 0.4, // секунды
            maxLife: 0.4
        });
        
        // НЕ сбрасываем позицию здесь - она сбросится при следующем клике
        // this.lastClickX = null;
        // this.lastClickY = null;
    }
    
    /**
     * Обновить эффекты кликов
     */
    updateClickEffects(dt) {
        for (let i = this.clickEffects.length - 1; i >= 0; i--) {
            const effect = this.clickEffects[i];
            effect.life -= dt;
            
            // Прогресс от 0 до 1
            const progress = 1 - (effect.life / effect.maxLife);
            
            // Радиус растёт
            effect.radius = 10 + (effect.maxRadius - 10) * progress;
            
            // Прозрачность: сначала растёт, потом падает
            if (progress < 0.3) {
                effect.alpha = progress / 0.3; // 0 -> 1
            } else {
                effect.alpha = 1 - ((progress - 0.3) / 0.7); // 1 -> 0
            }
            
            // Удаляем завершённые эффекты
            if (effect.life <= 0) {
                this.clickEffects.splice(i, 1);
            }
        }
    }
    
    /**
     * Отрисовать эффекты кликов
     */
    renderClickEffects(ctx) {
        for (const effect of this.clickEffects) {
            ctx.save();
            
            // Внешнее свечение
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 200, 255, ${effect.alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Внутреннее свечение
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150, 220, 255, ${effect.alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Центральная точка
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 240, 255, ${effect.alpha})`;
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    /**
     * Обновление - вызывается каждый кадр
     */
    update() {
        // Сбрасываем флаг клика после обработки
        if (this.clickProcessed) {
            this.isPressed = false;
        }
        
        // Отмечаем что текущий клик обработан
        if (this.isPressed) {
            this.clickProcessed = true;
        }
        
        // Обновляем CPS
        const now = Date.now();
        this.clickHistory = this.clickHistory.filter(time => now - time < 1000);
        this.clicksPerSecond = this.clickHistory.length;
    }
    
    /**
     * Получить статистику кликов
     */
    getStats() {
        return {
            totalClicks: this.totalClicks,
            cps: this.clicksPerSecond
        };
    }
}
