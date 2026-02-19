/* ===== ФИКСЫ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ ===== */

class MobileFixes {
    static init() {
        console.log('Инициализация мобильных фиксов...');
        
        // Определяем устройство
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.isMobile = this.isIOS || this.isAndroid;
        
        console.log(`Устройство: iOS=${this.isIOS}, Android=${this.isAndroid}, Mobile=${this.isMobile}`);
        
        if (this.isMobile) {
            this.applyMobileFixes();
        }
        
        if (this.isIOS) {
            this.applyIOSFixes();
        }
        
        if (this.isAndroid) {
            this.applyAndroidFixes();
        }
    }
    
    static applyMobileFixes() {
        console.log('Применение общих мобильных фиксов...');
        
        // 1. Предотвращаем масштабирование при двойном тапе
        document.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        // 2. Предотвращаем контекстное меню
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
        
        // 3. Фикс для viewport на мобильных
        this.fixViewport();
        
        // 4. Фикс для предотвращения ухода в сон
        this.preventSleep();
        
        // 5. Фикс для клавиатуры (если есть поля ввода)
        this.fixKeyboard();
    }
    
    static applyIOSFixes() {
        console.log('Применение iOS фиксов...');
        
        // 1. Фикс для pull-to-refresh
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 2. Фикс для адресной строки Safari
        this.fixSafariAddressBar();
        
        // 3. Фикс для полноэкранного режима
        this.fixIOSFullscreen();
        
        // 4. Фикс для Canvas (критично для предотвращения раздвоения)
        this.fixIOSCanvas();
        
        // 5. Фикс для анимаций (отключаем сложные анимации на iOS)
        this.disableComplexAnimations();
    }
    
    static applyAndroidFixes() {
        console.log('Применение Android фиксов...');
        
        // 1. Фикс для Chrome адресной строки
        this.fixChromeAddressBar();
        
        // 2. Фикс для back button
        this.fixAndroidBackButton();
        
        // 3. Фикс для Canvas мерцания
        this.fixAndroidCanvasFlicker();
    }
    
    static fixViewport() {
        // Динамическое обновление viewport при изменении размера
        function updateViewport() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Для iOS Safari - скрываем адресную строку
            if (this.isIOS && window.scrollY === 0) {
                window.scrollTo(0, 1);
            }
        }
        
        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateViewport, 300);
        });
        
        // Для iOS - обновляем при скролле
        if (this.isIOS) {
            window.addEventListener('scroll', updateViewport);
        }
    }
    
    static fixSafariAddressBar() {
        // Фикс для адресной строки Safari на iOS
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
        });
        
        // Фикс для изменения ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 300);
        });
    }
    
    static fixChromeAddressBar() {
        // Фикс для адресной строки Chrome на Android
        window.addEventListener('resize', () => {
            setTimeout(() => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            }, 100);
        });
    }
    
    static fixIOSCanvas() {
        // КРИТИЧНО: Фиксы для Canvas на iOS
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        // 1. Убираем все трансформации
        canvas.style.transform = 'none';
        canvas.style.webkitTransform = 'none';
        
        // 2. Фиксируем позиционирование
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        
        // 3. Убираем отступы и границы
        canvas.style.margin = '0';
        canvas.style.padding = '0';
        canvas.style.border = 'none';
        
        // 4. Предотвращаем сглаживание
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = 'crisp-edges';
        
        // 5. Включаем аппаратное ускорение
        canvas.style.webkitBackfaceVisibility = 'hidden';
        canvas.style.backfaceVisibility = 'hidden';
        
        // 6. Убираем тени и эффекты
        canvas.style.boxShadow = 'none';
        canvas.style.filter = 'none';
        
        console.log('iOS Canvas фиксы применены');
    }
    
    static disableComplexAnimations() {
        // Отключаем сложные анимации фона на iOS для производительности
        const bgElements = document.querySelectorAll('.stars-bg, .stars-bg-2, .stars-twinkle, .planet-bg, .planet-bg-2, .meteor');
        bgElements.forEach(el => {
            if (el) {
                el.style.animation = 'none';
                el.style.display = 'none';
            }
        });
        
        // Упрощаем фон
        const container = document.getElementById('game-container');
        if (container) {
            container.style.background = '#0a0a1a';
        }
        
        console.log('Сложные анимации отключены для iOS');
    }
    
    static fixAndroidCanvasFlicker() {
        // Фикс для мерцания Canvas на Android
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.style.webkitTransform = 'translateZ(0)';
        canvas.style.transform = 'translateZ(0)';
        
        console.log('Android Canvas фиксы применены');
    }
    
    static fixAndroidBackButton() {
        // Обработка кнопки назад на Android
        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, window.location.href);
            window.addEventListener('popstate', (e) => {
                window.history.pushState(null, null, window.location.href);
                // Можно показать диалог выхода
                // this.showExitDialog();
            });
        }
    }
    
    static fixIOSFullscreen() {
        // Фикс для полноэкранного режима на iOS
        document.addEventListener('touchstart', () => {
            // Активируем аудио контекст при первом тапе (если есть аудио)
            if (window.game && window.game.audioContext && window.game.audioContext.state === 'suspended') {
                window.game.audioContext.resume();
            }
        }, { once: true });
    }
    
    static preventSleep() {
        // Предотвращаем уход устройства в сон
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen');
                console.log('Wake lock активирован');
            } catch (err) {
                console.warn('Не удалось активировать wake lock:', err);
            }
        }
        
        // Альтернативный метод: таймер активности
        this._activityTimer = setInterval(() => {
            // Просто обновляем timestamp
            this._lastActivity = Date.now();
        }, 30000); // Каждые 30 секунд
    }
    
    static fixKeyboard() {
        // Фикс для клавиатуры на мобильных
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Прокручиваем к полю ввода
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
        });
    }
    
    static cleanup() {
        // Очистка ресурсов
        if (this._activityTimer) {
            clearInterval(this._activityTimer);
            this._activityTimer = null;
        }
    }
}

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => MobileFixes.init(), 100);
    });
} else {
    setTimeout(() => MobileFixes.init(), 100);
}

// Экспорт для использования в других модулях
window.MobileFixes = MobileFixes;

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
    MobileFixes.cleanup();
});