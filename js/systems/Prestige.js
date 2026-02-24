/**
 * СИСТЕМА ПРЕСТИЖА (REBIRTH)
 * Сброс прогресса за постоянные бонусы
 */
class Prestige {
    constructor(game) {
        this.game = game;
        
        // Количество престижей
        this.count = 0;
        
        // Накопленные очки престижа (токены)
        this.tokens = 0;
        
        // Постоянные бонусы
        this.bonuses = {
            coinMultiplier: 1,      // Множитель монет
            speedMultiplier: 1,     // Множитель скорости
            powerMultiplier: 1,     // Множитель силы
            startCoins: 0,          // Стартовые монеты
            autoDrillBoost: 1       // Усиление автобура
        };
        
        // Бонусы отдельных престижей
        this.prestigeLevels = [
            { tokens: 1,  bonus: 'coinMultiplier', value: 1.5, name: 'Золотая Лихорадка' },
            { tokens: 2,  bonus: 'speedMultiplier', value: 1.3, name: 'Скоростной Демон' },
            { tokens: 3,  bonus: 'powerMultiplier', value: 1.4, name: 'Силач' },
            { tokens: 5,  bonus: 'startCoins', value: 1000, name: 'Богатый Старт' },
            { tokens: 8,  bonus: 'autoDrillBoost', value: 1.5, name: 'Автоматизатор' },
            { tokens: 12, bonus: 'coinMultiplier', value: 2.0, name: 'Монетный Магнат' },
            { tokens: 18, bonus: 'speedMultiplier', value: 1.5, name: 'Гиперскорость' },
            { tokens: 25, bonus: 'powerMultiplier', value: 1.6, name: 'Разрушитель' },
            { tokens: 35, bonus: 'startCoins', value: 10000, name: 'Миллионер' },
            { tokens: 50, bonus: 'autoDrillBoost', value: 2.0, name: 'Роботизированный' }
        ];
        
        // Минимальная глубина для престижа
        this.minDepth = 1000;
        
        // Множитель для расчёта токенов
        this.tokenMultiplier = 0.1; // 1 токен за каждые 10м глубины
    }
    
    /**
     * Рассчитать сколько токенов даст престиж
     */
    calculateTokens(depth = null) {
        const currentDepth = depth || this.game.drill.depth;
        if (currentDepth < this.minDepth) return 0;
        
        // Формула: 1 токен за каждые 100м, + бонус за глубину
        const baseTokens = Math.floor(currentDepth / 100);
        const bonusTokens = Math.floor(Math.sqrt(currentDepth / 100));
        return Math.max(1, baseTokens + bonusTokens);
    }
    
    /**
     * Получить текущий прогресс к следующему бонусу
     */
    getNextBonusInfo() {
        for (const level of this.prestigeLevels) {
            if (this.tokens < level.tokens) {
                const currentTokens = this.tokens;
                const needed = level.tokens - currentTokens;
                return {
                    name: level.name,
                    current: currentTokens,
                    needed: level.tokens,
                    remaining: needed,
                    bonus: level.bonus,
                    value: level.value
                };
            }
        }
        return null; // Все бонусы получены
    }
    
    /**
     * Получить все активные бонусы
     */
    getActiveBonuses() {
        const bonuses = {
            coinMultiplier: 1,
            speedMultiplier: 1,
            powerMultiplier: 1,
            startCoins: 0,
            autoDrillBoost: 1
        };
        
        for (const level of this.prestigeLevels) {
            if (this.tokens >= level.tokens) {
                if (level.bonus === 'startCoins') {
                    bonuses[level.bonus] = Math.max(bonuses[level.bonus], level.value);
                } else {
                    bonuses[level.bonus] *= level.value;
                }
            }
        }
        
        return bonuses;
    }
    
    /**
     * Выполнить престиж
     */
    doPrestige() {
        const tokensToGain = this.calculateTokens();
        if (tokensToGain <= 0) return false;
        
        // Начисляем токены
        this.tokens += tokensToGain;
        this.count++;
        
        // Отправляем в систему достижений ДО сброса
        if (this.game.achievements) {
            this.game.achievements.onPrestige();
        }
        
        // Обновляем бонусы
        this.bonuses = this.getActiveBonuses();
        
        // Применяем бонусы к игре
        this.applyBonuses();
        
        // Сброс игрового прогресса
        this.resetGameProgress();
        
        return {
            success: true,
            tokensGained: tokensToGain,
            totalTokens: this.tokens,
            prestigeCount: this.count
        };
    }
    
    /**
     * Применить бонусы престижа к игре
     */
    applyBonuses() {
        // Сбрасываем к базовым значениям и применяем бонусы
        this.game.economy.coinMultiplier = 1 * this.bonuses.coinMultiplier;
        this.game.economy.coins = this.bonuses.startCoins;
        this.game.economy.totalEarned = this.bonuses.startCoins;
        
        this.game.drill.speed = 100 * this.bonuses.speedMultiplier;
        this.game.drill.power = 1 * this.bonuses.powerMultiplier;
        this.game.drill.coolingEfficiency = 1;
        
        this.game.autoDrill.setSpeedMultiplier(this.bonuses.autoDrillBoost);
    }
    
    /**
     * Сброс игрового прогресса
     */
    resetGameProgress() {
        // Сброс позиции бура
        this.game.drill.y = this.game.drill.height < 170 ? 120 : (this.game.drill.height < 200 ? 180 : 200);
        this.game.drill.targetY = this.game.drill.y;
        this.game.drill.depth = 0;
        this.game.drill.temperature = 0;
        this.game.drill.rotation = 0;
        
        // Сброс улучшений
        for (const id in this.game.upgrades.levels) {
            this.game.upgrades.levels[id] = 0;
        }
        
        // Бонусы уже применены в applyBonuses(), здесь только сброс позиции и слоёв
        
        // Дрифт-система удалена, сброс не нужен
        
        // Сброс автобура
        this.game.autoDrill.reset();
        
        // Сброс босса (чтобы первый босс был на 400м, а не на старой глубине)
        this.game.bossSystem.lastBossDepth = 0;
        
        // Перегенерация слоёв
        this.game.layers = [];
        this.game.currentLayer = 0;
        this.game.generateInitialLayers();
        
        // Сброс камеры
        this.game.camera.y = this.game.drill.y - 300;
        
        // Сохраняем
        this.game.saveManager.save();
    }
    
    /**
     * Получить описание всех активных бонусов
     */
    getBonusesDescription() {
        const active = [];
        
        for (const level of this.prestigeLevels) {
            if (this.tokens >= level.tokens) {
                let desc = '';
                switch(level.bonus) {
                    case 'coinMultiplier':
                        desc = `💰 Монеты x${level.value}`;
                        break;
                    case 'speedMultiplier':
                        desc = `⚡ Скорость x${level.value}`;
                        break;
                    case 'powerMultiplier':
                        desc = `⛏️ Сила x${level.value}`;
                        break;
                    case 'startCoins':
                        desc = `🪙 Старт +${Utils.formatNumber(level.value)}`;
                        break;
                    case 'autoDrillBoost':
                        desc = `🤖 Автобур x${level.value}`;
                        break;
                }
                active.push({
                    name: level.name,
                    description: desc,
                    tokens: level.tokens
                });
            }
        }
        
        return active;
    }
    
    /**
     * Сохранение
     */
    save() {
        return {
            count: this.count,
            tokens: this.tokens
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) return;
        
        this.count = data.count || 0;
        this.tokens = data.tokens || 0;
        
        // Пересчитываем бонусы
        this.bonuses = this.getActiveBonuses();
    }
}
