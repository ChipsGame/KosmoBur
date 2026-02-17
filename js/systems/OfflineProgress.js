/**
 * СИСТЕМА ОФФЛАЙН-ПРОГРЕССА
 * Заработок монет пока игрок не играл
 */
class OfflineProgress {
    constructor(game) {
        this.game = game;
        
        // Максимальное время оффлайн (в часах)
        this.maxOfflineHours = 8;
        
        // Множитель дохода оффлайн (процент от обычного)
        this.offlineMultiplier = 0.3; // 30% от обычного - намного меньше!
        
        // Минимальное время для показа окна (в минутах)
        this.minShowTime = 5;
    }
    
    /**
     * Сохранить время выхода
     */
    saveExitTime() {
        const now = Date.now();
        localStorage.setItem('drill_lastExit', now.toString());
    }
    
    /**
     * Рассчитать оффлайн-прогресс
     */
    calculateOfflineProgress() {
        const lastExit = localStorage.getItem('drill_lastExit');
        if (!lastExit) return null;
        
        const now = Date.now();
        const offlineTime = now - parseInt(lastExit);
        const offlineMinutes = offlineTime / (1000 * 60);
        
        // Если прошло мало времени - не показываем
        if (offlineMinutes < this.minShowTime) return null;
        
        // Ограничиваем максимальным временем
        const cappedHours = Math.min(offlineMinutes / 60, this.maxOfflineHours);
        const cappedMinutes = cappedHours * 60;
        
        // Рассчитываем доход
        const autoDrill = this.game.autoDrill;
        const economy = this.game.economy;
        
        if (autoDrill.getEffectiveSpeed() <= 0) {
            // Если нет автобура - минимальный доход
            return this.calculateMinimalIncome(cappedMinutes);
        }
        
        // Расчёт на основе автобура
        const clicksPerSecond = autoDrill.getEffectiveSpeed();
        const totalClicks = clicksPerSecond * (cappedMinutes * 60);
        
        // Средняя награда за слой (зависит от глубины)
        const avgReward = this.calculateAverageReward();
        
        // Сколько слоёв пройдено (УМЕНЬШЕНО!)
        const layersDestroyed = Math.floor(totalClicks * 0.1); // Только 10% кликов пробивают слой
        
        // Монеты
        const coinMultiplier = economy.coinMultiplier * this.offlineMultiplier;
        const coinsEarned = Math.floor(layersDestroyed * avgReward * coinMultiplier);
        
        // Руда
        const oreChance = economy.oreChance;
        const oreEarned = Math.floor(layersDestroyed * oreChance * this.offlineMultiplier);
        
        // Глубина
        const depthPerLayer = 8; // средняя глубина слоя
        const depthGained = Math.floor(layersDestroyed * depthPerLayer);
        
        return {
            offlineTime: cappedMinutes,
            offlineTimeText: this.formatOfflineTime(cappedMinutes),
            coins: coinsEarned,
            ore: oreEarned,
            depth: depthGained,
            layers: layersDestroyed,
            capped: offlineMinutes / 60 > this.maxOfflineHours
        };
    }
    
    /**
     * Минимальный доход (без автобура)
     */
    calculateMinimalIncome(minutes) {
        // Базовый доход - немного монет за время (УМЕНЬШЕНО!)
        const baseCoins = Math.floor(minutes * 0.5); // 0.5 монеты в минуту
        
        return {
            offlineTime: minutes,
            offlineTimeText: this.formatOfflineTime(minutes),
            coins: baseCoins,
            ore: Math.floor(minutes / 60), // 1 руда за час
            depth: 0,
            layers: 0,
            capped: minutes / 60 > this.maxOfflineHours,
            minimal: true
        };
    }
    
    /**
     * Рассчитать среднюю награду за слой
     */
    calculateAverageReward() {
        const depth = this.game.drill.depth;
        // Награда растёт с глубиной
        const baseReward = 10;
        const depthBonus = Math.sqrt(depth) * 2;
        return Math.floor(baseReward + depthBonus);
    }
    
    /**
     * Форматировать время оффлайн
     */
    formatOfflineTime(minutes) {
        if (minutes < 60) {
            return `${Math.floor(minutes)} мин`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        if (mins === 0) {
            return `${hours} ч`;
        }
        return `${hours} ч ${mins} мин`;
    }
    
    /**
     * Применить оффлайн-прогресс
     */
    applyOfflineProgress(data) {
        if (!data) return;
        
        // Начисляем ресурсы
        this.game.economy.addCoins(data.coins);
        this.game.economy.addOre(data.ore);
        
        // Увеличиваем глубину (визуально)
        this.game.drill.totalOfflineDepth = (this.game.drill.totalOfflineDepth || 0) + data.depth;
        
        return true;
    }
    
    /**
     * Показать модальное окно с оффлайн-прогрессом
     */
    showOfflineModal(data) {
        if (!data) return;
        
        // Удаляем старое окно если есть
        const oldModal = document.getElementById('modal-offline');
        if (oldModal) oldModal.remove();
        
        // Создаём модальное окно
        const modal = document.createElement('div');
        modal.id = 'modal-offline';
        modal.className = 'modal';
        
        const minimalText = data.minimal 
            ? '<p style="color: #aaa; font-size: 12px;">💡 Купите Автобур чтобы зарабатывать больше оффлайн!</p>' 
            : '';
        
        const cappedText = data.capped 
            ? '<p style="color: #ff6b6b; font-size: 12px;">⏱️ Максимальное время: 8 часов</p>' 
            : '';
        
        modal.innerHTML = `
            <div class="modal-content offline-modal">
                <h2>🌙 Вы отсутствовали</h2>
                <div class="offline-time">${data.offlineTimeText}</div>
                
                <div class="offline-rewards">
                    <div class="reward-item">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-value">+${Utils.formatNumber(data.coins)}</span>
                    </div>
                    <div class="reward-item">
                        <span class="reward-icon">💎</span>
                        <span class="reward-value">+${data.ore}</span>
                    </div>
                    ${data.depth > 0 ? `
                    <div class="reward-item">
                        <span class="reward-icon">📏</span>
                        <span class="reward-value">+${data.depth}м</span>
                    </div>
                    ` : ''}
                </div>
                
                ${minimalText}
                ${cappedText}
                
                <button class="offline-claim-btn">Забрать награду!</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчик кнопки
        modal.querySelector('.offline-claim-btn').addEventListener('click', () => {
            this.applyOfflineProgress(data);
            modal.remove();
        });
        
        // Применяем сразу, но показываем окно
        this.applyOfflineProgress(data);
    }
    
    /**
     * Проверить и показать оффлайн-прогресс при старте
     */
    checkOnStart() {
        const progress = this.calculateOfflineProgress();
        if (progress) {
            // Небольшая задержка чтобы игра загрузилась
            setTimeout(() => {
                this.showOfflineModal(progress);
            }, 500);
        }
    }
    
    /**
     * Очистить сохранённое время (для тестов)
     */
    clear() {
        localStorage.removeItem('drill_lastExit');
    }
    
    /**
     * Тест оффлайн-прогресса (для разработки)
     * Вызови в консоли: game.offlineProgress.test(5) - для 5 минут
     */
    test(minutes = 5) {
        // Сохраняем время в прошлом
        const pastTime = Date.now() - (minutes * 60 * 1000);
        localStorage.setItem('drill_lastExit', pastTime.toString());
        
        // Проверяем
        this.checkOnStart();
    }
}
