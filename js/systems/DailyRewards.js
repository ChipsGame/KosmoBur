/**
 * СИСТЕМА ЕЖЕДНЕВНЫХ НАГРАД
 * Вознаграждение за ежедневный вход
 */
class DailyRewards {
    constructor(game) {
        this.game = game;
        
        // Текущий день стрика
        this.currentStreak = 0;
        
        // Последний день получения награды
        this.lastClaimDate = null;
        
        // Награды за дни (7-дневный цикл) - УВЕЛИЧЕНЫ!
        this.rewards = [
            { day: 1, coins: 500,   ore: 1,  boost: null, name: 'День 1' },
            { day: 2, coins: 1000,  ore: 2,  boost: null, name: 'День 2' },
            { day: 3, coins: 2000,  ore: 3,  boost: 'power', name: 'День 3' },
            { day: 4, coins: 3500,  ore: 5,  boost: null, name: 'День 4' },
            { day: 5, coins: 6000,  ore: 8,  boost: 'speed', name: 'День 5' },
            { day: 6, coins: 10000, ore: 12, boost: null, name: 'День 6' },
            { day: 7, coins: 20000, ore: 20, boost: 'legendary', name: 'ДЕНЬ 7! 🎁' }
        ];
        
        // Проверка доступности
        this.canClaim = false;
        this.nextReward = null;
    }
    
    /**
     * Проверить статус ежедневной награды
     */
    checkStatus() {
        const now = new Date();
        const today = this.getDateString(now);
        
        if (!this.lastClaimDate) {
            // Никогда не получал награду
            this.canClaim = true;
            this.currentStreak = 0;
        } else {
            const lastDate = new Date(this.lastClaimDate);
            const diffDays = this.getDaysDifference(lastDate, now);
            
            if (diffDays === 0) {
                // Уже получал сегодня
                this.canClaim = false;
            } else if (diffDays === 1) {
                // Следующий день - продолжаем стрик
                this.canClaim = true;
            } else {
                // Пропустил день - сброс стрика
                this.canClaim = true;
                this.currentStreak = 0;
            }
        }
        
        // Определяем следующую награду
        const rewardIndex = this.currentStreak % 7;
        this.nextReward = this.rewards[rewardIndex];
        
        return {
            canClaim: this.canClaim,
            streak: this.currentStreak,
            nextReward: this.nextReward
        };
    }
    
    /**
     * Получить строку даты (YYYY-MM-DD)
     */
    getDateString(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    /**
     * Разница в днях между датами
     */
    getDaysDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const diff = Math.floor((date2 - date1) / oneDay);
        return diff;
    }
    
    /**
     * Получить награду
     */
    claim() {
        if (!this.canClaim) return null;
        
        const status = this.checkStatus();
        const reward = status.nextReward;
        
        // Начисляем награду
        this.game.economy.addCoins(reward.coins);
        this.game.economy.addOre(reward.ore);
        
        // Активируем буст если есть
        if (reward.boost) {
            this.activateBoost(reward.boost);
        }
        
        // Обновляем стрик
        this.currentStreak++;
        this.lastClaimDate = this.getDateString(new Date());
        this.canClaim = false;
        
        // Сохраняем
        this.game.saveManager.save();
        
        return {
            success: true,
            reward: reward,
            newStreak: this.currentStreak
        };
    }
    
    /**
     * Активировать буст награды
     */
    activateBoost(type) {
        const drill = this.game.drill;
        
        switch(type) {
            case 'power':
                // Временный множитель силы x2 на 10 минут
                drill.tempPowerMultiplier = 2;
                setTimeout(() => {
                    drill.tempPowerMultiplier = 1;
                }, 10 * 60 * 1000);
                break;
            case 'speed':
                // Временный множитель скорости x2 на 10 минут
                drill.tempSpeedMultiplier = 2;
                setTimeout(() => {
                    drill.tempSpeedMultiplier = 1;
                }, 10 * 60 * 1000);
                break;
            case 'legendary':
                // Легендарный буст: всё x2 на 30 минут
                drill.tempPowerMultiplier = 2;
                drill.tempSpeedMultiplier = 2;
                this.game.economy.tempCoinMultiplier = 2;
                setTimeout(() => {
                    drill.tempPowerMultiplier = 1;
                    drill.tempSpeedMultiplier = 1;
                    this.game.economy.tempCoinMultiplier = 1;
                }, 30 * 60 * 1000);
                break;
        }
    }
    
