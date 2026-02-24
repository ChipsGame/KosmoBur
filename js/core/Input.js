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
        this.cpsHistory = [];        // История CPS для сглаживания
        
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
                // Сохраняем позицию клика в игровых координатах
                const rect = canvas.getBoundingClientRect();
                const scale = this.game ? this.game.scale : 1;
                this.lastClickX = (e.clientX - rect.left) / scale;
                this.lastClickY = (e.clientY - rect.top) / scale;
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
            // Сохраняем позицию тача в игровых координатах
            const rect = canvas.getBoundingClientRect();
            const scale = this.game ? this.game.scale : 1;
            const touch = e.touches[0];
            this.lastClickX = (touch.clientX - rect.left) / scale;
            this.lastClickY = (touch.clientY - rect.top) / scale;
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
        
        // Отправляем в систему достижений
        if (this.game.achievements) {
            this.game.achievements.onClick();
        }
        
        // Звук клика
        if (this.game.audio) {
            this.game.audio.playClick();
        }
        
        // Добавляем в историю для CPS
        this.clickHistory.push(now);
        
        // Очищаем старые клики (старше 1 секунды)
        this.clickHistory = this.clickHistory.filter(time => now - time < 1000);
        this.clicksPerSecond = this.clickHistory.length;
        
        // Добавляем визуальный эффект клика (базовый)
        // Крит/супер будут добавлены отдельно через triggerCritEffect
        this.addClickEffect(false, false);
    }
    
    /**
     * Триггер критического эффекта (вызывается из Drill)
     */
    triggerCritEffect(isCrit, isSuper) {
        // Обновляем последний эффект или добавляем новый
        if (this.clickEffects.length > 0) {
            const lastEffect = this.clickEffects[this.clickEffects.length - 1];
            lastEffect.isCrit = isCrit;
            lastEffect.isSuper = isSuper;
            lastEffect.maxRadius = isCrit ? 100 : (isSuper ? 80 : 60);
            lastEffect.maxLife = isCrit ? 0.5 : 0.4;
        }
        
        // Добавляем рипл-эффект
        const x = this.lastClickX !== null ? this.lastClickX : this.game.width / 2;
        const y = this.lastClickY !== null ? this.lastClickY : this.game.height / 2;
        this.createRippleEffect(x, y, isCrit, isSuper);
    }
    
    /**
     * Добавить эффект клика в Canvas и DOM (рипл)
     */
    addClickEffect(isCrit = false, isSuper = false) {
        // Если есть позиция клика - создаём эффект там
        // Иначе - в центре экрана (для клавиатуры)
        const x = this.lastClickX !== null ? this.lastClickX : this.game.width / 2;
        const y = this.lastClickY !== null ? this.lastClickY : this.game.height / 2;
        
        // Canvas эффект
        this.clickEffects.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: isCrit ? 100 : (isSuper ? 80 : 60),
            alpha: 1,
            life: isCrit ? 0.5 : 0.4,
            maxLife: isCrit ? 0.5 : 0.4,
            isCrit: isCrit,
            isSuper: isSuper
        });
        
        // DOM рипл-эффект (для мобильных выглядит круче)
        this.createRippleEffect(x, y, isCrit, isSuper);
        
        // НЕ сбрасываем позицию здесь - она сбросится при следующем клике
        // this.lastClickX = null;
        // this.lastClickY = null;
    }
    
    /**
     * Создать CSS рипл-эффект при тапе
     */
    createRippleEffect(gameX, gameY, isCrit = false, isSuper = false) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // Конвертируем игровые координаты в экранные
        const scale = this.game ? this.game.scale : 1;
        const screenX = gameX * scale;
        const screenY = gameY * scale;
        
        // Создаём элемент рипла
        const ripple = document.createElement('div');
        ripple.className = 'tap-ripple';
        if (isCrit) ripple.classList.add('crit');
        if (isSuper) ripple.classList.add('super');
        
        // Размер рипла
        const size = isCrit ? 100 : (isSuper ? 80 : 60);
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = screenX + 'px';
        ripple.style.top = screenY + 'px';
        
        container.appendChild(ripple);
        
        // Удаляем после анимации
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
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
            
            // Цвета в зависимости от типа удара
            let color1, color2, color3;
            if (effect.isCrit) {
                color1 = `rgba(255, 80, 80, ${effect.alpha * 0.9})`;
                color2 = `rgba(255, 120, 120, ${effect.alpha * 0.6})`;
                color3 = `rgba(255, 200, 200, ${effect.alpha})`;
            } else if (effect.isSuper) {
                color1 = `rgba(80, 255, 255, ${effect.alpha * 0.9})`;
                color2 = `rgba(120, 255, 255, ${effect.alpha * 0.6})`;
                color3 = `rgba(200, 255, 255, ${effect.alpha})`;
            } else {
                color1 = `rgba(100, 200, 255, ${effect.alpha * 0.8})`;
                color2 = `rgba(150, 220, 255, ${effect.alpha * 0.5})`;
                color3 = `rgba(200, 240, 255, ${effect.alpha})`;
            }
            
            // Внешнее свечение
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.strokeStyle = color1;
            ctx.lineWidth = effect.isCrit ? 5 : 3;
            ctx.stroke();
            
            // Внутреннее свечение
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = color2;
            ctx.lineWidth = effect.isCrit ? 4 : 2;
            ctx.stroke();
            
            // Центральная точка
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.isCrit ? 8 : 5, 0, Math.PI * 2);
            ctx.fillStyle = color3;
            ctx.fill();
            
            // Дополнительные кольца для крита
            if (effect.isCrit) {
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius * 1.3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 100, 100, ${effect.alpha * 0.3})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
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
        const instantCPS = this.clickHistory.length;
        
        // Добавляем в историю для сглаживания
        this.cpsHistory.push({ time: now, cps: instantCPS });
        this.cpsHistory = this.cpsHistory.filter(item => now - item.time < 2000);
        
        // Считаем среднее CPS за последние 2 секунды
        if (this.cpsHistory.length > 0) {
            const totalCPS = this.cpsHistory.reduce((sum, item) => sum + item.cps, 0);
            this.clicksPerSecond = Math.round(totalCPS / this.cpsHistory.length);
        } else {
            this.clicksPerSecond = 0;
        }
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
