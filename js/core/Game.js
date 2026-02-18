/*
 * КОСМИЧЕСКИЙ БУР - Главный класс игры
 * Версия: 1.1 (Оптимизированная)
 * Ориентация: Портрет (9:16)
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Фиксированное логическое разрешение для Canvas
        this.width = 1080;
        this.height = 1920;
        
        // Учитываем DPR для чёткости на мобильных
        this.dpr = window.devicePixelRatio || 1;
        
        // Устанавливаем разрешение canvas
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Отключаем сглаживание для чётких пикселей
        this.ctx.imageSmoothingEnabled = false;

        // Инициализация систем
        this.renderer = new Renderer(this);
        this.input = new Input(this);
        this.economy = new Economy();
        this.upgrades = new Upgrades(this);
        this.driftSystem = new DriftSystem(this);
        
        // Новые системы для удержания игроков
        this.autoDrill = new AutoDrill(this);
        this.prestige = new Prestige(this);
        this.offlineProgress = new OfflineProgress(this);
        this.dailyRewards = new DailyRewards(this);
        this.skins = new Skins(this);
        this.bossSystem = new BossSystem(this);

        this.saveManager = new SaveManager(this);

        // Сущности
        this.drill = new Drill(this);
        this.layers = [];
        this.particles = [];
        
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

        this.init();
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
        
        // Останавливаем все аудио (если есть)
        this.stopAllAudio();
        
        console.log('Игра на паузе');
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
        console.log('Игра возобновлена');
    }
    
    /**
     * Остановить все аудио (для паузы)
     */
    stopAllAudio() {
        // Останавливаем все HTML5 audio элементы
        const audios = document.querySelectorAll('audio');
        audios.forEach(audio => {
            audio.pause();
        });
        
        // Останавливаем Web Audio API контекст если есть
        if (this.audioContext) {
            this.audioContext.suspend();
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
        // Кнопки меню
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.openModal('modal-upgrades');
            this.upgrades.renderUI();
            // Фикс скролла для мобильных - применяем стили после открытия
            const modalContent = document.querySelector('#modal-upgrades .modal-content');
            if (modalContent) {
                modalContent.style.touchAction = 'pan-y';
                modalContent.style.webkitOverflowScrolling = 'touch';
                modalContent.style.overscrollBehavior = 'contain';
                
                // Отладка - проверяем нужен ли скролл
                console.log('Modal content height:', modalContent.clientHeight);
                console.log('Modal scroll height:', modalContent.scrollHeight);
                console.log('Needs scroll:', modalContent.scrollHeight > modalContent.clientHeight);
            }
        });

        document.getElementById('btn-achievements').addEventListener('click', () => {
            this.openModal('modal-achievements');
            this.renderAchievements();
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.showSettingsMenu();
        });
        
        // Кнопка паузы
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.togglePause();
        });
        
        // Клик на экран паузы для продолжения
        document.getElementById('pause-screen').addEventListener('click', () => {
            this.resume();
        });
        
        // Кнопка престижа убрана - теперь только в настройках
        // и уведомление при достижении 1000м
        
        // Кнопка рекламы - открывает меню выбора награды
        const btnAd = document.getElementById('btn-ad');
        if (btnAd) {
            btnAd.addEventListener('click', () => {
                this.showAdRewardsMenu();
            });
        }

        // Закрытие модалок
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Ресайз с debounce для предотвращения циклов
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });
        // Также слушаем orientationchange для мобильных
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 300);
        });
        this.handleResize();
        
        // === ФИКС СКРОЛЛА ДЛЯ МОДАЛЬНЫХ ОКОН НА МОБИЛЬНЫХ ===
        this.setupModalScrollFix();
    }
    
    /**
     * Фикс для скролла в модальных окнах на мобильных устройствах
     * Упрощённая версия - полагаемся на CSS
     */
    setupModalScrollFix() {
        // Ничего не делаем - все фиксы в CSS и в едином обработчике touchmove выше
        console.log('Modal scroll fix initialized');
    }

    handleResize() {
        // CSS адаптация, Canvas остаётся фиксированным
        const container = document.getElementById('game-container');
        const aspect = this.width / this.height;
        const windowAspect = window.innerWidth / window.innerHeight;
        
        // Сбрасываем стили перед пересчётом
        this.canvas.style.width = '';
        this.canvas.style.height = '';

        if (windowAspect > aspect) {
            // Широкий экран (ПК) — полосы по бокам
            this.canvas.style.height = '100vh';
            this.canvas.style.width = `${window.innerHeight * aspect}px`;
        } else {
            // Узкий экран (телефон) — полный экран
            this.canvas.style.width = '100vw';
            this.canvas.style.height = `${window.innerWidth / aspect}px`;
        }
        
        // Принудительно центрируем canvas
        this.canvas.style.margin = 'auto';
        this.canvas.style.position = 'relative';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        
        // ВАЖНО: Не меняем canvas.width/height здесь!
        // Они остаются фиксированными 1080x1920 для стабильного рендера
        
        // Адаптация для очень коротких экранов
        this.adaptToShortScreen();
        
        // Принудительный ре-рендер
        if (this.isRunning) {
            this.render();
        }
    }
    
    adaptToShortScreen() {
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        
        // Логирование для отладки
        console.log('Размер экрана:', screenWidth, 'x', screenHeight, 'px');
        
        // Если экран очень короткий (менее 500px)
        if (screenHeight < 500) {
            console.log('Короткий экран обнаружен, применяем адаптацию');
            document.body.classList.add('short-screen');
        } else {
            document.body.classList.remove('short-screen');
        }
        
        // Если экран очень узкий (менее 400px)
        if (screenWidth < 400) {
            console.log('Узкий экран обнаружен');
            document.body.classList.add('narrow-screen');
        } else {
            document.body.classList.remove('narrow-screen');
        }
    }

    generateInitialLayers() {
        // Оптимизация: создаем только 10 слоев вместо 20 для быстрой загрузки
        console.log('Создание начальных слоев...');
        for (let i = 0; i < 10; i++) {
            this.addLayer(i);
        }
        console.log('Начальные слои созданы:', this.layers.length);
        
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
        console.log('Начальная позиция бура:', this.drill.y, 'Позиция камеры:', this.camera.y);
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
                console.warn('Пропущен кадр, deltaTime:', deltaTime);
                requestAnimationFrame((t) => this.loop(t));
                return;
            }

            this.update(deltaTime);
            this.render();
        } catch (e) {
            console.error('Ошибка в game loop:', e);
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
        
        // Обновляем дрифт
        this.driftSystem.update(dt);
        
        // Обновляем босса
        this.bossSystem.update(dt);
        
        // Обновляем баффы босса (всегда)
        this.bossSystem.updateBonuses();
        
        // Обновляем буст тапа
        this.updateTapBoost();

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
            modal.remove();
            this.showPrestigeModal();
        });
        
        modal.querySelector('#prestige-later').addEventListener('click', () => {
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
        // Оптимизация: очищаем только видимую область
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Отладка: проверяем что рендер работает
        if (this.firstFrame) {
            console.log('Рендер первого кадра:', {
                width: this.width,
                height: this.height,
                layers: this.layers.length,
                drill: this.drill ? 'есть' : 'нет'
            });
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

        // Эффекты дрифта
        this.driftSystem.renderEffects(this.ctx);
        
        // Босс
        this.bossSystem.render(this.ctx, this.camera);
        
        // Эффекты кликов
        this.input.renderClickEffects(this.ctx);
        
        // Дебаг информация (только для разработки)
        if (this.firstFrame) {
            this.renderDebugInfo();
        }
        
        // Сбрасываем флаг первого кадра ПОСЛЕ рендера
        this.firstFrame = false;
    }
    
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Слои: ${this.layers.length}`, 20, 30);
        this.ctx.fillText(`Бур Y: ${Math.floor(this.drill.y)}`, 20, 50);
        this.ctx.fillText(`Камера Y: ${Math.floor(this.camera.y)}`, 20, 70);
        this.ctx.fillText(`Экран: ${window.innerWidth}x${window.innerHeight}`, 20, 90);
        
        // Показываем позицию первого слоя
        if (this.layers.length > 0) {
            const firstLayer = this.layers[0];
            this.ctx.fillText(`Первый слой Y: ${Math.floor(firstLayer.y)}`, 20, 110);
        }
        
        this.ctx.restore();
    }

    updateUI() {
        // Ресурсы
        document.getElementById('coins').textContent = Utils.formatNumber(Math.floor(this.economy.coins));
        document.getElementById('ore').textContent = this.economy.ore;
        document.getElementById('depth-meter').textContent = 
            Math.floor(this.drill.depth) + 'м';

        // Дрифт множитель убран из UI
        
        // Обновляем CPS
        const cpsElement = document.getElementById('cps-display');
        if (cpsElement) {
            cpsElement.textContent = this.input.clicksPerSecond + ' клик/с';
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
     * Показать меню настроек
     */
    showSettingsMenu() {
        // Удаляем старое окно
        const oldModal = document.getElementById('modal-settings');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-settings';
        modal.className = 'modal';
        
        // Проверяем доступность рекламы
        const canShowAd = window.yandexSDK && window.yandexSDK.isReady;
        
        modal.innerHTML = `
            <div class="modal-content settings-modal">
                <h2>⚙️ Настройки</h2>
                
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
        
        // Обработчики
        modal.querySelector('#btn-daily').addEventListener('click', () => {
            modal.remove();
            this.dailyRewards.showModal();
        });
        
        modal.querySelector('#btn-skins').addEventListener('click', () => {
            modal.remove();
            this.skins.showShop();
        });
        
        modal.querySelector('#btn-prestige-menu').addEventListener('click', () => {
            modal.remove();
            this.showPrestigeModal();
        });
        
        // === РЕКЛАМА ЗА СЛУЧАЙНЫЙ СКИН ===
        const btnAdSkin = modal.querySelector('#btn-ad-skin');
        if (btnAdSkin) {
            btnAdSkin.addEventListener('click', async () => {
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
                        this.showNotification('🎁 У вас все скины! +10000 🪙', '#ffd700', 4000);
                    } else {
                        // Случайный скин
                        const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
                        this.skins.ownedSkins.push(randomSkin.id);
                        this.skins.select(randomSkin.id);
                        this.game.saveManager.save();
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
                if (!window.yandexSDK || !window.yandexSDK.isReady) {
                    this.showNotification('Реклама ещё загружается...', '#ff6b6b', 3000);
                    return;
                }
                
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    // x5 тап на 1 минуту
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
            btnAdMoney.addEventListener('click', async () => {
                if (!window.yandexSDK || !window.yandexSDK.isReady) {
                    this.showNotification('Реклама ещё загружается...', '#ff6b6b', 3000);
                    return;
                }
                
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    this.economy.addCoins(5000);
                    this.showNotification('🎁 +5000 🪙', '#ffd700', 3000);
                });
                
                if (!rewarded) {
                    this.showNotification('Реклама не была досмотрена до конца', '#ff6b6b', 3000);
                }
            });
        }
        
        modal.querySelector('#settings-close').addEventListener('click', () => {
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
                modal.remove();
                this.showPrestigeConfirmModal();
            });
        }
        
        modal.querySelector('#prestige-close').addEventListener('click', () => {
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
            const result = this.prestige.doPrestige();
            if (result) {
                modal.remove();
                this.showPrestigeSuccess(result);
            }
        });
        
        modal.querySelector('#prestige-confirm-no').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    /**
     * Показать успешное выполнение престижа
     */
    showPrestigeSuccess(result) {
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
        
        modal.innerHTML = `
            <div class="modal-content ad-rewards-modal">
                <h2>📺 Реклама за награды</h2>
                <p class="ad-rewards-desc">Выберите награду за просмотр рекламы:</p>
                
                <div class="ad-rewards-grid">
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-skin" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">🎁</span>
                        <span class="ad-reward-name">Случайный скин</span>
                        <span class="ad-reward-desc">Получите случайный скин</span>
                    </button>
                    
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-tap" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">👆</span>
                        <span class="ad-reward-name">x5 Тап</span>
                        <span class="ad-reward-desc">x5 урон на 1 минуту</span>
                    </button>
                    
                    <button class="ad-reward-btn ${!canShowAd ? 'disabled' : ''}" id="ad-reward-money" ${!canShowAd ? 'disabled' : ''}>
                        <span class="ad-reward-icon">💰</span>
                        <span class="ad-reward-name">5000 монет</span>
                        <span class="ad-reward-desc">+5000 🪙 сразу</span>
                    </button>
                </div>
                
                ${!canShowAd ? '<p class="ad-loading">Реклама загружается...</p>' : ''}
                
                <button class="close-modal" id="ad-rewards-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        modal.querySelector('#ad-rewards-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // Случайный скин
        modal.querySelector('#ad-reward-skin').addEventListener('click', async () => {
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
                const unownedSkins = this.skins.skins.filter(s => !this.skins.ownedSkins.includes(s.id));
                
                if (unownedSkins.length === 0) {
                    this.economy.addCoins(10000);
                    this.showNotification('🎁 У вас все скины! +10000 🪙', '#ffd700', 4000);
                } else {
                    const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
                    this.skins.ownedSkins.push(randomSkin.id);
                    this.skins.select(randomSkin.id);
                    this.saveManager.save();
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
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
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
            if (!canShowAd) return;
            
            const rewarded = await window.yandexSDK.showRewardedAd(() => {
                this.economy.addCoins(5000);
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
    console.log('Загрузка игры Космический Бур...');
    
    // Инициализация Яндекс SDK с таймаутом
    const sdkPromise = initYandexSDK();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды максимум
    
    await Promise.race([sdkPromise, timeoutPromise]);
    
    window.game = new Game();
    console.log('Игра загружена!');
});

/**
 * Инициализация Яндекс SDK
 */
async function initYandexSDK() {
    try {
        // Проверяем что SDK загружен
        if (typeof YaGames === 'undefined') {
            console.warn('YaGames SDK не загружен');
            window.gameLanguage = 'ru';
            return;
        }
        
        // Инициализируем SDK
        window.ysdk = await YaGames.init();
        console.log('Yandex SDK инициализирован');
        
        // Инициализируем наш обертку
        if (window.yandexSDK) {
            await window.yandexSDK.init();
        }
        
        // Получаем язык пользователя
        const playerLang = window.ysdk.environment.i18n.lang;
        console.log('Язык пользователя:', playerLang);
        
        // Сохраняем язык
        window.gameLanguage = playerLang || 'ru';
        
        // Отключаем медиа-сессию (чтобы не показывать плеер в уведомлениях)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            console.log('MediaSession отключена');
        }
        
        // Входим в полноэкранный режим
        if (window.yandexSDK) {
            await window.yandexSDK.enterFullscreen();
        }
        
    } catch (e) {
        console.error('Ошибка инициализации Yandex SDK:', e);
        window.gameLanguage = 'ru';
    }
}