    /**
     * Получить прогресс недели
     */
    getWeekProgress() {
        const progress = [];
        const currentDay = this.currentStreak % 7;
        
        for (let i = 0; i < 7; i++) {
            const day = (this.currentStreak - currentDay + i) % 7;
            const reward = this.rewards[i];
            
            progress.push({
                day: i + 1,
                reward: reward,
                status: i < currentDay ? 'claimed' : (i === currentDay && this.canClaim ? 'available' : 'locked')
            });
        }
        
        return progress;
    }
    
    /**
     * Показать модальное окно ежедневных наград
     */
    showModal() {
        const status = this.checkStatus();
        const weekProgress = this.getWeekProgress();
        
        // Удаляем старое окно
        const oldModal = document.getElementById('modal-daily');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-daily';
        modal.className = 'modal';
        
        // Генерируем HTML для дней
        const daysHTML = weekProgress.map((day, index) => {
            const isClaimed = day.status === 'claimed';
            const isAvailable = day.status === 'available';
            const isLocked = day.status === 'locked';
            
            let className = 'daily-day';
            if (isClaimed) className += ' claimed';
            if (isAvailable) className += ' available';
            if (isLocked) className += ' locked';
            
            const icon = day.reward.boost ? '⚡' : (day.day === 7 ? '🎁' : '📅');
            
            return `
                <div class="${className}">
                    <div class="daily-day-number">${day.reward.name}</div>
                    <div class="daily-day-icon">${icon}</div>
                    <div class="daily-day-reward">
                        🪙 ${Utils.formatNumber(day.reward.coins)}
                        ${day.reward.ore > 0 ? `<br>💎 ${day.reward.ore}` : ''}
                    </div>
                    ${isClaimed ? '<div class="daily-check">✓</div>' : ''}
                </div>
            `;
        }).join('');
        
        const claimButton = status.canClaim 
            ? `<button class="daily-claim-btn" id="daily-claim">Получить награду!</button>`
            : `<button class="daily-claim-btn" disabled>Следующая награда завтра</button>`;
        
        const streakText = this.currentStreak > 0 
            ? `<div class="daily-streak">🔥 Стрик: ${this.currentStreak} дней</div>` 
            : '';
        
        modal.innerHTML = `
            <div class="modal-content daily-modal">
                <h2>📅 Ежедневные награды</h2>
                ${streakText}
                
                <div class="daily-days-grid">
                    ${daysHTML}
                </div>
                
                <div class="daily-info">
                    <p>Заходите каждый день, чтобы получать всё лучшие награды!</p>
                    <p>7-й день даёт легендарный буст! 🎁</p>
                </div>
                
                ${claimButton}
                <button class="close-modal" id="daily-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        if (status.canClaim) {
            modal.querySelector('#daily-claim').addEventListener('click', () => {
                const result = this.claim();
                if (result) {
                    this.showClaimAnimation(result.reward);
                    // Закрываем модалку сразу после получения награды
                    modal.remove();
                }
            });
        }
        
        modal.querySelector('#daily-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    /**
     * Показать анимацию получения награды
     */
    showClaimAnimation(reward) {
        // Показываем простое уведомление вместо DOM-анимации
        // Это предотвращает лаги на мобильных устройствах
        if (window.game && window.game.showNotification) {
            window.game.showNotification(
                `🎁 +${Utils.formatNumber(reward.coins)} 🪙 +${reward.ore} 💎`,
                '#ffd700',
                3000
            );
        }
    }
    
    /**
     * Проверить при запуске и показать если доступно
     */
    checkOnStart() {
        const status = this.checkStatus();
        if (status.canClaim) {
            // Показываем с небольшой задержкой
            setTimeout(() => {
                this.showModal();
            }, 1000);
        }
    }
    
    /**
     * Сохранение
     */
    save() {
        return {
            streak: this.currentStreak,
            lastClaim: this.lastClaimDate
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) return;
        
        this.currentStreak = data.streak || 0;
        this.lastClaimDate = data.lastClaim || null;
    }
}
