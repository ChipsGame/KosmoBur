/**
 * СИСТЕМА ЗВУКОВ
 * - SFX: Генерация звуков через Web Audio API
 * - Музыка: Воспроизведение файла audio/background.ogg через HTML5 Audio
 * 
 * ТРЕБОВАНИЯ ЯНДЕКС ИГР:
 * - Музыка ставится на паузу при сворачивании (visibilitychange)
 * - Музыка ставится на паузу при показе рекламы
 * - Нет системного плеера (disableRemotePlayback, playsInline)
 * - Автовоспроизведение только после первого взаимодействия
 */
class AudioSystem {
    constructor(game) {
        this.game = game;
        this.enabled = true;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.volume = 0.5;
        this.musicVolume = 0.3;
        this.sfxVolume = 1.0;
        
        // Web Audio API контекст
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        // Для музыки
        this.musicOscillators = [];
        this.isMusicPlaying = false;
        this.musicElement = null; // HTML5 Audio элемент для файловой музыки
        this.musicWasPlayingBeforePause = false; // Для восстановления после паузы
        
        // Флаг первого взаимодействия (требование браузеров)
        this.hasUserInteraction = false;
        
        this.init();
        this.setupVisibilityHandler();
    }
    
    /**
     * Инициализация аудио
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Создаём гейны для микширования
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            // Подключаем
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Устанавливаем громкость
            this.masterGain.gain.value = this.volume;
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
            
            // Аудио система инициализирована
        } catch (e) {
            // Web Audio API не поддерживается
            this.enabled = false;
        }
    }
    
    /**
     * Настройка обработчика видимости страницы
     * ВАЖНО: Музыка должна ставиться на паузу при сворачивании (требование Яндекс Игр)
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Страница свернута - ставим музыку на паузу
                this.musicWasPlayingBeforePause = this.isMusicPlaying;
                this.pauseMusic();
                // Приостанавливаем AudioContext для SFX
                if (this.audioContext && this.audioContext.state === 'running') {
                    this.audioContext.suspend();
                }
                // Музыка на паузе (вкладка свернута)
            } else {
                // Страница видна - возобновляем музыку если она играла
                if (this.musicWasPlayingBeforePause && this.musicEnabled) {
                    this.resumeMusic();
                }
                // Возобновляем AudioContext
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                // Музыка возобновлена (вкладка активна)
            }
        });
    }
    
    /**
     * Включить/выключить звуки
     */
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
        return this.sfxEnabled;
    }
    
    /**
     * Включить/выключить музыку (mute/unmute)
     * ВАЖНО: При размьюте музыка продолжается с того же места, а не начинается заново
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
        
        // Обновляем громкость аудио элемента (mute/unmute без остановки)
        if (this.musicElement) {
            this.musicElement.volume = this.musicEnabled ? this.musicVolume : 0;
        }
        
        // Если музыка включена и не играет - запускаем
        if (this.musicEnabled && !this.isMusicPlaying) {
            this.playBackgroundMusic();
        }
        // Если музыка уже играет - просто меняем громкость (выше уже сделали)
        
        return this.musicEnabled;
    }
    
    /**
     * Установить общую громкость (0-1)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    /**
     * Установить громкость звуков (0-1)
     */
    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
    }
    
    /**
     * Установить громкость музыки (0-1)
     */
    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
        // Обновляем громкость аудио элемента
        if (this.musicElement) {
            this.musicElement.volume = this.musicVolume;
        }
    }
    
    // === ЗВУКИ ЭФФЕКТОВ ===
    
    /**
     * Звук клика (бурение) - мягкий удар
     */
    playClick() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Основной мягкий удар
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.08);
        
        // Лёгкое эхо для объёма
        setTimeout(() => {
            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.value = 120;
            
            gain2.gain.setValueAtTime(0.08, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);
            
            osc2.connect(gain2);
            gain2.connect(this.sfxGain);
            
            osc2.start();
            osc2.stop(this.audioContext.currentTime + 0.06);
        }, 25);
    }
    
    /**
     * Звук критического удара - мелодичный "динь"
     */
    playCrit() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Мелодичный перезвон - приятный и мягкий
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.03;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2 - i * 0.03, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.12);
        });
    }
    
    /**
     * Звук супер-удара - восходящая мелодия
     */
    playSuper() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Восходящая мелодичная арпеджио
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.025;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.22, startTime + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }
    
    /**
     * Звук разрушения слоя - мягкий глубокий "бум"
     */
    playLayerBreak() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Глубокий мягкий удар
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.25);
        
        // Лёгкое эхо
        setTimeout(() => {
            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.value = 60;
            
            gain2.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            osc2.connect(gain2);
            gain2.connect(this.sfxGain);
            
            osc2.start();
            osc2.stop(this.audioContext.currentTime + 0.15);
        }, 40);
    }
    
    /**
     * Звук получения монет - мелодичный "динь-динь"
     */
    playCoin() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Два мягких перезвона
        [1046.5, 1318.5].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.04;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.18, startTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.08);
        });
    }
    
    /**
     * Звук получения руды - мягкий "блинг"
     */
    playOre() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Мягкий перезвон
        [783.99, 987.77].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }
    
    /**
     * Звук покупки улучшения - восходящий аккорд
     */
    playBuy() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Восходящий мажорный аккорд
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.03;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2 - i * 0.02, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    /**
     * Звук открытия меню - мягкий подъём
     */
    playMenuOpen() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        // Мягкий плавный подъём (более приятный чем простой тон)
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }
    
    /**
     * Звук закрытия меню - мягкое опускание
     */
    playMenuClose() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        // Мягкое плавное опускание
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    /**
     * Звук клика по кнопке - мягкий "плоп"
     */
    playButtonClick() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Основной тон - мягкий "плоп"
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.08);
        
        // Лёгкое эхо для объёма
        setTimeout(() => {
            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();
            
            osc2.type = 'sine';
            osc2.frequency.value = 300;
            
            gain2.gain.setValueAtTime(0.08, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.06);
            
            osc2.connect(gain2);
            gain2.connect(this.sfxGain);
            
            osc2.start();
            osc2.stop(this.audioContext.currentTime + 0.06);
        }, 30);
    }
    
    /**
     * Звук наведения на кнопку - лёгкий "писк"
     */
    playButtonHover() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.05);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }
    
    /**
     * Звук переключения тумблера - мягкий "клик"
     */
    playToggle() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.06);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.06);
    }
    
    /**
     * Звук слайдера/ползунка - мягкое "шуршание"
     */
    playSlider() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.03);
        
        gain.gain.value = 0.05;
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.03);
    }
    
    /**
     * Звук ошибки/недостаточно средств - мягкое "брр"
     */
    playError() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Мягкое нисходящее "брр"
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    
    /**
     * Звук успешной покупки/улучшения - приятный "динь"
     */
    playSuccess() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Восходящий перезвон
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.04;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2 - i * 0.03, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    /**
     * Звук достижения - торжественная фанфара
     */
    playAchievement() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Красивый торжественный аккорд
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }
    
    /**
     * Звук появления босса - грозное нарастание
     */
    playBossAppear() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Нисходящая гамма для эффекта грозности
        [523.25, 493.88, 466.16, 440, 415.3, 392, 369.99, 349.23].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }
    
    /**
     * Звук удара по боссу - мягкий тяжёлый удар
     */
    playBossHit() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Тяжёлый удар
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + 0.12);
    }
    
    /**
     * Звук победы над боссом - победная фанфара
     */
    playBossWin() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Красивый победный аккорд
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.04;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });
    }
    
    /**
     * Звук престижа - масштабная фанфара
     */
    playPrestige() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        const now = this.audioContext.currentTime;
        
        // Грандиозная фанфара
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.06;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }
    
    /**
     * Вспомогательный метод для проигрывания тона
     * По умолчанию использует мягкую синусоиду
     */
    playTone(frequency, duration, type = 'sine', volume = 0.2) {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        // Всегда используем sine для мягкости, если не указано иное
        osc.type = type === 'square' || type === 'sawtooth' ? 'sine' : type;
        osc.frequency.value = frequency;
        
        // Мягкая огибающая
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    // === МУЗЫКА ===
    
    /**
     * Фоновая музыка из файла
     */
    playBackgroundMusic() {
        if (!this.enabled || !this.musicEnabled) return;
        
        this.stopMusic();
        this.isMusicPlaying = true;
        
        // Загружаем музыку из файла
        this.loadMusicFile();
    }
    
    /**
     * Загрузить и воспроизвести музыкальный файл
     * ТРЕБОВАНИЯ ЯНДЕКС ИГР:
     * - disableRemotePlayback = true (не показывать системный плеер)
     * - playsInline = true (не выходить из полноэкранного режима)
     * - loop = true (зацикливание)
     */
    loadMusicFile() {
        if (!this.isMusicPlaying) return;
        
        // Создаём аудио элемент
        this.musicElement = new Audio();
        
        // === ТРЕБОВАНИЯ ЯНДЕКС ИГР для фоновой музыки ===
        // Отключаем системный плеер (media control center)
        this.musicElement.disableRemotePlayback = true;
        // Важно для iOS - не выходить из полноэкранного режима
        this.musicElement.playsInline = true;
        // Отключаем AirPlay
        this.musicElement.setAttribute('x-webkit-airplay', 'deny');
        // Отключаем кастинг
        this.musicElement.setAttribute('disable-remote-playback', 'true');
        // Зацикливаем
        this.musicElement.loop = true;
        // Предзагрузка
        this.musicElement.preload = 'auto';
        
        // Устанавливаем громкость
        this.musicElement.volume = this.musicEnabled ? this.musicVolume : 0;
        
        // Обработчик окончания (на всякий случай, хотя loop=true)
        this.musicElement.addEventListener('ended', () => {
            if (this.musicElement && this.isMusicPlaying) {
                this.musicElement.currentTime = 0;
                this.musicElement.play().catch(() => {});
            }
        });
        
        this.musicElement.addEventListener('error', () => {
            // Fallback на сгенерированную музыку
            this.playAmbientDrone();
        });
        
        // Ждём загрузки перед воспроизведением
        this.musicElement.addEventListener('canplaythrough', () => {
            if (this.musicElement && this.isMusicPlaying) {
                this.musicElement.play().catch(() => {});
            }
        });
        
        // Проверяем поддержку формата OGG
        const canPlayOgg = this.musicElement.canPlayType('audio/ogg');
        if (!canPlayOgg || canPlayOgg === '') {
            this.playAmbientDrone();
            return;
        }
        
        // Устанавливаем источник и начинаем загрузку
        this.musicElement.src = 'audio/background.ogg';
        this.musicElement.load();
        
        // Пытаемся запустить сразу (может не сработать без взаимодействия)
        this.musicElement.play().catch(() => {});
    }
    
    /**
     * Амбиентный дрон для фона (fallback если файл не загрузился)
     */
    playAmbientDrone() {
        if (!this.isMusicPlaying) return;
        
        const fund = 60; // Базовая частота
        
        // Создаём несколько осцилляторов для богатого звука
        const freqs = [fund, fund * 1.5, fund * 2, fund * 3];
        
        freqs.forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = f;
            
            // Очень медленное дыхание
            gain.gain.value = 0;
            
            osc.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start();
            
            // Автоматическая модуляция громкости
            this.modulateGain(gain, i);
            
            this.musicOscillators.push(osc);
        });
    }
    
    /**
     * Модуляция громкости для музыки (только для fallback)
     */
    modulateGain(gainNode, index) {
        if (!this.isMusicPlaying || this.musicElement) return; // Не модулируем если играет файл
        
        const baseVol = 0.05;
        const duration = 4000 + index * 1000; // 4-7 секунд
        
        gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(baseVol, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(baseVol * 2, this.audioContext.currentTime + duration / 2);
        gainNode.gain.linearRampToValueAtTime(baseVol, this.audioContext.currentTime + duration);
        
        setTimeout(() => {
            if (this.isMusicPlaying && !this.musicElement) {
                this.modulateGain(gainNode, index);
            }
        }, duration * 1000);
    }
    
    /**
     * Остановить музыку
     */
    stopMusic() {
        // Останавливаем осцилляторы (fallback музыка)
        this.musicOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {}
        });
        this.musicOscillators = [];
        
        // Останавливаем аудио элемент (файловая музыка)
        if (this.musicElement) {
            this.musicElement.pause();
            this.musicElement.currentTime = 0;
            this.musicElement = null;
        }
        
        this.isMusicPlaying = false;
    }
    
    /**
     * Пауза музыки (без сброса позиции)
     */
    pauseMusic() {
        if (this.musicElement) {
            this.musicElement.pause();
        }
    }
    
    /**
     * Продолжить музыку с места паузы
     */
    resumeMusic() {
        if (this.musicElement && this.musicEnabled) {
            this.musicElement.play().catch(e => {
                // Не удалось возобновить музыку
            });
        }
    }
    
    /**
     * Возобновить аудио контекст (нужно после взаимодействия пользователя)
     * Вызывается при первом клике/таче на игру
     */
    /**
     * Возобновить аудио контекст (нужно после взаимодействия пользователя)
     * Вызывается при первом клике/таче на игру
     */
    resume() {
        // Отмечаем что было взаимодействие пользователя
        this.hasUserInteraction = true;
        
        // Возобновляем AudioContext
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Запускаем музыку если она включена и не играет
        if (this.musicEnabled && !this.isMusicPlaying) {
            this.playBackgroundMusic();
        } else if (this.musicEnabled && this.isMusicPlaying && this.musicElement) {
            // Если музыка уже играет но была на паузе
            this.resumeMusic();
        }
    }
    
    /**
     * Пауза музыки для рекламы (вызывается из YandexSDK)
     * ВАЖНО: Музыка должна ставиться на паузу при показе рекламы
     */
    pauseForAd() {
        this.musicWasPlayingBeforePause = this.isMusicPlaying;
        this.pauseMusic();
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        // Музыка на паузе (реклама)
    }
    
    /**
     * Возобновление музыки после рекламы
     */
    resumeAfterAd() {
        if (this.musicWasPlayingBeforePause && this.musicEnabled) {
            this.resumeMusic();
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        // Музыка возобновлена (реклама закрыта)
    }
    
    // === СОХРАНЕНИЕ НАСТРОЕК ===
    
    save() {
        return {
            sfxEnabled: this.sfxEnabled,
            musicEnabled: this.musicEnabled,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            volume: this.volume
        };
    }
    
    load(data) {
        if (!data) return;
        
        this.sfxEnabled = data.sfxEnabled !== false;
        this.musicEnabled = data.musicEnabled !== false;
        this.sfxVolume = data.sfxVolume !== undefined ? data.sfxVolume : 1.0;
        this.musicVolume = data.musicVolume !== undefined ? data.musicVolume : 0.3;
        this.volume = data.volume || 0.5;
        
        // Применяем загруженные настройки
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
        }
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? this.musicVolume : 0;
        }
    }
}
