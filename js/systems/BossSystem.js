/**
 * СИСТЕМА БОССОВ - МЕТЕОРИТЫ
 * Каждые 400 метров появляется метеорит
 */
class BossSystem {
    constructor(game) {
        this.game = game;
        
        // Настройки босса
        this.bossInterval = 400; // метров
        this.bossTime = 30; // секунд на убийство
        this.tapsNeeded = 100; // тапов для убийства
        
        // Текущий босс
        this.active = false;
        this.bossY = 0;
        this.currentTaps = 0;
        this.timeLeft = 0;
        this.bossHealth = 100;
        
        // Чтобы не спавнить босса дважды на одной глубине
        this.lastBossDepth = 0;
        
        // Визуал
        this.bossX = 0;
        this.bossRotation = 0;
        this.particles = [];
        
        // Бонусы за победу
        this.rewards = {
            coinMultiplier: 2,    // x2 монеты на 2 минуты
            speedBoost: 2,        // x2 скорость на 2 минуты
            powerBoost: 2         // x2 урон на 2 минуты
        };
        
        // Активные бонусы
        this.activeBonuses = {
            coins: 0,    // время окончания бонуса
            speed: 0,
            power: 0
        };
        
        // Флаг показа уведомления о бонусе
        this.bonusNotificationShown = false;
    }
    
