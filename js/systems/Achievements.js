/**
 * СИСТЕМА ДОСТИЖЕНИЙ
 * Полная система с категориями, наградами и отслеживанием прогресса
 */
class Achievements {
    constructor(game) {
        this.game = game;
        
        // Полученные достижения (Set для быстрого поиска)
        this.unlocked = new Set();
        
        // Прогресс по достижениям (для тех что требуют накопления)
        this.progress = {};
        
        // Максимальная глубина за все престижи (для достижений по глубине)
        this.maxDepthEver = 0;
        
        // Счетчики за все время (не сбрасываются при престиже)
        this.lifetimeStats = {
            totalClicks: 0,
            totalCoinsEarned: 0,
            totalOreCollected: 0,
            bossesDefeated: 0,
            prestigeCount: 0,
            playTime: 0, // в секундах
            consecutiveDays: 0,
            lastPlayDate: null
        };
        
        // Временные счетчики (для достижений "за сессию")
        this.sessionStats = {
            clicks: 0,
            startTime: Date.now()
        };
        
        // Флаг для отслеживания серии кликов
        this.clickStreak = {
            count: 0,
            lastClickTime: 0
        };
        
        // Очередь уведомлений о достижениях
        this.notificationQueue = [];
        this.isShowingNotification = false;
        
        // Инициализация достижений
        this.initAchievements();
    }
    
