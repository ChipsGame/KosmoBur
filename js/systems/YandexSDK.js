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
            // YaGames SDK не доступен
            return false;
        }
        
        try {
            this.ysdk = await YaGames.init();
            this.player = await this.ysdk.getPlayer();
            this.isReady = true;
            
            // Yandex SDK инициализирован
            
            // Настраиваем обработчики жизненного цикла для мобильных
            this.setupLifecycleHandlers();
            
            // Показываем рекламу сразу при запуске игры
            setTimeout(() => this.showFullscreenAd(), 2000);
            
            return true;
        } catch (e) {
            // Ошибка инициализации Yandex SDK
            return false;
        }
    }
    
    /**
     * Настроить обработчики жизненного цикла приложения
     * Важно для правильной работы паузы на мобильных
     * ТРЕБОВАНИЯ ЯНДЕКС ИГР: Музыка на паузе при сворачивании
     */
    setupLifecycleHandlers() {
        if (!this.ysdk) return;
        
        // Обработчик событий жизненного цикла приложения
        this.ysdk.on('game_api_pause', () => {
            // Yandex SDK: игра приостановлена
            if (window.game) {
                window.game.pause();
                // Ставим музыку на паузу (требование Яндекс Игр)
                if (window.game.audio) {
                    window.game.audio.pauseForAd();
                }
            }
        });
        
        this.ysdk.on('game_api_resume', () => {
            // Yandex SDK: игра возобновлена
            // НЕ снимаем паузу автоматически - игрок сам нажмёт ▶️
            // Но проверяем оффлайн-прогресс
            if (window.game && window.game.offlineProgress) {
                setTimeout(() => {
                    window.game.offlineProgress.checkOnStart();
                }, 500);
            }
            // Музыка возобновится когда игрок сам снимет паузу
        });
    }
    
    /**
     * Показать полноэкранную рекламу
     * ТРЕБОВАНИЯ ЯНДЕКС ИГР: Музыка на паузе во время рекламы
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
                        // Реклама открыта
                        // Ставим игру на паузу и музыку на паузу (требование Яндекс Игр)
                        if (window.game) {
                            window.game.pause();
                            if (window.game.audio) {
                                window.game.audio.pauseForAd();
                            }
                        }
                    },
                    onClose: (wasShown) => {
                        // Реклама закрыта
                        this.isAdShowing = false;
                        this.adTimer = 0;
                        // Возобновляем игру и звук
                        if (window.game) {
                            window.game.resume();
                            if (window.game.audio) {
                                window.game.audio.resumeAfterAd();
                            }
                        }
                    },
                    onError: (error) => {
                        // Ошибка рекламы
                        this.isAdShowing = false;
                        if (window.game) {
                            window.game.resume();
                            if (window.game.audio) {
                                window.game.audio.resumeAfterAd();
                            }
                        }
                    }
                }
            });
        } catch (e) {
            // Ошибка показа рекламы
            this.isAdShowing = false;
            if (window.game) {
                window.game.resume();
                if (window.game.audio) {
                    window.game.audio.resumeAfterAd();
                }
            }
        }
    }
    
    /**
     * Показать рекламу с наградой
     * ТРЕБОВАНИЯ ЯНДЕКС ИГР: Музыка на паузе во время рекламы
     */
    async showRewardedAd(onReward) {
        if (!this.isReady || this.isAdShowing) return false;
        
        this.isAdShowing = true;
        let rewardReceived = false;
        
        return new Promise((resolve) => {
            this.ysdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        // Rewarded реклама открыта
                        // Ставим игру и музыку на паузу (требование Яндекс Игр)
                        if (window.game) {
                            window.game.pause();
                            if (window.game.audio) {
                                window.game.audio.pauseForAd();
                            }
                        }
                    },
                    onRewarded: () => {
                        // Награда получена!
                        rewardReceived = true;
                        if (onReward) onReward();
                    },
                    onClose: () => {
                        // Rewarded реклама закрыта
                        this.isAdShowing = false;
                        // Возобновляем игру только если награда была получена
                        // или если игрок закрыл без награды - тогда он сам нажмёт ▶️
                        if (window.game) {
                            if (rewardReceived) {
                                window.game.resume();
                            }
                            // В любом случае возобновляем музыку
                            if (window.game.audio) {
                                window.game.audio.resumeAfterAd();
                            }
                            // Если награды не было - игра остаётся на паузе
                        }
                        resolve(rewardReceived);
                    },
                    onError: (error) => {
                        // Ошибка rewarded рекламы
                        this.isAdShowing = false;
                        // При ошибке возобновляем музыку но не снимаем паузу
                        if (window.game && window.game.audio) {
                            window.game.audio.resumeAfterAd();
                        }
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
            // Не удалось войти в полноэкранный режим
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
            // Очки отправлены в лидерборд
        } catch (e) {
            // Ошибка отправки в лидерборд
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
