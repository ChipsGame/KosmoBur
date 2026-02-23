/**
 * СИСТЕМА АВТОБУРЕНИЯ
 * Автоматически бурит даже когда игрок не кликает
 */
class AutoDrill {
    constructor(game) {
        this.game = game;
        
        // Базовые параметры
        this.clicksPerSecond = 0;        // Текущая скорость кликов в секунду
        this.baseClicksPerSecond = 0;    // Базовая скорость (без бонусов)
        this.efficiency = 1;             // Эффективность (множитель урона)
        
        // Прогресс
        this.totalAutoClicks = 0;        // Всего автокликов за всё время
        this.totalAutoDepth = 0;         // Всего пройдено автобуром
        
        // Визуал
        this.lastClickTime = 0;
        this.clickInterval = 0;          // Интервал между кликами в мс
        
        // Модификаторы
        this.multipliers = {
            speed: 1,    // Множитель скорости
            power: 1     // Множитель силы
        };
    }
    
    /**
     * Установить базовую скорость автобура
     * @param {number} cps - Clicks per second (кликов в секунду)
     */
    setBaseSpeed(cps) {
        this.baseClicksPerSecond = cps;
        this.updateEffectiveSpeed();
    }
    
    /**
     * Увеличить скорость автобура
     * @param {number} amount - На сколько увеличить
     */
    increaseSpeed(amount) {
        this.baseClicksPerSecond += amount;
        this.updateEffectiveSpeed();
    }
    
    /**
     * Установить эффективность (силу каждого удара)
     * @param {number} efficiency - Множитель урона
     */
    setEfficiency(efficiency) {
        this.efficiency = efficiency;
    }
    
    /**
     * Обновить эффективную скорость с учётом всех множителей
     */
    updateEffectiveSpeed() {
        this.clicksPerSecond = this.baseClicksPerSecond * this.multipliers.speed;
        this.clickInterval = this.clicksPerSecond > 0 ? 1000 / this.clicksPerSecond : 0;
    }
    
    /**
     * Установить множитель скорости
     */
    setSpeedMultiplier(multiplier) {
        this.multipliers.speed = multiplier;
        this.updateEffectiveSpeed();
    }
    
    /**
     * Установить множитель силы
     */
    setPowerMultiplier(multiplier) {
        this.multipliers.power = multiplier;
    }
    
    /**
     * Получить текущую скорость с учётом всех бонусов
     */
    getEffectiveSpeed() {
        return this.clicksPerSecond;
    }
    
    /**
     * Получить эффективную силу удара
     */
    getEffectivePower() {
        return this.game.drill.power * this.efficiency * this.multipliers.power;
    }
    
    /**
     * Обновление - вызывается каждый кадр
     */
    update(dt) {
        if (this.clicksPerSecond <= 0) return;
        
        const now = performance.now();
        const interval = 1000 / this.clicksPerSecond;
        
        // Проверяем, пора ли сделать клик
        if (now - this.lastClickTime >= interval) {
            this.performAutoClick(dt);
            this.lastClickTime = now;
        }
    }
    
    /**
     * Выполнить автоклик
     */
    performAutoClick(dt) {
        const drill = this.game.drill;
        
        // Эмулируем клик - активируем бурение
        drill.isDrilling = true;
        
        // Движение вниз
        const autoSpeed = drill.speed * 0.5; // Автобур медленнее ручного
        drill.targetY += autoSpeed * dt * 2; // Умножаем dt т.к. это "один клик"
        
        // Вращение
        drill.rotation += 5;
        
        // Проверка столкновений
        this.checkAutoCollisions(dt);
        
        // Создаём частицы
        if (Math.random() < 0.3) {
            this.game.createParticle(
                drill.x + (Math.random() - 0.5) * 40,
                drill.y + 80,
                'dust',
                '#8b4513',
                2 + Math.random() * 3
            );
        }
        
        // Статистика
        this.totalAutoClicks++;
        this.totalAutoDepth += autoSpeed * dt * 2 / 10; // В метрах
        
        // Визуальный эффект автоклика
        this.renderClickEffect();
    }
    
    /**
     * Проверка столкновений для автобура
     */
    checkAutoCollisions(dt) {
        const drill = this.game.drill;
        const drillBottom = drill.y + drill.height / 2;
        
        const visibleLayers = this.game.visibleLayers || this.game.layers;
        
        for (let layer of visibleLayers) {
            if (layer.isDestroyed) continue;
            
            const layerTop = layer.y - layer.height / 2;
            const layerBottom = layer.y + layer.height / 2;
            
            if (drillBottom > layerTop && drillBottom < layerBottom + 20) {
                // Наносим урон (с учётом эффективности автобура)
                const damage = this.getEffectivePower() * 0.7;
                const destroyed = layer.takeDamage(damage, dt);
                
                if (destroyed) {
                    drill.onLayerDestroyed(layer);
                } else {
                    drill.targetY = layerTop - drill.height / 2;
                }
                break;
            }
        }
    }
    
    /**
     * Визуальный эффект автоклика
     */
    renderClickEffect() {
        // Можно добавить визуальный индикатор автоклика
        // Например, небольшую пульсацию или частицы
    }
    
    /**
     * Получить статистику
     */
    getStats() {
        return {
            clicksPerSecond: this.clicksPerSecond.toFixed(1),
            totalAutoClicks: this.totalAutoClicks,
            totalAutoDepth: Math.floor(this.totalAutoDepth),
            efficiency: this.efficiency.toFixed(2),
            powerMultiplier: this.multipliers.power.toFixed(2)
        };
    }
    
    /**
     * Сброс (для престижа)
     */
    reset() {
        this.baseClicksPerSecond = 0;
        this.efficiency = 1;
        this.totalAutoClicks = 0;
        this.totalAutoDepth = 0;
        this.updateEffectiveSpeed();
    }
    
    /**
     * Сохранение
     */
    save() {
        return {
            baseClicksPerSecond: this.baseClicksPerSecond,
            efficiency: this.efficiency,
            totalAutoClicks: this.totalAutoClicks,
            totalAutoDepth: this.totalAutoDepth
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) return;
        
        this.baseClicksPerSecond = data.baseClicksPerSecond || 0;
        this.efficiency = data.efficiency || 1;
        this.totalAutoClicks = data.totalAutoClicks || 0;
        this.totalAutoDepth = data.totalAutoDepth || 0;
        
        this.updateEffectiveSpeed();
    }
}
