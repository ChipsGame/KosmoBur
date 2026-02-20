/**
 * СИСТЕМА СОХРАНЕНИЙ
 * Поддерживает localStorage (для тестов) и Yandex SDK (для продакшена)
 */
class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveInterval = 5; // секунд
        this.timer = 0;
        this.isYandex = false;
        this.player = null;
        
        this.init();
    }
    
    async init() {
        // Проверяем доступность Yandex SDK
        // Используем window.yandexSDK который создается в YandexSDK.js
        if (window.yandexSDK && window.yandexSDK.isReady) {
            try {
                this.player = window.yandexSDK.player;
                this.isYandex = true;
                console.log('Yandex Player инициализирован');
            } catch (e) {
                console.warn('Не удалось инициализировать Yandex Player:', e);
                this.isYandex = false;
            }
        }
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.saveInterval) {
            this.save();
            this.timer = 0;
        }
    }

    async save() {
        const data = {
            economy: {
                coins: this.game.economy.coins,
                ore: this.game.economy.ore,
                totalEarned: this.game.economy.totalEarned
            },
            drill: {
                depth: this.game.drill.depth,
                y: this.game.drill.y
            },
            upgrades: this.game.upgrades.levels,
            progress: {
                currentLayer: this.game.currentLayer
            },
            stats: {
                totalLayersDestroyed: this.game.currentLayer,
                playTime: Date.now()
            },
            autoDrill: this.game.autoDrill.save(),
            prestige: this.game.prestige.save(),
            dailyRewards: this.game.dailyRewards.save(),
            skins: this.game.skins.save(),
            bossSystem: this.game.bossSystem.save()
        };

        const jsonData = JSON.stringify(data);

        // Сохраняем в Yandex SDK если доступно
        if (this.isYandex && this.player) {
            try {
                await this.player.setData({
                    drillGameSave: jsonData
                });
                console.log('Игра сохранена в Yandex');
            } catch (e) {
                console.error('Ошибка сохранения в Yandex:', e);
                // Fallback на localStorage
                localStorage.setItem('drillGame_save', jsonData);
            }
        } else {
            // Fallback на localStorage
            localStorage.setItem('drillGame_save', jsonData);
        }
    }

    async load() {
        let saved = null;

        // Пробуем загрузить из Yandex SDK
        if (this.isYandex && this.player) {
            try {
                const data = await this.player.getData();
                if (data && data.drillGameSave) {
                    saved = data.drillGameSave;
                    console.log('Игра загружена из Yandex');
                }
            } catch (e) {
                console.error('Ошибка загрузки из Yandex:', e);
            }
        }

        // Fallback на localStorage
        if (!saved) {
            saved = localStorage.getItem('drillGame_save');
        }

        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            // Восстановление экономики
            this.game.economy.coins = data.economy?.coins || 0;
            this.game.economy.ore = data.economy?.ore || 0;
            this.game.economy.totalEarned = data.economy?.totalEarned || 0;

            // Восстановление прокачки
            if (data.upgrades) {
                Object.assign(this.game.upgrades.levels, data.upgrades);
                Object.keys(data.upgrades).forEach(id => {
                    this.game.upgrades.applyUpgrade(id);
                });
            }

            // Восстановление прогресса
            if (data.progress) {
                this.game.currentLayer = data.progress.currentLayer || 0;
            }

            // Восстановление позиции
            if (data.drill) {
                this.game.drill.y = data.drill.y || 200;
                this.game.drill.targetY = data.drill.y || 200;
                this.game.drill.depth = data.drill.depth || 0;
            }
            
            // Восстановление новых систем
            if (data.autoDrill) {
                this.game.autoDrill.load(data.autoDrill);
            }
            if (data.prestige) {
                this.game.prestige.load(data.prestige);
            }
            if (data.dailyRewards) {
                this.game.dailyRewards.load(data.dailyRewards);
            }
            if (data.skins) {
                this.game.skins.load(data.skins);
            }
            if (data.bossSystem) {
                this.game.bossSystem.load(data.bossSystem);
            }

            console.log('Игра загружена');
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }
}
