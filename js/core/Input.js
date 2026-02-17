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
        
        this.setupListeners();
    }

    setupListeners() {
        const canvas = this.game.canvas;

        // ЛЕВАЯ кнопка мыши - клик
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Только левая кнопка
                e.stopPropagation();
                this.onClick();
            }
        });
        
        // ПРАВАЯ кнопка мыши - только блокируем меню, без клика
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Тач - тап
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
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
        
        // Клик по всей области игры (только если не на canvas или UI)
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('click', (e) => {
                // Не обрабатываем клики по UI элементам и canvas
                if (e.target.closest('#ui-layer') || 
                    e.target.closest('.modal') ||
                    e.target === canvas) {
                    return;
                }
                this.onClick();
            });
        }
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
        
        // Визуальный эффект клика
        this.showClickEffect();
    }
    
    /**
     * Показать визуальный эффект клика
     */
    showClickEffect() {
        // Создаём небольшую пульсацию на экране
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 5;
            animation: click-pulse 0.3s ease-out forwards;
        `;
        
        gameContainer.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 300);
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