    /**
     * Определение всех достижений
     */
    initAchievements() {
        // === ГЛУБИНА (использует maxDepthEver — не сбрасывается при престиже) ===
        this.depthAchievements = [
            { id: 'depth_100', name: '⛏️ Шахтёр', description: 'Достичь глубины 100м', condition: () => this.maxDepthEver >= 100, reward: { coins: 500 } },
            { id: 'depth_500', name: '🕳️ Глубоко вниз', description: 'Достичь глубины 500м', condition: () => this.maxDepthEver >= 500, reward: { coins: 2000, ore: 5 } },
            { id: 'depth_1000', name: '🔥 Адские недра', description: 'Достичь глубины 1000м', condition: () => this.maxDepthEver >= 1000, reward: { coins: 5000, skin: 'lava' } },
            { id: 'depth_5000', name: '💎 Центр Земли', description: 'Достичь глубины 5000м', condition: () => this.maxDepthEver >= 5000, reward: { coins: 25000, skin: 'alien' } },
            { id: 'depth_10000', name: '🌌 Сквозь планету', description: 'Достичь глубины 10000м', condition: () => this.maxDepthEver >= 10000, reward: { coins: 100000, skin: 'shadow' } }
        ];
        
        // === КЛИКИ (за сессию) ===
        this.clickAchievements = [
            { id: 'clicks_1000', name: '🖱️ Энтузиаст', description: 'Сделать 1000 кликов за сессию', condition: () => this.sessionStats.clicks >= 1000, reward: { coins: 1000 } },
            { id: 'clicks_5000', name: '🖱️🖱️ Машина', description: 'Сделать 5000 кликов за сессию', condition: () => this.sessionStats.clicks >= 5000, reward: { coins: 5000 } },
            { id: 'clicks_10000', name: '👑 Король тапа', description: 'Сделать 10000 кликов за сессию', condition: () => this.sessionStats.clicks >= 10000, reward: { coins: 10000 } }
        ];
        
        // === КЛИКИ (всего время) ===
        this.lifetimeClickAchievements = [
            { id: 'lt_clicks_100000', name: '🖱️ Мастер клика', description: 'Сделать 100000 кликов всего', condition: () => this.lifetimeStats.totalClicks >= 100000, reward: { coins: 10000 } },
            { id: 'lt_clicks_1000000', name: '🏆 Легенда клика', description: 'Сделать 1000000 кликов всего', condition: () => this.lifetimeStats.totalClicks >= 1000000, reward: { coins: 100000 } }
        ];
        
        // === БОССЫ ===
        this.bossAchievements = [
            { id: 'boss_1', name: '☄️ Первый контакт', description: 'Победить 1-го босса', condition: () => this.lifetimeStats.bossesDefeated >= 1, reward: { coins: 1000 } },
            { id: 'boss_10', name: '☄️☄️ Повелитель метеоритов', description: 'Победить 10 боссов', condition: () => this.lifetimeStats.bossesDefeated >= 10, reward: { coins: 15000 } },
            { id: 'boss_25', name: '🌠 Уничтожитель', description: 'Победить 25 боссов', condition: () => this.lifetimeStats.bossesDefeated >= 25, reward: { coins: 50000 } },
            { id: 'boss_close', name: '⏱️ На грани', description: 'Победить босса с менее чем 3 секундами остатка', condition: () => this.hasAchievement('boss_close'), reward: { coins: 2000 } },
            { id: 'boss_fast', name: '🥊 Без промаха', description: 'Победить босса менее чем за 15 секунд', condition: () => this.hasAchievement('boss_fast'), reward: { coins: 5000 } }
        ];
        
        // === ЭКОНОМИКА ===
        this.economyAchievements = [
            { id: 'coins_10000', name: '💰 Богач', description: 'Заработать 10000 монет всего', condition: () => this.lifetimeStats.totalCoinsEarned >= 10000, reward: { coins: 1000 } },
            { id: 'coins_100000', name: '🏦 Банкир', description: 'Заработать 100000 монет всего', condition: () => this.lifetimeStats.totalCoinsEarned >= 100000, reward: { coins: 5000 } },
            { id: 'coins_1m', name: '🤑 Миллионер', description: 'Заработать 1 миллион монет всего', condition: () => this.lifetimeStats.totalCoinsEarned >= 1000000, reward: { coins: 50000 } },
            { id: 'coins_10m', name: '💎 Мультимиллионер', description: 'Заработать 10 миллионов монет всего', condition: () => this.lifetimeStats.totalCoinsEarned >= 10000000, reward: { coins: 200000 } },
            { id: 'ore_50', name: '💎 Алмазная лихорадка', description: 'Накопить 50 руды', condition: () => this.lifetimeStats.totalOreCollected >= 50, reward: { coins: 5000 } },
            { id: 'ore_100', name: '👑 Магнат руды', description: 'Накопить 100 руды', condition: () => this.lifetimeStats.totalOreCollected >= 100, reward: { coins: 20000 } }
        ];
        
        // === УЛУЧШЕНИЯ ===
        this.upgradeAchievements = [
            { id: 'upg_10', name: '🔧 Модернизатор', description: 'Купить 10 улучшений', condition: () => this.getTotalUpgrades() >= 10, reward: { coins: 500 } },
            { id: 'upg_25', name: '🔧🔧 Инвестор', description: 'Купить 25 улучшений', condition: () => this.getTotalUpgrades() >= 25, reward: { coins: 2000 } },
            { id: 'upg_50', name: '⚙️ Мастер улучшений', description: 'Купить 50 улучшений', condition: () => this.getTotalUpgrades() >= 50, reward: { coins: 10000 } },
            { id: 'upg_max', name: '🦾 Макс уровень', description: 'Прокачать любое улучшение до максимума', condition: () => this.hasMaxedUpgrade(), reward: { coins: 2000 } },
            { id: 'autodrill', name: '🤖 Автоматизация', description: 'Разблокировать автобур', condition: () => this.game.upgrades.levels['auto_drill_unlock'] > 0, reward: { coins: 200 } },
            { id: 'all_basic', name: '⚙️ Инженер', description: 'Купить все базовые улучшения', condition: () => this.hasAllBasicUpgrades(), reward: { coins: 5000 } }
        ];
        
        // === ПРЕСТИЖ ===
        this.prestigeAchievements = [
            { id: 'prestige_1', name: '🔄 Новая жизнь', description: 'Выполнить 1-й престиж', condition: () => this.lifetimeStats.prestigeCount >= 1, reward: { coins: 1000 } },
            { id: 'prestige_10', name: '🏆 Легенда', description: 'Выполнить 10 престижей', condition: () => this.lifetimeStats.prestigeCount >= 10, reward: { coins: 50000, skin: 'golden' } },
            { id: 'prestige_25', name: '💫 Бессмертный', description: 'Выполнить 25 престижей', condition: () => this.lifetimeStats.prestigeCount >= 25, reward: { coins: 200000 } }
        ];
        
        // === СЕРИИ (ретеншен) ===
        this.streakAchievements = [
            { id: 'streak_2', name: '📅 Начало', description: 'Играть 2 дня подряд', condition: () => this.lifetimeStats.consecutiveDays >= 2, reward: { coins: 500 } },
            { id: 'streak_5', name: '📅📅 Привычка', description: 'Играть 5 дней подряд', condition: () => this.lifetimeStats.consecutiveDays >= 5, reward: { coins: 2000 } },
            { id: 'streak_7', name: '📅📅📅 Завсегдатай', description: 'Играть 7 дней подряд', condition: () => this.lifetimeStats.consecutiveDays >= 7, reward: { coins: 5000 } },
            { id: 'streak_14', name: '🔥 Фанат', description: 'Играть 14 дней подряд', condition: () => this.lifetimeStats.consecutiveDays >= 14, reward: { coins: 15000 } },
            { id: 'streak_30', name: '👑 Ветеран', description: 'Играть 30 дней подряд', condition: () => this.lifetimeStats.consecutiveDays >= 30, reward: { coins: 50000, skin: 'cyber' } }
        ];
        
        // === СЕКРЕТНЫЕ ===
        this.secretAchievements = [
            { id: 'secret_lucky', name: '🎰 Везунчик', description: 'Сделать 3 критических удара подряд', condition: () => this.hasAchievement('secret_lucky'), reward: { coins: 1000 } },
            { id: 'secret_lazy', name: '😴 Лентяй', description: 'Не кликать 60 секунд (только автобур)', condition: () => this.hasAchievement('secret_lazy'), reward: { coins: 500 } },
            { id: 'secret_night', name: '🌙 Ночная смена', description: 'Играть в 3-5 утра', condition: () => this.checkNightOwl(), reward: { coins: 2000 } }
        ];
        
        // Объединяем все категории
        this.allAchievements = [
            ...this.depthAchievements,
            ...this.clickAchievements,
            ...this.lifetimeClickAchievements,
            ...this.bossAchievements,
            ...this.economyAchievements,
            ...this.upgradeAchievements,
            ...this.prestigeAchievements,
            ...this.streakAchievements,
            ...this.secretAchievements
        ];
        
        // Инициализируем прогресс
        this.allAchievements.forEach(ach => {
            if (!this.progress[ach.id]) {
                this.progress[ach.id] = 0;
            }
        });
    }
    