    update(dt) {
        // Проверяем появление босса
        if (!this.active) {
            const currentDepth = Math.floor(this.game.drill.depth);
            
            // Следующий босс только через 400м после предыдущего
            const nextBossDepth = this.lastBossDepth + this.bossInterval;
            
            // Отладка: показываем статус каждые 5 секунд
            if (Math.floor(Date.now() / 5000) % 2 === 0) {
                console.log('Босс: текущая глубина=' + currentDepth + ', следующий босс на=' + nextBossDepth + ', lastBoss=' + this.lastBossDepth);
            }
            
            // Спавним только если достигли следующей отметки
            if (currentDepth >= nextBossDepth && currentDepth >= 400) {
                console.log('Спавним босса на глубине:', nextBossDepth, 'текущая:', currentDepth);
                this.spawnBoss(nextBossDepth);
            }
            return;
        }
        
        // Обновляем таймер
        this.timeLeft -= dt;
        
        // Анимация прилёта метеорита снизу
        if (this.bossY > this.targetY) {
            this.bossY -= 300 * dt; // Скорость прилёта
        }
        
        // Обновляем частицы
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            p.vy += 50 * dt;
            return p.life > 0;
        });
        
        // Проверяем поражение
        if (this.timeLeft <= 0) {
            this.onDefeat();
        }
        
        // Обновляем активные бонусы
        this.updateBonuses();
        
        // Обновляем UI
        this.updateBossUI();
    }
    
    spawnBoss(bossDepth) {
        this.active = true;
        this.lastBossDepth = bossDepth; // Запоминаем глубину босса
        this.bossY = this.game.drill.y + 800; // Начинает дальше за пределами экрана (снизу)
        this.targetY = this.game.drill.y + 250; // Конечная позиция (ниже бура)
        this.bossX = 0;
        this.currentTaps = 0;
        this.timeLeft = this.bossTime;
        this.bossHealth = this.tapsNeeded;
        this.bonusNotificationShown = false;
        
        // Звук появления босса
        if (this.game.audio) {
            this.game.audio.playBossAppear();
        }
        
        // Скрываем плиты и останавливаем бур
        this.game.layersVisible = false;
        this.game.drill.isDrilling = false;
        this.game.drill.targetY = this.game.drill.y; // Фиксируем позицию бура
        
        this.showBossModal();
    }
    
    showBossModal() {
        const modal = document.createElement('div');
        modal.id = 'modal-boss';
        modal.className = 'modal';
        modal.style.zIndex = '3000'; // Поверх всего
        
        modal.innerHTML = `
            <div class="modal-content boss-modal">
                <h2>☄️ МЕТЕОРИТ!</h2>
                <div class="boss-info">
                    <p>На глубине ${Math.floor(this.game.drill.depth)}м обнаружен метеорит!</p>
                    <p>Тапай по экрану чтобы уничтожить его!</p>
                </div>
                <div class="boss-stats">
                    <div class="boss-stat">
                        <span class="boss-label">Тапов нужно:</span>
                        <span class="boss-value" id="boss-taps-needed">${this.tapsNeeded}</span>
                    </div>
                    <div class="boss-stat">
                        <span class="boss-label">Время:</span>
                        <span class="boss-value" id="boss-time">${this.bossTime}с</span>
                    </div>
                </div>
                <button class="boss-start-btn" id="boss-start">НАЧАТЬ БОЙ!</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#boss-start').addEventListener('click', () => {
            modal.remove();
            this.startBossFight();
        });
    }
    
    startBossFight() {
        // Ставим игру на паузу (бур не двигается)
        this.game.pause();
        
        // Показываем UI боя
        this.showBossUI();
        
        // Показываем UI баффов
        this.showBuffsUI();
        
        // Добавляем обработчик тапов
        this.bossClickHandler = (e) => {
            if (!this.active) return;
            this.onBossTap(e);
        };
        
        document.getElementById('game-container').addEventListener('click', this.bossClickHandler);
    }
    
    showBossUI() {
        const ui = document.createElement('div');
        ui.id = 'boss-ui';
        ui.innerHTML = `
            <div class="boss-bars-container">
                <!-- HP бар (красный) -->
                <div class="boss-bar-wrapper">
                    <div class="boss-bar-label">❤️ HP МЕТЕОРИТА</div>
                    <div class="boss-bar boss-hp-bar">
                        <div class="boss-bar-fill boss-hp-fill" id="boss-hp-fill"></div>
                    </div>
                    <div class="boss-bar-text" id="boss-hp-text">${this.bossHealth} / ${this.tapsNeeded}</div>
                </div>
                
                <!-- Таймер (синий) -->
                <div class="boss-bar-wrapper">
                    <div class="boss-bar-label">⏱️ ВРЕМЯ</div>
                    <div class="boss-bar boss-time-bar">
                        <div class="boss-bar-fill boss-time-fill" id="boss-time-fill"></div>
                    </div>
                    <div class="boss-bar-text boss-time-text" id="boss-time-text">${this.bossTime.toFixed(1)}с</div>
                </div>
            </div>
        `;
        document.body.appendChild(ui);
        
        // Обновляем баффы
        this.updateBuffsDisplay();
    }
    
    onBossTap(e) {
        // Не считаем клики по UI
        if (e.target.closest('#ui-layer') || e.target.closest('.modal')) return;
        
        this.currentTaps++;
        this.bossHealth--;
        
        // Звук удара по боссу
        if (this.game.audio) {
            this.game.audio.playBossHit();
        }
        
        // Эффект тапа
        this.createTapEffect(e.clientX, e.clientY);
        
        // Обновляем UI
        this.updateBossUI();
        
        // Проверяем победу
        if (this.bossHealth <= 0) {
            this.onVictory();
        }
    }
    
    createTapEffect(x, y) {
        // Создаём частицы
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x - this.game.canvas.getBoundingClientRect().left,
                y: y - this.game.canvas.getBoundingClientRect().top,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.5,
                color: '#ff6b6b',
                size: 3 + Math.random() * 3
            });
        }
    }
    
    updateBossUI() {
        if (!this.active) return;
        
        const hpPercent = (this.bossHealth / this.tapsNeeded) * 100;
        const timePercent = (this.timeLeft / this.bossTime) * 100;
        
        const hpFill = document.getElementById('boss-hp-fill');
        const timeFill = document.getElementById('boss-time-fill');
        const hpText = document.getElementById('boss-hp-text');
        const timeText = document.getElementById('boss-time-text');
        
        if (hpFill) hpFill.style.width = hpPercent + '%';
        if (timeFill) timeFill.style.width = timePercent + '%';
        if (hpText) hpText.textContent = `${this.bossHealth} / ${this.tapsNeeded}`;
        if (timeText) timeText.textContent = `${this.timeLeft.toFixed(1)}с`;
        
        // Обновляем баффы
        this.updateBuffsDisplay();
    }
    
    updateBuffsDisplay() {
        const buffsContainer = document.getElementById('boss-buffs');
        const buffsWrapper = document.getElementById('boss-buffs-container');
        if (!buffsContainer || !buffsWrapper) {
            // Если контейнеров нет, но есть активные бонусы - создаём UI
            if (this.hasActiveBonuses()) {
                this.showBuffsUI();
            }
            return;
        }
        
        const now = Date.now();
        let buffsHTML = '';
        let hasBuffs = false;
        
        // Проверяем активные баффы
        if (now < this.activeBonuses.coins) {
            const timeLeft = Math.ceil((this.activeBonuses.coins - now) / 1000);
            buffsHTML += `<div class="boss-buff">💰 x2 (${timeLeft}с)</div>`;
            hasBuffs = true;
        }
        if (now < this.activeBonuses.speed) {
            const timeLeft = Math.ceil((this.activeBonuses.speed - now) / 1000);
            buffsHTML += `<div class="boss-buff">⚡ x2 (${timeLeft}с)</div>`;
            hasBuffs = true;
        }
        if (now < this.activeBonuses.power) {
            const timeLeft = Math.ceil((this.activeBonuses.power - now) / 1000);
            buffsHTML += `<div class="boss-buff">💪 x2 (${timeLeft}с)</div>`;
            hasBuffs = true;
        }
        
        buffsContainer.innerHTML = buffsHTML;
        
        // Скрываем контейнер если баффов нет
        buffsWrapper.style.display = hasBuffs ? 'block' : 'none';
        
        // Сбрасываем флаг уведомления когда все баффы закончились
        if (!hasBuffs) {
            this.bonusNotificationShown = false;
        }
    }
    
    onVictory() {
        this.active = false;
        
        // Звук победы над боссом
        if (this.game.audio) {
            this.game.audio.playBossWin();
        }
        
        // Убираем обработчик
        document.getElementById('game-container').removeEventListener('click', this.bossClickHandler);
        
        // Убираем UI босса (но не баффы!)
        const ui = document.getElementById('boss-ui');
        if (ui) ui.remove();
        
        // Возвращаем плитки
        this.game.layersVisible = true;
        
        // Возобновляем игру
        this.game.resume();
        
        // Даём бонусы
        this.giveRewards();
        
        // Отправляем в систему достижений
        if (this.game.achievements) {
            this.game.achievements.onBossDefeated(this.timeLeft, this.bossTime);
        }
        
        // Показываем победный экран
        this.showVictoryModal();
    }
    
    onDefeat() {
        this.active = false;
        
        // Убираем обработчик
        document.getElementById('game-container').removeEventListener('click', this.bossClickHandler);
        
        // Убираем UI
        const ui = document.getElementById('boss-ui');
        if (ui) ui.remove();
        
        // Возвращаем плитки
        this.game.layersVisible = true;
        
        // Показываем экран поражения с рекламой
        this.showDefeatModal();
    }
    
    giveRewards() {
        const now = Date.now();
        const duration = 2 * 60 * 1000; // 2 минуты
        
        this.activeBonuses.coins = now + duration;
        this.activeBonuses.speed = now + duration;
        this.activeBonuses.power = now + duration;
        
        // Применяем бонусы
        this.game.economy.tempCoinMultiplier = this.rewards.coinMultiplier;
        this.game.drill.tempSpeedMultiplier = this.rewards.speedBoost;
        this.game.drill.tempPowerMultiplier = this.rewards.powerBoost;
        
        // Мгновенная награда - монеты за босса
        const bossReward = 1000 * Math.floor(this.lastBossDepth / this.bossInterval);
        this.game.economy.addCoins(bossReward);
        this.game.showNotification(`💰 +${Utils.formatNumber(bossReward)} за победу над боссом!`, '#ffd700', 3000);
    }
    
    updateBonuses() {
        const now = Date.now();
        let hasActiveBonus = false;
        
        // Проверяем и сбрасываем истёкшие бонусы
        if (now > this.activeBonuses.coins) {
            this.game.economy.tempCoinMultiplier = 1;
        } else {
            hasActiveBonus = true;
        }
        
        if (now > this.activeBonuses.speed) {
            this.game.drill.tempSpeedMultiplier = 1;
        } else {
            hasActiveBonus = true;
        }
        
        if (now > this.activeBonuses.power) {
            this.game.drill.tempPowerMultiplier = 1;
        } else {
            hasActiveBonus = true;
        }
        
        // Показываем уведомление о бонусах
        if (hasActiveBonus && !this.bonusNotificationShown) {
            this.bonusNotificationShown = true;
            this.showBonusNotification();
        }
        
        // Обновляем отображение баффов (всегда, не только во время боя)
        this.updateBuffsDisplay();
    }
    
    /**
     * Проверить есть ли активные бонусы
     */
    hasActiveBonuses() {
        const now = Date.now();
        return now < this.activeBonuses.coins || 
               now < this.activeBonuses.speed || 
               now < this.activeBonuses.power;
    }
    
    /**
     * Показать/обновить UI баффов
     */
    showBuffsUI() {
        let buffsContainer = document.getElementById('boss-buffs-container');
        if (!buffsContainer) {
            buffsContainer = document.createElement('div');
            buffsContainer.id = 'boss-buffs-container';
            buffsContainer.innerHTML = '<div class="boss-buffs" id="boss-buffs"></div>';
            document.body.appendChild(buffsContainer);
        }
    }
    
    showBonusNotification() {
        this.game.showNotification('⚡ БОНУСЫ АКТИВНЫ: x2 монеты, скорость, урон!', '#ffd700', 5000);
    }
    
    showVictoryModal() {
        const modal = document.createElement('div');
        modal.id = 'modal-boss-victory';
        modal.className = 'modal';
        modal.style.zIndex = '3000'; // Поверх всего
        
        modal.innerHTML = `
            <div class="modal-content boss-victory-modal">
                <div class="boss-icon">💥</div>
                <h2>МЕТЕОРИТ УНИЧТОЖЕН!</h2>
                <div class="boss-rewards">
                    <p>🏆 Получены бонусы на 2 минуты:</p>
                    <ul>
                        <li>💰 x2 монеты</li>
                        <li>⚡ x2 скорость</li>
                        <li>💪 x2 урон</li>
                    </ul>
                </div>
                <button class="boss-continue-btn" id="boss-continue">Продолжить</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#boss-continue').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    showDefeatModal() {
        const modal = document.createElement('div');
        modal.id = 'modal-boss-defeat';
        modal.className = 'modal';
        modal.style.zIndex = '3000'; // Поверх всего
        
        const canShowAd = window.yandexSDK && window.yandexSDK.isReady;
        
        modal.innerHTML = `
            <div class="modal-content boss-defeat-modal">
                <div class="boss-icon">😢</div>
                <h2>Метеорит улетел!</h2>
                <p>Вы не успели уничтожить метеорит.</p>
                ${canShowAd ? `
                    <div class="boss-ad-offer">
                        <p>Хотите продолжить бой?</p>
                        <button class="boss-ad-btn" id="boss-watch-ad">
                            📺 Смотреть рекламу<br>
                            <small>+30 секунд и продолжить бой</small>
                        </button>
                    </div>
                ` : ''}
                <button class="boss-skip-btn" id="boss-skip">Пропустить</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        if (canShowAd) {
            modal.querySelector('#boss-watch-ad').addEventListener('click', async () => {
                const rewarded = await window.yandexSDK.showRewardedAd(() => {
                    // Награда - продолжить бой
                    modal.remove();
                    this.continueBossFight();
                });
                
                if (!rewarded) {
                    this.game.showNotification('Реклама не досмотрена', '#ff6b6b', 3000);
                }
            });
        }
        
        modal.querySelector('#boss-skip').addEventListener('click', () => {
            modal.remove();
            this.game.resume();
        });
    }
    
    continueBossFight() {
        this.active = true;
        this.timeLeft = 30; // +30 секунд
        
        // Возобновляем бой
        this.game.pause();
        this.showBossUI();
        
        document.getElementById('game-container').addEventListener('click', this.bossClickHandler);
    }
    
    render(ctx, camera) {
        if (!this.active) return;
        
        const screenY = this.bossY - camera.y;
        const centerX = this.game.width / 2;
        
        // Рисуем частицы
        for (const p of this.particles) {
            const px = p.x;
            const py = p.y - camera.y;
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 0.5;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Рисуем метеорит
        ctx.save();
        ctx.translate(centerX, screenY);
        ctx.rotate(this.bossRotation);
        
        const size = 100 - (this.currentTaps / this.tapsNeeded) * 30; // Уменьшается при ударах
        
        // Свечение вокруг метеорита
        const glowGrad = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 1.5);
        glowGrad.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
        glowGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Тело метеорита
        const meteorGrad = ctx.createRadialGradient(-15, -15, 0, 0, 0, size);
        meteorGrad.addColorStop(0, '#ffaa88');
        meteorGrad.addColorStop(0.3, '#ff6b4a');
        meteorGrad.addColorStop(0.7, '#c53030');
        meteorGrad.addColorStop(1, '#742a2a');
        
        ctx.fillStyle = meteorGrad;
        ctx.beginPath();
        // Неровная форма метеорита
        const points = [
            {angle: 0, r: 1},
            {angle: 0.8, r: 0.9},
            {angle: 1.5, r: 1.1},
            {angle: 2.2, r: 0.85},
            {angle: 3.0, r: 1},
            {angle: 3.8, r: 0.9},
            {angle: 4.5, r: 1.05},
            {angle: 5.5, r: 0.95}
        ];
        
        points.forEach((p, i) => {
            const x = Math.cos(p.angle) * size * p.r;
            const y = Math.sin(p.angle) * size * p.r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        
        // Кратеры на метеорите
        ctx.fillStyle = 'rgba(60, 20, 20, 0.4)';
        const craters = [
            {x: -30, y: -20, r: 12},
            {x: 25, y: 15, r: 15},
            {x: -15, y: 30, r: 10},
            {x: 35, y: -25, r: 8}
        ];
        for (const c of craters) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Трещины от ударов
        if (this.currentTaps > 20) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-20, -10);
            ctx.lineTo(0, 10);
            ctx.lineTo(20, -5);
            ctx.stroke();
        }
        if (this.currentTaps > 50) {
            ctx.beginPath();
            ctx.moveTo(-30, 20);
            ctx.lineTo(-10, 0);
            ctx.lineTo(15, 25);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Получить множитель монет (для Economy)
     */
    getCoinMultiplier() {
        return Date.now() < this.activeBonuses.coins ? this.rewards.coinMultiplier : 1;
    }
    
    /**
     * Сохранение
     */
    save() {
        return {
            bonuses: this.activeBonuses,
            lastBossDepth: this.lastBossDepth
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) return;
        if (data.bonuses) {
            this.activeBonuses = data.bonuses;
        }
        if (data.lastBossDepth) {
            this.lastBossDepth = data.lastBossDepth;
        }
    }
}
