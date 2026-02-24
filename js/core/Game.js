/*
 * КОСМИЧЕСКИЙ БУР - Главный класс игры
 * Версия: 1.1 (Оптимизированная)
 * Ориентация: Портрет (9:16)
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // === УПРОЩЁННАЯ СИСТЕМА МАСШТАБИРОВАНИЯ ===
        const dpr = window.devicePixelRatio || 1;
        
        // Получаем реальные размеры viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Устанавливаем canvas размеры с учётом DPR
        this.canvas.width = Math.floor(viewportWidth * dpr);
        this.canvas.height = Math.floor(viewportHeight * dpr);
        
        // CSS размеры canvas = viewport
        this.canvas.style.width = viewportWidth + 'px';
        this.canvas.style.height = viewportHeight + 'px';
        
        // Определяем базовую ширину игрового мира
        const isMobile = viewportWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Для мобильных: логическая ширина = CSS ширина * 3 (для удобства расчётов)
            this.baseWidth = viewportWidth * 3;
        } else {
            // Для десктопа: большая логическая ширина для "отдалённой камеры"
            this.baseWidth = viewportWidth * 6;
        }
        
        // scale = сколько игровых пикселей в одном CSS пикселе
        this.scale = this.baseWidth / viewportWidth;
        
        // Логические размеры игрового мира
        this.width = this.baseWidth;
        this.height = viewportHeight * this.scale;
        
        // === МАСШТАБИРОВАНИЕ: Приводим игровые координаты к пикселям canvas ===
        // canvas пиксель = игровой пиксель * (dpr / scale)
        this.renderScale = dpr / this.scale;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.renderScale, this.renderScale);

        // Инициализация систем
        this.renderer = new Renderer(this);
        this.input = new Input(this);
        this.economy = new Economy();
        this.upgrades = new Upgrades(this);
        
        // Новые системы для удержания игроков
        this.autoDrill = new AutoDrill(this);
        this.prestige = new Prestige(this);
        this.offlineProgress = new OfflineProgress(this);
        this.dailyRewards = new DailyRewards(this);
        this.skins = new Skins(this);
        this.bossSystem = new BossSystem(this);
        this.achievements = new Achievements(this);
        this.audio = new AudioSystem(this);

        this.saveManager = new SaveManager(this);

        // Сущности
        this.drill = new Drill(this);
        this.layers = [];
        this.particles = [];
        this.floatingText = new FloatingTextManager(this);
        
        // Флаг видимости плит (скрываем во время боя с боссом)
        this.layersVisible = true;

        // Состояние игры
        this.isRunning = false;
        this.isPaused = false; // Для паузы при сворачивании
        this.lastTime = 0;
        this.camera = { y: 0 };

        // Счётчик пройденных слоёв
        this.currentLayer = 0;
        
        // Оптимизация: флаг для отслеживания первого запуска
        this.firstFrame = true;
        // Оптимизация: кэш для быстрого доступа к видимым слоям
        this.visibleLayers = [];
        
        // Флаг показа уведомления о престиже
        this.prestigeNotificationShown = false;

        // Делаем игру глобально доступной
        window.game = this;

        // === iOS ФИКС: Принудительное обновление размеров для iPhone 7 ===
        this.fixiOSViewport();

        this.init();
    }

    /**
     * iOS специфичный фикс для viewport
     * iPhone 7 и старые устройства иногда неправильно сообщают размеры
     */
    fixiOSViewport() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS) return;
        
        // Принудительно устанавливаем размеры canvas
        const fixViewport = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.canvas.width = Math.floor(w * dpr);
            this.canvas.height = Math.floor(h * dpr);
            
            // Обновляем матрицу трансформации
            this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
        };
        
        // Применяем сразу и с задержкой (iOS иногда меняет размеры после загрузки)
        fixViewport();
        setTimeout(fixViewport, 100);
        setTimeout(fixViewport, 500);
    }

    async init() {
        this.setupEventListeners();
        this.createStarfield();
        this.generateInitialLayers();
        await this.saveManager.load();
        // ПОСЛЕ загрузки пересоздаём слои, так как позиция бура могла измениться
        this.regenerateLayersAfterLoad();
        
        // Применяем бонусы престижа
        this.prestige.applyBonuses();
        
        // Проверяем достижения после полной загрузки (с небольшой задержкой)
        setTimeout(() => {
            this.achievements.checkAchievements();
        }, 100);
        
        // Проверяем оффлайн-прогресс и ежедневные награды
        this.checkOfflineAndDaily();
        
        this.start();
    }
    
    checkOfflineAndDaily() {
        // Проверяем что загрузка завершена
        setTimeout(() => {
            // Сначала показываем ежедневную награду если доступна
            this.dailyRewards.checkOnStart();
            
            // Затем оффлайн-прогресс
            setTimeout(() => {
                this.offlineProgress.checkOnStart();
            }, 500);
        }, 500);
        
        // === ОБРАБОТКА ВИДИМОСТИ СТРАНИЦЫ (пауза при сворачивании) ===
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Сохраняем время выхода ДО паузы
                this.offlineProgress.saveExitTime();
                // Ставим на паузу
                this.pause();
            } else {
                // ПРОВЕРЯЕМ оффлайн-прогресс, но НЕ снимаем паузу автоматически!
                setTimeout(() => {
                    this.offlineProgress.checkOnStart();
                }, 500);
                // Игрок сам должен нажать кнопку или кликнуть на экран паузы
            }
        });
        
        // === ДОПОЛНИТЕЛЬНЫЕ ОБРАБОТЧИКИ ДЛЯ МОБИЛЬНЫХ ===
        // pagehide - срабатывает при сворачивании приложения на iOS/Android
        window.addEventListener('pagehide', (e) => {
            this.offlineProgress.saveExitTime();
            this.pause();
        });
        
        // freeze - срабатывает когда страница замораживается браузером
        document.addEventListener('freeze', () => {
            this.offlineProgress.saveExitTime();
            this.pause();
        });
        
        // resume - когда страница размораживается
        document.addEventListener('resume', () => {
            // НЕ снимаем паузу автоматически
            setTimeout(() => {
                this.offlineProgress.checkOnStart();
            }, 500);
        });
        
        // blur - когда окно теряет фокус (резервный вариант)
        window.addEventListener('blur', () => {
            // Небольшая задержка чтобы отличить от обычных кликов
            this._blurTimeout = setTimeout(() => {
                this.offlineProgress.saveExitTime();
                this.pause();
            }, 100);
        });
        
        // focus - когда окно получает фокус
        window.addEventListener('focus', () => {
            if (this._blurTimeout) {
                clearTimeout(this._blurTimeout);
                this._blurTimeout = null;
            }
        });
        
        // Сохраняем время выхода при закрытии страницы
        window.addEventListener('beforeunload', () => {
            this.offlineProgress.saveExitTime();
        });
        
        // === БЛОКИРОВКА КОНТЕКСТНОГО МЕНЮ ВЕЗДЕ ===
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true); // true = перехват на этапе capture
        
        // Блокировка на всех элементах
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        });
        
        // === ПАУЗА ТОЛЬКО ПРИ СВОРАЧИВАНИИ ВКЛАДКИ ===
        // blur/focus убраны - они мешают при открытии DevTools
        
        // === ПРЕДОТВРАЩЕНИЕ УХОДА В СОН НА МОБИЛЬНЫХ ===
        // Блокируем стандартное поведение при свайпах ТОЛЬКО на canvas
        // НЕ блокируем на модальных окнах
        document.addEventListener('touchmove', (e) => {
            const modal = document.querySelector('.modal:not(.hidden)');
            if (modal && (e.target.closest('.modal') || e.target.closest('.modal-content'))) {
                // Если открыто модальное окно и тач внутри него - не блокируем
                return;
            }
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * Поставить игру на паузу
     */
    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        // НЕ сбрасываем isRunning - loop должен продолжать работать для рендера
        document.getElementById('pause-screen').classList.add('active');
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) btnPause.textContent = '▶️';
        
        // Останавливаем аудио контекст (SFX)
        if (this.audio && this.audio.audioContext) {
            this.audio.audioContext.suspend();
        }
        // Ставим музыку на паузу (без сброса позиции)
        if (this.audio) {
            this.audio.pauseMusic();
        }
        
        // Игра на паузе
    }
    
    /**
     * Возобновить игру
     */
    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.isRunning = true;
        this.lastTime = performance.now();
        document.getElementById('pause-screen').classList.remove('active');
        const btnPause = document.getElementById('btn-pause');
        if (btnPause) btnPause.textContent = '⏸️';
        
        // Возобновляем аудио
        if (this.audio) {
            this.audio.resume();
        }
        
        // Игра возобновлена
    }
    
    /**
     * Остановить все аудио (для паузы)
     */
    stopAllAudio() {
        // Останавливаем аудио контекст (SFX)
        if (this.audio && this.audio.audioContext) {
            this.audio.audioContext.suspend();
        }
        // Ставим музыку на паузу
        if (this.audio) {
            this.audio.pauseMusic();
        }
    }
    
    /**
     * Переключить паузу
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    createStarfield() {
        const container = document.getElementById('game-container');
        
        // Создаём звёздное небо - слой 1 (медленные звёзды)
        const stars1 = document.createElement('div');
        stars1.className = 'stars-bg';
        container.insertBefore(stars1, container.firstChild);
        
        // Создаём звёздное небо - слой 2 (быстрые звёзды)
        const stars2 = document.createElement('div');
        stars2.className = 'stars-bg-2';
        container.insertBefore(stars2, container.firstChild);
        
        // Создаём мерцающие звёзды
        const twinkle = document.createElement('div');
        twinkle.className = 'stars-twinkle';
        container.insertBefore(twinkle, container.firstChild);
        
        // Создаём планеты
        const planet1 = document.createElement('div');
        planet1.className = 'planet-bg';
        container.insertBefore(planet1, container.firstChild);
        
        const planet2 = document.createElement('div');
        planet2.className = 'planet-bg-2';
        container.insertBefore(planet2, container.firstChild);
        
        // Создаём метеоры (только 3 для производительности)
        for (let i = 0; i < 3; i++) {
            const meteor = document.createElement('div');
            meteor.className = 'meteor';
            container.insertBefore(meteor, container.firstChild);
        }
    }
    
    regenerateLayersAfterLoad() {
        // Если позиция бура сильно изменилась (загрузка сохранения),
        // пересоздаём слои относительно новой позиции
        if (this.drill.y > 400) {
            this.layers = [];
            
            // Вычисляем сколько слоёв нужно создать
            const layerHeight = 80;
            const startY = 200 + 100 + 40 + 20; // Позиция первого слоя
            const layersNeeded = Math.max(10, Math.floor((this.drill.y - startY) / layerHeight) + 5);
            
            for (let i = 0; i < layersNeeded; i++) {
                this.addLayer(this.currentLayer + i);
            }
            this.currentLayer += layersNeeded;
            this.updateVisibleLayers();
            // Сбрасываем камеру на новую позицию
            this.camera.y = this.drill.y - 300;
        }
    }

    setupEventListeners() {
        // Активация аудио при первом взаимодействии (требование браузеров)
        const activateAudio = () => {
            if (this.audio) {
                this.audio.resume();
            }
        };
        
        // Несколько событий для гарантии (разные браузеры/устройства)
        const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
        const activateOnce = () => {
            activateAudio();
            // Удаляем все обработчики после первого срабатывания
            events.forEach(evt => {
                document.removeEventListener(evt, activateOnce, true);
            });
        };
        
        events.forEach(evt => {
            document.addEventListener(evt, activateOnce, true);
        });
        
        // Кнопки меню
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            if (this.audio) this.audio.playButtonClick();
            this.openModal('modal-upgrades');
            this.upgrades.renderUI();
            // Фикс скролла для мобильных - применяем стили после открытия
            const modalContent = document.querySelector('#modal-upgrades .modal-content');
            if (modalContent) {
                modalContent.style.touchAction = 'pan-y';
                modalContent.style.webkitOverflowScrolling = 'touch';
                modalContent.style.overscrollBehavior = 'contain';
            }
        });

        document.getElementById('btn-achievements').addEventListener('click', () => {
            if (this.audio) this.audio.playButtonClick();
            this.openModal('modal-achievements');
            this.renderAchievementsList();
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            if (this.audio) this.audio.playButtonClick();
            this.showSettingsMenu();
        });
        
        // Кнопка паузы
        document.getElementById('btn-pause').addEventListener('click', () => {
            if (this.audio) this.audio.playButtonClick();
            this.togglePause();
        });
        
        // Клик на экран паузы для продолжения
        document.getElementById('pause-screen').addEventListener('click', () => {
            if (this.audio) this.audio.playButtonClick();
            this.resume();
        });
        
        // Кнопка рекламы - открывает меню выбора рекламы
        const btnAd = document.getElementById('btn-ad');
        if (btnAd) {
            btnAd.addEventListener('click', () => {
                if (this.audio) this.audio.playButtonClick();
                this.showAdRewardsMenu();
            });
        }

        // Закрытие модалок
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.audio) this.audio.playMenuClose();
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Ресайз
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        
        // === iOS: Обработка смены ориентации ===
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 300);
        });
        
        // === ЗВУКИ HOVER ДЛЯ КНОПОК ===
        this.setupButtonHoverSounds();
        
        // === ФИКС СКРОЛЛА ДЛЯ МОДАЛЬНЫХ ОКОН НА МОБИЛЬНЫХ ===
        this.setupModalScrollFix();
    }
    
    /**
     * Настройка звуков hover для кнопок
     */
    setupButtonHoverSounds() {
        // Используем делегирование событий для всех кнопок
        document.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                // Не играем звук слишком часто (не чаще чем раз в 100мс)
                const now = Date.now();
                if (!this._lastHoverSound || now - this._lastHoverSound > 100) {
                    this._lastHoverSound = now;
                    if (this.audio) this.audio.playButtonHover();
                }
            }
        });
    }
    
    /**
     * Фикс для скролла в модальных окнах на мобильных устройствах
     * Упрощённая версия - полагаемся на CSS
     */
    setupModalScrollFix() {
        // Ничего не делаем - все фиксы в CSS и в едином обработчике touchmove выше
        // Modal scroll fix initialized
    }

    handleResize() {
        // === УПРОЩЁННОЕ МАСШТАБИРОВАНИЕ ===
        const dpr = window.devicePixelRatio || 1;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Устанавливаем Canvas размеры
        this.canvas.width = Math.floor(viewportWidth * dpr);
        this.canvas.height = Math.floor(viewportHeight * dpr);
        this.canvas.style.width = viewportWidth + 'px';
        this.canvas.style.height = viewportHeight + 'px';
        
        // Пересчитываем базовую ширину
        const isMobile = viewportWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            this.baseWidth = viewportWidth * 3;
        } else {
            // Для десктопа: ширина = CSS ширина * 2 (для отдалённой камеры, но не слишком)
            this.baseWidth = viewportWidth * 2;
        }
        
        this.scale = this.baseWidth / viewportWidth;
        this.width = this.baseWidth;
        this.height = viewportHeight * this.scale;
        
        // Масштабирование матрицы
        this.renderScale = dpr / this.scale;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.renderScale, this.renderScale);
        
        // Пересчитываем позицию бура
        if (this.drill) {
            this.drill.onResize();
        }
        
        // Обновляем все слои
        for (let layer of this.layers) {
            layer.onResize();
        }
        
        // Адаптация для разных экранов
        this.adaptToShortScreen();
    }
    
    adaptToShortScreen() {
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        
        // Логирование для отладки
        // Размер экрана
        
        // Если экран очень короткий (менее 500px)
        if (screenHeight < 500) {
            // Короткий экран обнаружен
            document.body.classList.add('short-screen');
        } else {
            document.body.classList.remove('short-screen');
        }
        
        // Если экран очень узкий (менее 400px)
        if (screenWidth < 400) {
            // Узкий экран обнаружен
            document.body.classList.add('narrow-screen');
        } else {
            document.body.classList.remove('narrow-screen');
        }
    }

    generateInitialLayers() {
        // Оптимизация: создаем только 10 слоев вместо 20 для быстрой загрузки
        // Создание начальных слоев
        for (let i = 0; i < 10; i++) {
            this.addLayer(i);
        }
        // Начальные слои созданы
        
        // ВАЖНО: сразу обновляем видимые слои для первого рендера
        this.updateVisibleLayers();
        
        // Позиционируем камеру так, чтобы бур был в центре первого слоя
        this.adjustInitialCamera();
    }
    
    adjustInitialCamera() {
        // Устанавливаем камеру так, чтобы бур был виден правильно
        // Бур начинается на позиции y (150 для коротких экранов, 200 для больших)
        // Мы хотим, чтобы первый слой был немного ниже бура для начала бурения
        this.camera.y = this.drill.y - 300;
        
        // Также устанавливаем targetY для бура, чтобы он начал с правильной позиции
        this.drill.targetY = this.drill.y;
        // Начальная позиция бура
    }

    addLayer(index) {
        // Получаем позицию Y последнего слоя (если он есть)
        let previousLayerY = null;
        if (this.layers.length > 0) {
            const lastLayer = this.layers[this.layers.length - 1];
            previousLayerY = lastLayer.y;
        }
        
        const layer = new Layer(this, index, previousLayerY);
        this.layers.push(layer);
        return layer;
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // Оптимизация: даем кадр на полную отрисовку перед началом игры
        setTimeout(() => {
            requestAnimationFrame((t) => this.loop(t));
        }, 50);
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        
        try {
            // Если на паузе - не обновляем, но продолжаем рендерить
            if (this.isPaused) {
                this.render();
                requestAnimationFrame((t) => this.loop(t));
                return;
            }

            const deltaTime = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;
            
            // Оптимизация: пропускаем кадры если deltaTime слишком большая
            if (deltaTime > 0.1) {
                // Пропущен кадр
                requestAnimationFrame((t) => this.loop(t));
                return;
            }

            this.update(deltaTime);
            this.render();
        } catch (e) {
            // Ошибка в game loop
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Оптимизация: обновляем только видимые слои и те, что близко к буру
        this.updateVisibleLayers();
        
        // Обновляем ввод (клики)
        this.input.update();
        
        // Обновляем эффекты кликов
        this.input.updateClickEffects(dt);
        
        // Обновляем босса
        this.bossSystem.update(dt);
        
        // Обновляем баффы босса (всегда)
        this.bossSystem.updateBonuses();

        // Обновляем бур (только если нет босса)
        if (!this.bossSystem.active) {
            this.drill.update(dt);
        }
        
        // Обновляем автобур
        this.autoDrill.update(dt);

        // Обновляем только видимые слои
        for (let layer of this.visibleLayers) {
            layer.update(dt);
        }

        // Обновляем частицы
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return p.life > 0;
        });
        
        // Обновляем всплывающий текст
        this.floatingText.update(dt);

        // Генерация новых слоёв (только если нужно)
        this.generateNewLayersIfNeeded();

        // Очистка старых слоёв (оптимизированная)
        this.cleanupOldLayers();

        // Автосохранение
        this.saveManager.update(dt);

        // Обновление UI
        this.updateUI();
        
        // Проверка на доступность престижа
        this.checkPrestigeAvailability();
        
        // Обновление рекламы
        if (window.yandexSDK) {
            window.yandexSDK.update(dt);
        }
        
        // Обновление достижений
        this.achievements.update(dt);
    }
    
    /**
     * Проверка доступности престижа (показываем уведомление при 1000м)
     */
    checkPrestigeAvailability() {
        // Показываем уведомление один раз при достижении 1000м
        if (this.drill.depth >= 1000 && !this.prestigeNotificationShown) {
            this.prestigeNotificationShown = true;
            this.showPrestigeAvailableNotification();
        }
    }
    
    /**
     * Показать уведомление о доступности престижа
     */
    showPrestigeAvailableNotification() {
        // Удаляем старое уведомление если есть
        const oldModal = document.getElementById('modal-prestige-available');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-prestige-available';
        modal.className = 'modal';
        modal.style.zIndex = '3000';
        
        const tokens = this.prestige.calculateTokens();
        
        modal.innerHTML = `
            <div class="modal-content prestige-available-modal">
                <div class="prestige-icon">🎉</div>
                <h2>Достигнуто 1000м!</h2>
                
                <p>Поздравляем! Вы достигли глубины <strong>1000 метров</strong>!</p>
                <p>Теперь вам доступен <strong>Престиж</strong>:</p>
                
                <div class="prestige-bonuses">
                    <div class="prestige-bonus-item">
                        <span class="bonus-icon">🔄</span>
                        <span class="bonus-text">Сброс текущего прогресса</span>
                    </div>
                    <div class="prestige-bonus-item">
                        <span class="bonus-icon">💎</span>
                        <span class="bonus-text">Получение <strong>${tokens}</strong> токенов</span>
                    </div>
                    <div class="prestige-bonus-item">
                        <span class="bonus-icon">✨</span>
                        <span class="bonus-text">Постоянные бонусы к прогрессу</span>
                    </div>
                    <div class="prestige-bonus-item">
                        <span class="bonus-icon">📈</span>
                        <span class="bonus-text">Быстрый старт с бонусными монетами</span>
                    </div>
                </div>
                
                <p style="color: #ffd700; font-size: 12px; margin: 15px 0;">
                    💡 Престиж можно выполнить в любое время через меню настроек
                </p>
                
                <div class="prestige-available-buttons">
                    <button class="btn-prestige-now" id="prestige-do-now">Выполнить сейчас</button>
                    <button class="btn-prestige-later" id="prestige-later">Потом</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        modal.querySelector('#prestige-do-now').addEventListener('click', () => {
            this.audio.playButtonClick();
            modal.remove();
            this.showPrestigeModal();
        });
        
        modal.querySelector('#prestige-later').addEventListener('click', () => {
            this.audio.playMenuClose();
            modal.remove();
        });
    }
    
    updateVisibleLayers() {
        // Оптимизация: кэшируем видимые слои для быстрого доступа
        this.visibleLayers = this.layers.filter(layer => {
            // Если слой разрушен, не обновляем его
            if (layer.isDestroyed) return false;
            
            // Проверяем, виден ли слой на экране
            const screenY = layer.y - this.camera.y;
            return screenY > -300 && screenY < this.height + 300;
        });
    }
    
    generateNewLayersIfNeeded() {
        // Бесконечная генерация слоёв
        if (this.layers.length > 0) {
            const bottomLayer = this.layers[this.layers.length - 1];
            // Генерируем заранее, пока слой не слишком близко к нижней границе экрана
            if (bottomLayer.y - this.camera.y < this.height + 500) {
                // Создаем не более 3 слоев за кадр для плавности
                for (let i = 0; i < 3; i++) {
                    this.addLayer(this.currentLayer + this.layers.length);
                }
            }
        } else {
            // Если почему-то нет слоев, создаем начальные
            for (let i = 0; i < 15; i++) {
                this.addLayer(this.currentLayer + i);
            }
        }
    }
    
    cleanupOldLayers() {
        // Удаляем только слои, которые далеко за пределами экрана СВЕРХУ
        // (которые бур уже прошел) и они разрушены
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            // Если слой далеко над камерой (пройден)
            if (layer.y + layer.height < this.camera.y - 1000) {
                // Удаляем только если слой разрушен и частицы исчезли
                if (layer.isDestroyed && layer.destroyParticles.length === 0) {
                    this.layers.splice(i, 1);
                }
            }
        }
    }

    render() {
        // Очищаем Canvas (прозрачный - фон рисуется в CSS)
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Первый кадр
        if (this.firstFrame) {
            // Инициализация рендера
        }

        // Фон (космос) - рисуется в CSS, тут можно добавить эффекты если нужно

        // Оптимизация: рисуем только видимые слои
        // Если visibleLayers пустой на первом кадре, используем все слои
        const layersToRender = this.visibleLayers.length > 0 ? this.visibleLayers : this.layers;
        
        // Рисуем плитки только если нет босса
        if (this.layersVisible) {
            for (let layer of layersToRender) {
                if (!layer.isDestroyed) {
                    layer.render(this.ctx, this.camera);
                }
            }
        }

        // Бур
        this.drill.render(this.ctx, this.camera);

        // Частицы
        this.particles.forEach(p => p.render(this.ctx, this.camera));
        
        // Всплывающий текст
        this.floatingText.render(this.ctx, this.camera);

        // Босс
        this.bossSystem.render(this.ctx, this.camera);
        
        // Эффекты кликов
        this.input.renderClickEffects(this.ctx);
        
        // Сбрасываем флаг первого кадра ПОСЛЕ рендера
        this.firstFrame = false;
    }

    updateUI() {
        // Ресурсы
        document.getElementById('coins').textContent = Utils.formatNumber(Math.floor(this.economy.coins));
        document.getElementById('ore').textContent = this.economy.ore;
        document.getElementById('depth-meter').textContent = 
            Math.floor(this.drill.depth) + 'м';

        // Обновляем CPS (ручные + автоклики)
        const cpsElement = document.getElementById('cps-display');
        if (cpsElement) {
            const manualCPS = this.input.clicksPerSecond;
            const autoCPS = Math.round(this.autoDrill.getEffectiveSpeed());
            const totalCPS = manualCPS + autoCPS;
            cpsElement.textContent = totalCPS + ' клик/с';
        }
        
        // Обновляем автоклик
        const autoElement = document.getElementById('auto-display');
        if (autoElement) {
            const autoSpeed = this.autoDrill.getEffectiveSpeed();
            autoElement.textContent = `🤖 ${autoSpeed.toFixed(1)}/с`;
        }
    }

    openModal(id) {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    createParticle(x, y, type, color, size = null) {
        this.particles.push(new Particle(x, y, type, color, size));
    }
    
    /**
     * Отрисовать список достижений
     */
    renderAchievementsList() {
        const container = document.getElementById('achievements-list');
        if (!container) return;
        
        const categories = this.achievements.getCategories();
        const stats = this.achievements.getStats();
        
        let html = `
            <div class="achievements-stats">
                <div class="achievements-progress">
                    <div class="achievements-progress-bar">
                        <div class="achievements-progress-fill" style="width: ${stats.percentage}%"></div>
                    </div>
                    <div class="achievements-progress-text">${stats.unlocked} / ${stats.total} (${stats.percentage}%)</div>
                </div>
            </div>
            <div class="achievements-categories">
        `;
        
        categories.forEach(category => {
            const unlockedCount = category.achievements.filter(a => this.achievements.hasAchievement(a.id)).length;
            const totalCount = category.achievements.length;
            
            html += `
                <div class="achievement-category">
                    <div class="achievement-category-header">
                        <span class="achievement-category-name">${category.name}</span>
                        <span class="achievement-category-count">${unlockedCount}/${totalCount}</span>
                    </div>
                    <div class="achievement-category-items">
            `;
            
            category.achievements.forEach(ach => {
                const isUnlocked = this.achievements.hasAchievement(ach.id);
                const progress = this.achievements.getProgress(ach);
                const isSecret = category.id === 'secret' && !isUnlocked;
                
                if (isSecret) {
                    // Секретные достижения скрыты пока не получены
                    html += `
                        <div class="achievement-item achievement-locked achievement-secret">
                            <div class="achievement-icon">🔒</div>
                            <div class="achievement-content">
                                <div class="achievement-name">???</div>
                                <div class="achievement-desc">Секретное достижение</div>
                            </div>
                        </div>
                    `;
                } else {
                    const rewardText = this.achievements.formatReward(ach.reward);
                    const progressText = progress < 100 && !isUnlocked ? `${Math.round(progress)}%` : '';
                    
                    html += `
                        <div class="achievement-item ${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}">
                            <div class="achievement-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                            <div class="achievement-content">
                                <div class="achievement-name">${ach.name}</div>
                                <div class="achievement-desc">${ach.description}</div>
                                ${rewardText ? `<div class="achievement-reward">${rewardText}</div>` : ''}
                                ${progressText ? `<div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width: ${progress}%"></div></div>` : ''}
                            </div>
                            ${isUnlocked ? '<div class="achievement-check">✓</div>' : ''}
                        </div>
                    `;
                }
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    /**
     * Показать меню настроек
     */
    showSettingsMenu() {
        // Удаляем старое окно
        const oldModal = document.getElementById('modal-settings');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-settings';
        modal.className = 'modal';
        modal.style.zIndex = '3000';
        
        // Проверяем доступность рекламы
        const canShowAd = window.yandexSDK && window.yandexSDK.isReady;
        
        // Получаем текущие настройки звука
        const sfxEnabled = this.audio ? this.audio.sfxEnabled : true;
        const musicEnabled = this.audio ? this.audio.musicEnabled : true;
        const sfxVolume = this.audio ? (this.audio.sfxVolume || 1) : 1;
        const musicVolume = this.audio ? (this.audio.musicVolume || 0.3) : 0.3;
        
        modal.innerHTML = `
            <div class="modal-content settings-modal">
                <h2>⚙️ Настройки</h2>
                
                <div class="settings-section">
                    <h3>🔊 Звук</h3>
                    <button class="settings-btn" id="btn-toggle-sfx">
                        🔊 Звуки: ${sfxEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                    </button>
                    <div class="volume-control">
                        <label>Громкость звуков: <span id="sfx-vol-value">${Math.round(sfxVolume * 100)}%</span></label>
                        <input type="range" id="sfx-volume" min="0" max="100" value="${Math.round(sfxVolume * 100)}">
                    </div>
                    <button class="settings-btn" id="btn-toggle-music">
                        🎵 Музыка: ${musicEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                    </button>
                    <div class="volume-control">
                        <label>Громкость музыки: <span id="music-vol-value">${Math.round(musicVolume * 100)}%</span></label>
                        <input type="range" id="music-volume" min="0" max="100" value="${Math.round(musicVolume * 100)}">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>🎮 Игра</h3>
                    <button class="settings-btn" id="btn-daily">📅 Ежедневные награды</button>
                    <button class="settings-btn" id="btn-skins">🎨 Скины</button>
                    <button class="settings-btn" id="btn-prestige-menu">🔄 Престиж</button>
                </div>
                
                <div class="settings-section">
                    <h3>📺 Реклама за награды</h3>
                    <button class="settings-btn ad-btn" id="btn-ad-skin" ${!canShowAd ? 'disabled' : ''}>
                        🎁 Случайный скин ${!canShowAd ? '(загрузка...)' : ''}
                    </button>
                    <button class="settings-btn ad-btn" id="btn-ad-tap" ${!canShowAd ? 'disabled' : ''}>
                        👆 x5 тап на 1 минуту ${!canShowAd ? '(загрузка...)' : ''}
                    </button>
                    <button class="settings-btn ad-btn" id="btn-ad-money" ${!canShowAd ? 'disabled' : ''}>
                        💰 5000 монет ${!canShowAd ? '(загрузка...)' : ''}
                    </button>
                </div>
                
                <div class="settings-section">
                    <h3>📊 Статистика</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Всего монет:</span>
                            <span class="stat-value">${Utils.formatNumber(Math.floor(this.economy.totalEarned))}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Макс. глубина:</span>
                            <span class="stat-value">${Math.floor(this.drill.depth)}м</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Автокликов:</span>
                            <span class="stat-value">${Utils.formatNumber(this.autoDrill.totalAutoClicks)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Престижей:</span>
                            <span class="stat-value">${this.prestige.count}</span>
                        </div>
                    </div>
                </div>
                
                <button class="close-modal" id="settings-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики звука
        modal.querySelector('#btn-toggle-sfx').addEventListener('click', (e) => {
            this.audio.playToggle();
            const newState = this.audio.toggleSfx();
            e.target.textContent = `🔊 Звуки: ${newState ? 'ВКЛ' : 'ВЫКЛ'}`;
            this.showNotification(newState ? '🔊 Звуки включены' : '🔇 Звуки выключены', '#6bcf7f', 2000);
        });
        
        const sfxVolumeSlider = modal.querySelector('#sfx-volume');
        const sfxVolValue = modal.querySelector('#sfx-vol-value');
        sfxVolumeSlider.addEventListener('input', (e) => {
            this.audio.playSlider();
            const vol = e.target.value / 100;
            this.audio.setSfxVolume(vol);
            sfxVolValue.textContent = `${e.target.value}%`;
        });
        
        modal.querySelector('#btn-toggle-music').addEventListener('click', (e) => {
            this.audio.playToggle();
            const newState = this.audio.toggleMusic();
            e.target.textContent = `🎵 Музыка: ${newState ? 'ВКЛ' : 'ВЫКЛ'}`;
            this.showNotification(newState ? '🎵 Музыка включена' : '🔇 Музыка выключена', '#6bcf7f', 2000);
        });
        
        const musicVolumeSlider = modal.querySelector('#music-volume');
        const musicVolValue = modal.querySelector('#music-vol-value');
        musicVolumeSlider.addEventListener('input', (e) => {
            this.audio.playSlider();
            const vol = e.target.value / 100;
            this.audio.setMusicVolume(vol);
            musicVolValue.textContent = `${e.target.value}%`;
        });
        
        // Обработчики кнопок меню
        modal.querySelector('#btn-daily').addEventListener('click', () => {
            this.audio.playButtonClick();
            modal.remove();
            this.dailyRewards.showModal();
        });
        
        modal.querySelector('#btn-skins').addEventListener('click', () => {
            this.audio.playButtonClick();
            modal.remove();
            this.skins.showShop();
        });
        
        modal.querySelector('#btn-prestige-menu').addEventListener('click', () => {
            this.audio.playButtonClick();
            modal.remove();
            this.showPrestigeModal();
        });
        
        // === РЕКЛАМА ЗА СЛУЧАЙНЫЙ СКИН ===
        const btnAdSkin = modal.querySelector('#btn-ad-skin');
        if (btnAdSkin) {
            btnAdSkin.addEventListener('click', async () => {
                this.audio.playButtonClick();
                if (!window.yandexSDK || !window.yandexSDK.isReady) {
                    this.showNotification('Реклама ещё загружается...', '#ff6b6b', 3000);
                    return;
                }
                
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    // Получаем список не купленных скинов
                    const unownedSkins = this.skins.skins.filter(s => !this.skins.ownedSkins.includes(s.id));
                    
                    if (unownedSkins.length === 0) {
                        // Все скины куплены - даём монеты вместо
                        this.economy.addCoins(10000);
                        this.audio.playSuccess();
                        this.showNotification('🎁 У вас все скины! +10000 🪙', '#ffd700', 4000);
                    } else {
                        // Случайный скин
                        const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
                        this.skins.ownedSkins.push(randomSkin.id);
                        this.skins.select(randomSkin.id);
                        this.saveManager.save();
                        this.audio.playSuccess();
                        this.showNotification(`🎁 Получен скин: ${randomSkin.name}!`, '#ffd700', 4000);
                    }
                });
                
                if (!rewarded) {
                    this.showNotification('Реклама не была досмотрена до конца', '#ff6b6b', 3000);
                }
            });
        }
        
        // === РЕКЛАМА ЗА x5 ТАП ===
        const btnAdTap = modal.querySelector('#btn-ad-tap');
        if (btnAdTap) {
            btnAdTap.addEventListener('click', async () => {
                this.audio.playButtonClick();
                if (!window.yandexSDK || !window.yandexSDK.isReady) {
                    this.showNotification('Реклама ещё загружается...', '#ff6b6b', 3000);
                    return;
                }
                
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    // x5 тап на 1 минуту
                    this.audio.playSuccess();
                    this.activateTapBoost();
                });
                
                if (!rewarded) {
                    this.showNotification('Реклама не была досмотрена до конца', '#ff6b6b', 3000);
                }
            });
        }
        
        // === РЕКЛАМА ЗА 5000 МОНЕТ ===
        const btnAdMoney = modal.querySelector('#btn-ad-money');
        if (btnAdMoney) {
            btnAdTap.addEventListener('click', async () => {
                this.audio.playButtonClick();
                if (!window.yandexSDK || !window.yandexSDK.isReady) {
                    this.showNotification('Реклама ещё загружается...', '#ff6b6b', 3000);
                    return;
                }
                
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    this.economy.addCoins(5000);
                    this.audio.playSuccess();
                    this.showNotification('🎁 +5000 🪙', '#ffd700', 3000);
                });
                
                if (!rewarded) {
                    this.showNotification('Реклама не была досмотрена до конца', '#ff6b6b', 3000);
                }
            });
        }
        
        modal.querySelector('#settings-close').addEventListener('click', () => {
            this.audio.playMenuClose();
            modal.remove();
        });
    }
    
    /**
     * Показать модальное окно престижа
     */
    showPrestigeModal() {
        const tokens = this.prestige.calculateTokens();
        const nextBonus = this.prestige.getNextBonusInfo();
        const activeBonuses = this.prestige.getBonusesDescription();
        
        // Удаляем старое окно
        const oldModal = document.getElementById('modal-prestige');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-prestige';
        modal.className = 'modal';
        modal.style.zIndex = '3000';
        
        const canPrestige = this.drill.depth >= this.prestige.minDepth;
        
        // HTML для активных бонусов
        const bonusesHTML = activeBonuses.length > 0 
            ? activeBonuses.map(b => `
                <div class="prestige-bonus-item">
                    <span class="bonus-name">${b.name}</span>
                    <span class="bonus-desc">${b.description}</span>
                </div>
            `).join('')
            : '<p style="color: #888;">Пока нет активных бонусов</p>';
        
        // HTML для следующего бонуса
        const nextBonusHTML = nextBonus 
            ? `<div class="next-bonus">
                <h4>Следующий бонус:</h4>
                <p>${nextBonus.name}</p>
                <p style="color: #ffd700;">Требуется: ${nextBonus.needed} токенов</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(nextBonus.current / nextBonus.needed * 100)}%"></div>
                </div>
                <p style="font-size: 12px;">Осталось: ${nextBonus.remaining} токенов</p>
               </div>`
            : '<p style="color: #6bcf7f;">🎉 Все бонусы получены!</p>';
        
        modal.innerHTML = `
            <div class="modal-content prestige-modal">
                <h2>🔄 Престиж</h2>
                
                <div class="prestige-info">
                    <div class="prestige-tokens">
                        <span class="token-icon">💎</span>
                        <span class="token-count">${this.prestige.tokens}</span>
                        <span class="token-label">токенов</span>
                    </div>
                    <div class="prestige-count">Престижей: ${this.prestige.count}</div>
                </div>
                
                <div class="prestige-section">
                    <h3>✨ Активные бонусы:</h3>
                    <div class="prestige-bonuses">
                        ${bonusesHTML}
                    </div>
                </div>
                
                <div class="prestige-section">
                    ${nextBonusHTML}
                </div>
                
                <div class="prestige-action">
                    ${canPrestige 
                        ? `<p class="prestige-gain">Вы получите: <strong>+${tokens}</strong> токенов</p>
                           <button class="prestige-btn" id="do-prestige">Выполнить престиж!</button>`
                        : `<p class="prestige-locked">Доступно с ${this.prestige.minDepth}м глубины</p>
                           <p style="font-size: 12px; color: #888;">Текущая: ${Math.floor(this.drill.depth)}м</p>`
                    }
                </div>
                
                <div class="prestige-warning">
                    ⚠️ Престиж сбросит ваш прогресс, но даст постоянные бонусы!
                </div>
                
                <button class="close-modal" id="prestige-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        if (canPrestige) {
            modal.querySelector('#do-prestige').addEventListener('click', () => {
                this.audio.playButtonClick();
                modal.remove();
                this.showPrestigeConfirmModal();
            });
        }
        
        modal.querySelector('#prestige-close').addEventListener('click', () => {
            this.audio.playMenuClose();
            modal.remove();
        });
    }
    
    /**
     * Показать подтверждение престижа (игровое, не браузерное!)
     */
    showPrestigeConfirmModal() {
        // Удаляем старое окно если есть
        const oldModal = document.getElementById('modal-prestige-confirm');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-prestige-confirm';
        modal.className = 'modal';
        modal.style.zIndex = '3000';
        
        modal.innerHTML = `
            <div class="modal-content prestige-confirm-modal">
                <div class="warning-icon">⚠️</div>
                <h3>Вы уверены?</h3>
                
                <p>Ваш прогресс будет сброшен!</p>
                <p style="color: #6bcf7f; margin-top: 10px;">Но вы получите постоянные бонусы 💎</p>
                
                <div class="prestige-confirm-buttons">
                    <button class="btn-confirm-yes" id="prestige-confirm-yes">Да, выполнить</button>
                    <button class="btn-confirm-no" id="prestige-confirm-no">Отмена</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        modal.querySelector('#prestige-confirm-yes').addEventListener('click', () => {
            this.audio.playButtonClick();
            const result = this.prestige.doPrestige();
            if (result) {
                modal.remove();
                // Сбрасываем флаг уведомления о престиже чтобы показать снова при следующем достижении 1000м
                this.prestigeNotificationShown = false;
                this.showPrestigeSuccess(result);
            }
        });
        
        modal.querySelector('#prestige-confirm-no').addEventListener('click', () => {
            this.audio.playMenuClose();
            modal.remove();
        });
    }
    
    /**
     * Показать успешное выполнение престижа
     */
    showPrestigeSuccess(result) {
        // Звук престижа
        if (this.audio) {
            this.audio.playPrestige();
        }
        
        // Используем игровое уведомление вместо модалки
        this.showNotification(
            `🎉 ПРЕСТИЖ ВЫПОЛНЕН! +${result.tokensGained} 💎`,
            '#f093fb',
            5000
        );
        
        // Дополнительное уведомление с бонусами
        setTimeout(() => {
            this.showNotification(
                `Всего токенов: ${result.totalTokens} | Престижей: ${result.prestigeCount}`,
                '#ffd700',
                4000
            );
        }, 1000);
    }
    
    /**
     * Показать меню наград за рекламу
     */
    showAdRewardsMenu() {
        const canShowAd = window.yandexSDK && window.yandexSDK.isReady;
        
        const modal = document.createElement('div');
        modal.id = 'modal-ad-rewards';
        modal.className = 'modal';
        modal.style.zIndex = '3000';
        
        modal.innerHTML = `
            <div class="modal-content ad-rewards-modal">
                <h2>📺 Реклама за награды</h2>
                <p class="ad-rewards-desc">Смотри рекламу и получай крутые бонусы!</p>
                
                <div class="ad-rewards-grid">
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-skin" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">🎁</span>
                        <div class="ad-reward-info">
                            <span class="ad-reward-name">Случайный скин</span>
                            <span class="ad-reward-desc">Получи случайный скин для бура</span>
                        </div>
                    </button>
                    
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-tap" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">👆</span>
                        <div class="ad-reward-info">
                            <span class="ad-reward-name">x5 Тап</span>
                            <span class="ad-reward-desc">Увеличь урон в 5 раз на 1 минуту</span>
                        </div>
                    </button>
                    
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-money" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">💰</span>
                        <div class="ad-reward-info">
                            <span class="ad-reward-name">5000 монет</span>
                            <span class="ad-reward-desc">Мгновенно получи 5000 монет</span>
                        </div>
                    </button>
                </div>
                
                ${!canShowAd ? '<p class="ad-loading">⏳ Реклама загружается...</p>' : '<p class="ad-loading" style="color: #6bcf7f;">✅ Реклама готова!</p>'}
                
                <button class="close-modal" id="ad-rewards-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        modal.querySelector('#ad-rewards-close').addEventListener('click', () => {
            this.audio.playMenuClose();
            modal.remove();
        });
        
        // Случайный скин
        modal.querySelector('#ad-reward-skin').addEventListener('click', async () => {
            this.audio.playButtonClick();
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
                const unownedSkins = this.skins.skins.filter(s => !this.skins.ownedSkins.includes(s.id));
                
                if (unownedSkins.length === 0) {
                    this.economy.addCoins(10000);
                    this.audio.playSuccess();
                    this.showNotification('🎁 У вас все скины! +10000 🪙', '#ffd700', 4000);
                } else {
                    const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
                    this.skins.ownedSkins.push(randomSkin.id);
                    this.skins.select(randomSkin.id);
                    this.saveManager.save();
                    this.audio.playSuccess();
                    this.showNotification(`🎁 Получен скин: ${randomSkin.name}!`, '#ffd700', 4000);
                }
            });
            
            if (rewarded) {
                modal.remove();
            } else {
                this.showNotification('Реклама не была досмотрена', '#ff6b6b', 3000);
            }
        });
        
        // x5 Тап
        modal.querySelector('#ad-reward-tap').addEventListener('click', async () => {
            this.audio.playButtonClick();
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
                this.audio.playSuccess();
                this.activateTapBoost();
            });
            
            if (rewarded) {
                modal.remove();
            } else {
                this.showNotification('Реклама не была досмотрена', '#ff6b6b', 3000);
            }
        });
        
        // 5000 монет
        modal.querySelector('#ad-reward-money').addEventListener('click', async () => {
            this.audio.playButtonClick();
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
                this.economy.addCoins(5000);
                this.audio.playSuccess();
                this.showNotification('🎁 +5000 🪙', '#ffd700', 3000);
            });
            
            if (rewarded) {
                modal.remove();
            } else {
                this.showNotification('Реклама не была досмотрена', '#ff6b6b', 3000);
            }
        });
    }
    
    /**
     * Активировать буст x5 тап
     */
    activateTapBoost() {
        const now = Date.now();
        const duration = 60 * 1000; // 1 минута
        
        this.tapBoostActive = true;
        this.tapBoostEndTime = now + duration;
        
        // Увеличиваем силу клика
        this.drill.power *= 5;
        
        this.showNotification('👆 x5 ТАП АКТИВЕН на 1 минуту!', '#f093fb', 3000);
        
        // Показываем таймер буста
        this.showTapBoostUI();
    }
    
    /**
     * Обновить буст тапа
     */
    updateTapBoost() {
        if (!this.tapBoostActive) return;
        
        const now = Date.now();
        if (now >= this.tapBoostEndTime) {
            // Буст закончился
            this.tapBoostActive = false;
            this.drill.power /= 5;
            
            // Убираем UI
            const ui = document.getElementById('tap-boost-ui');
            if (ui) ui.remove();
            
            this.showNotification('👆 x5 ТАП закончился', '#aaa', 2000);
        } else {
            // Обновляем таймер
            const timeLeft = Math.ceil((this.tapBoostEndTime - now) / 1000);
            const timerText = document.getElementById('tap-boost-timer');
            if (timerText) timerText.textContent = timeLeft + 'с';
        }
    }
    
    /**
     * Показать UI буста тапа
     */
    showTapBoostUI() {
        // Убираем старый если есть
        const oldUi = document.getElementById('tap-boost-ui');
        if (oldUi) oldUi.remove();
        
        const ui = document.createElement('div');
        ui.id = 'tap-boost-ui';
        ui.innerHTML = `
            <div class="tap-boost-badge">
                👆 x5
                <span class="tap-boost-timer" id="tap-boost-timer">60с</span>
            </div>
        `;
        document.body.appendChild(ui);
    }
    
    /**
     * Показать игровое уведомление (не браузерное!)
     * Создаёт DOM-элемент вместо alert
     */
    showNotification(text, color = '#fff', duration = 3000) {
        const notif = document.createElement('div');
        notif.className = 'game-notification';
        notif.textContent = text;
        notif.style.borderColor = color;
        notif.style.color = color;
        
        document.getElementById('game-container').appendChild(notif);
        
        // Удаляем после анимации
        setTimeout(() => {
            notif.remove();
        }, duration);
    }

}

// Запуск при загрузке
window.addEventListener('load', async () => {
    // Загрузка игры
    
    // Инициализация Яндекс SDK с таймаутом
    const sdkPromise = initYandexSDK();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды максимум
    
    await Promise.race([sdkPromise, timeoutPromise]);
    
    window.game = new Game();
    // Игра загружена
});

/**
 * Инициализация Яндекс SDK
 */
async function initYandexSDK() {
    try {
        // Проверяем что SDK загружен
        if (typeof YaGames === 'undefined') {
            // YaGames SDK не загружен
            window.gameLanguage = 'ru';
            return;
        }
        
        // Инициализируем SDK
        window.ysdk = await YaGames.init();
        // Yandex SDK инициализирован
        
        // Инициализируем наш обертку
        if (window.yandexSDK) {
            await window.yandexSDK.init();
        }
        
        // Получаем язык пользователя
        const playerLang = window.ysdk.environment.i18n.lang;
        // Язык пользователя
        
        // Сохраняем язык
        window.gameLanguage = playerLang || 'ru';
        
        // Входим в полноэкранный режим
        if (window.yandexSDK) {
            await window.yandexSDK.enterFullscreen();
        }
        
    } catch (e) {
        // Ошибка инициализации Yandex SDK
        window.gameLanguage = 'ru';
    }
}