    /**
     * Обновление (вызывается каждый кадр)
     */
    update(dt) {
        // Обновляем время игры
        this.lifetimeStats.playTime += dt;
        
        // Проверяем достижения
        this.checkAchievements();
    }
    
    /**
     * Проверка всех достижений
     */
    checkAchievements() {
        // Обновляем максимальную глубину
        const currentDepth = this.game.drill.depth;
        if (currentDepth > this.maxDepthEver) {
            this.maxDepthEver = currentDepth;
        }
        
        // Проверяем каждое достижение
        this.allAchievements.forEach(ach => {
            if (!this.unlocked.has(ach.id) && ach.condition()) {
                this.unlock(ach);
            }
        });
    }
    
    /**
     * Разблокировать достижение
     */
    unlock(achievement) {
        if (this.unlocked.has(achievement.id)) return;
        
        this.unlocked.add(achievement.id);
        
        // Выдаём награды
        this.giveReward(achievement.reward);
        
        // Добавляем в очередь уведомлений
        this.notificationQueue.push(achievement);
        this.processNotificationQueue();
        
        // Сохраняем
        this.game.saveManager.save();
        
        console.log('🏆 Достижение разблокировано:', achievement.name);
    }
    
    /**
     * Обработать очередь уведомлений
     */
    processNotificationQueue() {
        // Если уже показываем уведомление или очередь пуста — выходим
        if (this.isShowingNotification || this.notificationQueue.length === 0) {
            return;
        }
        
        // Берём первое достижение из очереди
        const achievement = this.notificationQueue.shift();
        this.isShowingNotification = true;
        
        // Показываем уведомление
        this.showUnlockNotification(achievement, () => {
            // После закрытия уведомления
            this.isShowingNotification = false;
            
            // Небольшая пауза перед следующим уведомлением
            setTimeout(() => {
                this.processNotificationQueue();
            }, 500);
        });
    }
    
    /**
     * Выдать награду
     */
    giveReward(reward) {
        if (!reward) return;
        
        if (reward.coins) {
            this.game.economy.addCoins(reward.coins);
        }
        
        if (reward.ore) {
            this.game.economy.addOre(reward.ore);
            this.lifetimeStats.totalOreCollected += reward.ore;
        }
        
        if (reward.skin) {
            this.unlockSkin(reward.skin);
        }
    }
    
