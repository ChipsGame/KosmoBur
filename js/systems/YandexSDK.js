/**
 * ИНТЕГРАЦИЯ С ЯНДЕКС SDK
 * Реклама, полноэкранный режим, лидерборды
 */
class YandexSDK {
    constructor() {
        this.ysdk = null;
        this.player = null;
        this.isReady = false;
        
        // Реклама
        this.adTimer = 0;
        this.adInterval = 180; // 3 минуты между рекламой
        this.isAdShowing = false;
    }
    
    async init() {
        if (typeof YaGames === 'undefined') {
            console.warn('YaGames SDK не доступен');
            return false;
        }
        
        try {
            this.ysdk = await YaGames.init();
            this.player = await this.ysdk.getPlayer();
            this.isReady = true;
            
            console.log('Yandex SDK инициализирован');
            
            // Настраиваем обработчики жизненного цикла для мобильных
            this.setupLifecycleHandlers();
            
            // Показываем рекламу сразу при запуске игры
            setTimeout(() => this.showFullscreenAd(), 2000);
            
            return true;
        } catch (e) {
            console.error('Ошибка инициализации Yandex SDK:', e);
            return false;
        }
    }
    
    /**
     * Настроить обработчики жизненного цикла приложения
     * Важно для правильной работы паузы на мобильных
     */
    setupLifecycleHandlers() {
        if (!this.ysdk) return;
        
        // Обработчик событий жизненного цикла приложения
        this.ysdk.on('game_api_pause', () => {
            console.log('Yandex SDK: игра приостановлена');
            if (window.game) window.game.pause();
        });
        
        this.ysdk.on('game_api_resume', () => {
            console.log('Yandex SDK: игра возобновлена');
            // НЕ снимаем паузу автоматически - игрок сам нажмёт ▶️
            // Но проверяем оффлайн-прогресс
            if (window.game && window.game.offlineProgress) {
                setTimeout(() => {
                    window.game.offlineProgress.checkOnStart();
                }, 500);
            }
        });
    }
    
    /**
     * Показать полноэкранную рекламу
     */
    async showFullscreenAd() {
        if (!this.isReady || this.isAdShowing) return;
        
        // Проверяем интервал
        if (this.adTimer < this.adInterval) return;
        
        this.isAdShowing = true;
        
        try {
            await this.ysdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        console.log('Реклама открыта');
                        // Ставим игру на паузу
                        if (window.game) window.game.pause();
                    },
                    onClose: (wasShown) => {
                        console.log('Реклама закрыта, показана:', wasShown);
                        this.isAdShowing = false;
                        this.adTimer = 0;
                        // Возобновляем игру
                        if (window.game) window.game.resume();
                    },
                    onError: (error) => {
                        console.error('Ошибка рекламы:', error);
                        this.isAdShowing = false;
                        if (window.game) window.game.resume();
                    }
                }
            });
        } catch (e) {
            console.error('Ошибка показа рекламы:', e);
            this.isAdShowing = false;
            if (window.game) window.game.resume();
        }
    }
    
    /**
     * Показать рекламу с наградой
     */
    async showRewardedAd(onReward) {
        if (!this.isReady || this.isAdShowing) return false;
        
        this.isAdShowing = true;
        let rewardReceived = false;
        
        return new Promise((resolve) => {
            this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        console.log('Rewarded реклама открыта');
                        if (window.game) window.game.pause();
                    },
                    onRewarded: () => {
                        console.log('Награда получена!');
                        rewardReceived = true;
                        if (onReward) onReward();
                    },
                    onClose: () => {
                        console.log('Rewarded реклама закрыта, награда:', rewardReceived);
                        this.isAdShowing = false;
                        // Возобновляем игру только если награда была получена
                        // или если игрок закрыл без награды - тогда он сам нажмёт ▶️
                        if (window.game) {
                            if (rewardReceived) {
                                window.game.resume();
                            }
                            // Если награды не было - игра остаётся на паузе
                        }
                        resolve(rewardReceived);
                    },
                    onError: (error) => {
                        console.error('Ошибка rewarded рекламы:', error);
                        this.isAdShowing = false;
                        // При ошибке тоже не снимаем паузу автоматически
                        resolve(false);
                    }
                }
            });
        });
    }
    
    /**
     * Открыть полноэкранный режим
     */
    async enterFullscreen() {
        if (!this.isReady) return;
        
        try {
            // Пытаемся войти в полноэкранный режим
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn('Не удалось войти в полноэкранный режим:', e);
        }
    }
    
    /**
     * Обновление таймера рекламы
     */
    update(dt) {
        this.adTimer += dt;
        
        // Автопоказ рекламы каждые 3 минуты
        if (this.adTimer >= this.adInterval) {
            this.showFullscreenAd();
        }
    }
    
    /**
     * Показать баннерную рекламу (если нужно)
     */
    async showBanner() {
        // Баннерная реклама обычно настраивается в консоли разработчика
        // Здесь можно добавить логику если нужно
    }
    
    /**
     * Отправить очки в лидерборд
     */
    async setLeaderboardScore(score) {
        if (!this.isReady) return;
        
        try {
            const lb = await this.ysdk.getLeaderboards();
            await lb.setLeaderboardScore('depth', Math.floor(score));
            console.log('Очки отправлены в лидерборд:', score);
        } catch (e) {
            console.error('Ошибка отправки в лидерборд:', e);
        }
    }
    
    /**
     * Получить язык пользователя
     */
    getLanguage() {
        if (!this.isReady) return 'ru';
        return this.ysdk.environment.i18n.lang || 'ru';
    }
}

// Создаём глобальный экземпляр
window.yandexSDK = new YandexSDK();