    /**
     * Показать уведомление о получении достижения
     * @param {Object} achievement - достижение
     * @param {Function} onComplete - callback после закрытия уведомления
     */
    showUnlockNotification(achievement, onComplete) {
        // Звук достижения
        if (this.game.audio) {
            this.game.audio.playAchievement();
        }
        
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-info">
                <div class="achievement-title">Достижение разблокировано!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-reward">${this.formatReward(achievement.reward)}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Удаляем через 4 секунды
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
                // Вызываем callback после полного закрытия
                if (onComplete) onComplete();
            }, 500);
        }, 4000);
    }
    
    /**
     * Разблокировать скин
     */
    unlockSkin(skinId) {
        if (!this.game.skins.ownedSkins.includes(skinId)) {
            this.game.skins.ownedSkins.push(skinId);
            const skin = this.game.skins.skins.find(s => s.id === skinId);
            if (skin) {
                this.game.showNotification(`🎉 Получен эксклюзивный скин: ${skin.name}!`, '#ffd700', 5000);
            }
        }
    }
    
    /**
     * Форматировать награду для отображения
     */
    formatReward(reward) {
        if (!reward) return '';
        const parts = [];
        if (reward.coins) parts.push(`+${Utils.formatNumber(reward.coins)} 🪙`);
        if (reward.ore) parts.push(`+${reward.ore} 💎`);
        if (reward.skin) {
            const skin = this.game.skins.skins.find(s => s.id === reward.skin);
            parts.push(`Скин: ${skin ? skin.name : reward.skin}`);
        }
        return parts.join(' | ');
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    
    /**
     * Получить общее количество купленных улучшений
     */
    getTotalUpgrades() {
        return Object.values(this.game.upgrades.levels).reduce((a, b) => a + b, 0);
    }
    
    /**
     * Проверить есть ли максимально прокачанное улучшение
     */
    hasMaxedUpgrade() {
        for (const [id, level] of Object.entries(this.game.upgrades.levels)) {
            const upgrade = this.game.upgrades.upgrades.find(u => u.id === id);
            if (upgrade && level >= upgrade.maxLevel) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Проверить куплены ли все базовые улучшения
     */
    hasAllBasicUpgrades() {
        const basicUpgrades = this.game.upgrades.upgrades.filter(u => u.category === 'basic');
        return basicUpgrades.every(u => this.game.upgrades.levels[u.id] > 0);
    }
    
    /**
     * Проверить есть ли достижение
     */
    hasAchievement(id) {
        return this.unlocked.has(id);
    }
    
    /**
     * Проверить ночное время (3-5 утра)
     */
    checkNightOwl() {
        const hour = new Date().getHours();
        return hour >= 3 && hour < 5;
    }
    
    // === ОТСЛЕЖИВАНИЕ СОБЫТИЙ ===
    
    /**
     * Зарегистрировать клик
     */
    onClick() {
        this.sessionStats.clicks++;
        this.lifetimeStats.totalClicks++;
        
        // Проверяем серию кликов
        const now = Date.now();
        if (now - this.clickStreak.lastClickTime < 2000) {
            this.clickStreak.count++;
        } else {
            this.clickStreak.count = 1;
        }
        this.clickStreak.lastClickTime = now;
        
        // Проверяем секретное достижение "Лентяй" — сбрасываем
        if (this.clickStreak.count === 1 && this.sessionStats.clicks > 1) {
            // Первый клик после паузы
        }
    }
    
    /**
     * Зарегистрировать заработок монет
     */
    onCoinsEarned(amount) {
        this.lifetimeStats.totalCoinsEarned += amount;
    }
    
    /**
     * Зарегистрировать получение руды
     */
    onOreCollected(amount) {
        this.lifetimeStats.totalOreCollected += amount;
    }
    
    /**
     * Зарегистрировать победу над боссом
     */
    onBossDefeated(timeLeft, timeTotal) {
        this.lifetimeStats.bossesDefeated++;
        
        // Проверяем особые условия
        if (timeLeft < 3) {
            this.unlock({ id: 'boss_close', name: 'На грани', reward: { coins: 2000 } });
        }
        if (timeTotal - timeLeft < 15) {
            this.unlock({ id: 'boss_fast', name: 'Без промаха', reward: { coins: 5000 } });
        }
    }
    
    /**
     * Зарегистрировать престиж
     */
    onPrestige() {
        this.lifetimeStats.prestigeCount++;
        // Сбрасываем сессионные счетчики
        this.sessionStats.clicks = 0;
        this.sessionStats.startTime = Date.now();
    }
    
    /**
     * Зарегистрировать критический удар
     */
    onCritHit() {
        // Проверяем серию критов (будет отслеживаться отдельно в Drill.js)
    }
    
    /**
     * Проверить серию дней
     */
    checkDailyStreak() {
        const today = new Date().toDateString();
        const lastDate = this.lifetimeStats.lastPlayDate;
        
        if (lastDate) {
            const last = new Date(lastDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // Продолжаем серию
                this.lifetimeStats.consecutiveDays++;
            } else if (diffDays > 1) {
                // Серия прервалась
                this.lifetimeStats.consecutiveDays = 1;
            }
            // Если diffDays === 0, это тот же день — ничего не меняем
        } else {
            // Первый день игры
            this.lifetimeStats.consecutiveDays = 1;
        }
        
        this.lifetimeStats.lastPlayDate = today;
    }
    
    // === UI ===
    
    /**
     * Получить все категории для отображения
     */
    getCategories() {
        return [
            { id: 'depth', name: '🕳️ Глубина', achievements: this.depthAchievements },
            { id: 'clicks', name: '👆 Клики', achievements: [...this.clickAchievements, ...this.lifetimeClickAchievements] },
            { id: 'bosses', name: '☄️ Боссы', achievements: this.bossAchievements },
            { id: 'economy', name: '💰 Экономика', achievements: this.economyAchievements },
            { id: 'upgrades', name: '🔧 Улучшения', achievements: this.upgradeAchievements },
            { id: 'prestige', name: '🔄 Престиж', achievements: this.prestigeAchievements },
            { id: 'streaks', name: '📅 Серии', achievements: this.streakAchievements },
            { id: 'secret', name: '🔒 Секретные', achievements: this.secretAchievements }
        ];
    }
    
    /**
     * Получить прогресс достижения (0-100%)
     */
    getProgress(achievement) {
        // Для разных типов достижений считаем прогресс по-разному
        if (achievement.id.startsWith('depth_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.maxDepthEver / target) * 100);
        }
        if (achievement.id.startsWith('clicks_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.sessionStats.clicks / target) * 100);
        }
        if (achievement.id.startsWith('lt_clicks_')) {
            const target = parseInt(achievement.id.split('_')[2]);
            return Math.min(100, (this.lifetimeStats.totalClicks / target) * 100);
        }
        if (achievement.id.startsWith('boss_') && !isNaN(parseInt(achievement.id.split('_')[1]))) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.lifetimeStats.bossesDefeated / target) * 100);
        }
        if (achievement.id.startsWith('coins_')) {
            const target = this.parseCoinTarget(achievement.id);
            return Math.min(100, (this.lifetimeStats.totalCoinsEarned / target) * 100);
        }
        if (achievement.id.startsWith('ore_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.lifetimeStats.totalOreCollected / target) * 100);
        }
        if (achievement.id.startsWith('upg_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            if (!isNaN(target)) {
                return Math.min(100, (this.getTotalUpgrades() / target) * 100);
            }
        }
        if (achievement.id.startsWith('prestige_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.lifetimeStats.prestigeCount / target) * 100);
        }
        if (achievement.id.startsWith('streak_')) {
            const target = parseInt(achievement.id.split('_')[1]);
            return Math.min(100, (this.lifetimeStats.consecutiveDays / target) * 100);
        }
        
        return this.unlocked.has(achievement.id) ? 100 : 0;
    }
    
    /**
     * Парсить цель для монет
     */
    parseCoinTarget(id) {
        const parts = id.split('_');
        if (parts[1] === '1m') return 1000000;
        if (parts[1] === '10m') return 10000000;
        return parseInt(parts[1]);
    }
    
    /**
     * Получить статистику
     */
    getStats() {
        const total = this.allAchievements.length;
        const unlocked = this.unlocked.size;
        
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100)
        };
    }
    
    // === СОХРАНЕНИЕ ===
    
    /**
     * Сохранение
     */
    save() {
        return {
            unlocked: Array.from(this.unlocked),
            progress: this.progress,
            maxDepthEver: this.maxDepthEver,
            lifetimeStats: this.lifetimeStats
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) {
            // Первый запуск — проверяем серию дней
            this.checkDailyStreak();
            return;
        }
        
        if (data.unlocked) {
            this.unlocked = new Set(data.unlocked);
        }
        if (data.progress) {
            this.progress = data.progress;
        }
        if (data.maxDepthEver) {
            this.maxDepthEver = data.maxDepthEver;
        }
        if (data.lifetimeStats) {
            // Полное слияние объектов для сохранения всех полей
            this.lifetimeStats = {
                totalClicks: data.lifetimeStats.totalClicks || 0,
                totalCoinsEarned: data.lifetimeStats.totalCoinsEarned || 0,
                totalOreCollected: data.lifetimeStats.totalOreCollected || 0,
                bossesDefeated: data.lifetimeStats.bossesDefeated || 0,
                prestigeCount: data.lifetimeStats.prestigeCount || 0,
                playTime: data.lifetimeStats.playTime || 0,
                consecutiveDays: data.lifetimeStats.consecutiveDays || 0,
                lastPlayDate: data.lifetimeStats.lastPlayDate || null
            };
        }
        
        // Проверяем серию дней при загрузке
        this.checkDailyStreak();
    }
}
