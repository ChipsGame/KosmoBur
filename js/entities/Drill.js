class Drill {
    constructor(game) {
        this.game = game;
        this.x = game.width / 2;
        
        // Оптимизированная начальная позиция: бур должен быть сразу над первым слоем
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        
        // Адаптация под разные экраны
        if (screenHeight < 500) {
            // Очень короткие экраны (iPhone SE и подобные)
            this.y = 120; // Еще выше для коротких экранов
            this.height = 140; // Уменьшаем высоту
        } else if (screenHeight < 700) {
            // Средние экраны
            this.y = 180;
            this.height = 170;
        } else {
            // Большие экраны
            this.y = 200;
            this.height = 200;
        }
        
        this.width = 120;

        // Базовые характеристики
        this.basePower = 1;
        this.baseSpeed = 100; // пикселей в секунду
        this.baseTemperature = 0;
        this.maxTemperature = 100;

        // Текущие значения
        this.power = this.basePower;
        this.speed = this.baseSpeed;
        this.temperature = 0;
        this.depth = 0;
        this.coolingEfficiency = 1;
        
        // === НОВЫЕ СВОЙСТВА ДЛЯ УЛУЧШЕНИЙ ===
        // Критический удар
        this.critChance = 0; // Шанс пробить слой с 1 клика
        
        // Супер удар
        this.superStrikeInterval = 0; // Каждый N-ный клик (0 = выключено)
        this.clickCounter = 0; // Счётчик кликов для суперудара
        
        // Охлаждение
        this.heatMultiplier = 1; // Множитель нагрева (<1 = меньше нагрев)
        
        // Ярость (Rampage)
        this.rampageMultiplier = 1; // Множитель урона от скорости кликов
        this.lastClickTime = 0; // Время последнего клика

        // Состояние
        this.isDrilling = false;
        this.rotation = 0;
        this.targetY = this.y;
        
        // Эффект дрожания при бурении
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeTime = 0;

        // Визуал
        this.color = '#888';
        this.tipColor = '#ff6b6b';
        
        // Логирование для отладки
        console.log('Бур создан:', { 
            x: this.x, 
            y: this.y, 
            width: this.width, 
            height: this.height,
            screenSize: `${screenWidth}x${screenHeight}`
        });
    }

    update(dt) {
        // Проверяем ввод (клик)
        const justClicked = this.game.input.isPressed && !this.isDrilling;
        this.isDrilling = this.game.input.isPressed;

        // Обновляем эффект дрожания
        if (this.isDrilling) {
            // Интенсивность дрожания зависит от множителя дрифта
            const driftMult = this.game.driftSystem.multiplier;
            this.shakeIntensity = Math.min(0.5 + (driftMult - 1) * 0.3, 2.0);
            
            // Увеличиваем время для анимации дрожания
            this.shakeTime += dt * 20 * driftMult;
            
            // Вычисляем смещение с использованием синуса и косинуса для естественного дрожания
            this.shakeOffsetX = Math.sin(this.shakeTime * 1.7) * this.shakeIntensity * 3;
            this.shakeOffsetY = Math.cos(this.shakeTime * 1.3) * this.shakeIntensity * 2;
        } else {
            // Плавно уменьшаем дрожание при остановке
            this.shakeIntensity *= 0.9;
            this.shakeOffsetX *= 0.9;
            this.shakeOffsetY *= 0.9;
        }

        // ОБРАБОТКА КЛИКА (импульсное движение)
        if (justClicked) {
            this.clickCounter++;
            
            // Рассчитываем множители
            const driftMult = this.game.driftSystem.multiplier;
            
            // === ЯРОСТЬ (Rampage): бонус за быстрые клики ===
            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;
            this.lastClickTime = now;
            
            let rampageBonus = 1;
            if (timeSinceLastClick < 200) { // Менее 200мс между кликами = быстро
                rampageBonus = this.rampageMultiplier;
            }
            
            // === СУПЕР УДАР: каждый N-ный клик ===
            let superStrikeBonus = 1;
            let isSuperStrike = false;
            if (this.superStrikeInterval > 0 && this.clickCounter % this.superStrikeInterval === 0) {
                superStrikeBonus = 2;
                isSuperStrike = true;
            }
            
            // === КРИТИЧЕСКИЙ УДАР: шанс пробить слой мгновенно ===
            const isCrit = Math.random() < this.critChance;
            
            // Итоговый множитель урона
            const totalMult = driftMult * rampageBonus * superStrikeBonus;
            
            // Импульс от клика
            const clickPower = this.speed * 0.05 * totalMult;
            this.targetY += clickPower;

            // Вращение
            this.rotation += 0.5 * totalMult;

            // Нагрев от клика (с учётом охлаждения)
            const baseHeat = 3 * (driftMult > 2 ? 1.5 : 1);
            const heatPerClick = baseHeat * this.heatMultiplier;
            this.temperature = Math.min(this.temperature + heatPerClick, this.maxTemperature);

            // Проверка столкновения со слоями
            this.checkCollisions(dt, isCrit);

            // Обновляем дрифт
            this.game.driftSystem.onDrilling(0.016 * totalMult);
            
            // Эффект удара (с особым для крита/суперудара)
            this.onClickEffect(isCrit, isSuperStrike);
        }
        
        // Остывание когда не кликаем
        if (!this.isDrilling) {
            this.temperature = Math.max(this.temperature - (10 * this.coolingEfficiency) * dt, 0);
            this.game.driftSystem.onStop();
        }

        // Плавное движение
        this.y += (this.targetY - this.y) * 0.1;
        this.depth = Math.max(this.depth, (this.y - 200) / 10);

        // Обновляем камеру плавно
        const targetCameraY = this.y - 300;
        this.game.camera.y += (targetCameraY - this.game.camera.y) * 0.1;

        // Частицы при бурении
        if (this.isDrilling && Math.random() < 0.3) {
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * 60,
                this.y + 100,
                'dust',
                '#8b4513',
                3 + Math.random() * 5
            );
        }
    }

    checkCollisions(dt, isCrit = false) {
        const drillBottom = this.y + this.height / 2;
        
        // Оптимизация: проверяем только видимые слои
        const visibleLayers = this.game.visibleLayers || this.game.layers;
        
        // Находим ближайший НЕ разрушенный слой под буром
        let targetLayer = null;
        let minDistance = Infinity;

        for (let layer of visibleLayers) {
            if (layer.isDestroyed) continue;

            const layerTop = layer.y - layer.height / 2;
            const distance = layerTop - drillBottom;
            
            // Ищем слой под буром или ближайший сверху
            if (distance < minDistance && distance > -this.height) {
                minDistance = distance;
                targetLayer = layer;
            }
        }
        
        if (targetLayer) {
            const layerTop = targetLayer.y - targetLayer.height / 2;
            const layerBottom = targetLayer.y + targetLayer.height / 2;
            
            // Проверка пересечения
            if (drillBottom > layerTop && drillBottom < layerBottom + 20) {
                // === КРИТИЧЕСКИЙ УДАР: мгновенно разрушаем слой ===
                if (isCrit) {
                    targetLayer.health = 0;
                    targetLayer.destroy();
                    this.onLayerDestroyed(targetLayer);
                    return;
                }
                
                // Наносим урон слою
                const damage = this.power * this.game.driftSystem.multiplier;
                const destroyed = targetLayer.takeDamage(damage, dt);

                if (destroyed) {
                    this.onLayerDestroyed(targetLayer);
                    // СРАЗУ падаем на следующий слой!
                    this.fallToNextLayer();
                } else {
                    // Застряли — не двигаемся дальше
                    this.targetY = layerTop - this.height / 2;
                }
            }
        }
    }
    
    /**
     * Падение на следующий слой после разрушения
     */
    fallToNextLayer() {
        // Находим следующий НЕ разрушенный слой
        const visibleLayers = this.game.visibleLayers || this.game.layers;
        
        for (let layer of visibleLayers) {
            if (layer.isDestroyed) continue;
            
            const layerTop = layer.y - layer.height / 2;
            
            // Если слой ниже текущей позиции бура
            if (layerTop > this.y) {
                // Падаем прямо на него
                this.targetY = layerTop - this.height / 2;
                this.y = this.targetY; // Мгновенное падение
                break;
            }
        }
    }

    onLayerDestroyed(layer) {
        // Рассчитываем награду
        let reward = layer.reward * this.game.economy.coinMultiplier;
        
        // Множитель от глубины (улучшение Deep Diver)
        reward *= this.game.economy.depthMultiplier;
        
        // Шанс двойной награды
        if (Math.random() < this.game.economy.doubleRewardChance) {
            reward *= 2;
            // Эффект двойной награды
            for (let i = 0; i < 5; i++) {
                this.game.createParticle(
                    layer.x + (Math.random() - 0.5) * 50,
                    layer.y - 50,
                    'spark',
                    '#ffd700',
                    4 + Math.random() * 4
                );
            }
        }
        
        // Начисляем монеты
        this.game.economy.addCoins(Math.floor(reward));
        
        // Шанс руды (с учетом oreChance)
        if (Math.random() < this.game.economy.oreChance) {
            this.game.economy.addOre(1);
        }

        // Частицы
        for (let i = 0; i < 10; i++) {
            this.game.createParticle(
                layer.x + (Math.random() - 0.5) * layer.width,
                layer.y,
                'debris',
                layer.color,
                4 + Math.random() * 8
            );
        }

        // Обновляем текущий пройденный слой
        this.game.currentLayer = Math.max(this.game.currentLayer, layer.index + 1);
        
        // СРАЗУ падаем на следующий слой
        this.fallToNextLayer();
    }
    
    /**
     * Эффект при клике
     * @param {boolean} isCrit - был ли критический удар
     * @param {boolean} isSuperStrike - был ли супер удар
     */
    onClickEffect(isCrit = false, isSuperStrike = false) {
        // Определяем цвет и интенсивность эффекта
        let particleCount = 3;
        let sparkCount = 0;
        let sparkColor = '#ffaa00';
        
        if (isCrit) {
            particleCount = 15;
            sparkCount = 10;
            sparkColor = '#ff0000'; // Красные искры для крита
        } else if (isSuperStrike) {
            particleCount = 8;
            sparkCount = 8;
            sparkColor = '#00ffff'; // Голубые искры для суперудара
        }
        
        // Создаём частицы при клике
        for (let i = 0; i < particleCount; i++) {
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * 40,
                this.y + 80,
                'dust',
                isCrit ? '#ff6666' : '#8b4513',
                3 + Math.random() * 4
            );
        }
        
        // Искры от удара
        if (sparkCount > 0 || Math.random() < 0.3) {
            const count = sparkCount > 0 ? sparkCount : 5;
            for (let i = 0; i < count; i++) {
                this.game.createParticle(
                    this.x + (Math.random() - 0.5) * 30,
                    this.y + 90,
                    'spark',
                    sparkColor,
                    2 + Math.random() * 3
                );
            }
        }
    }

    render(ctx, camera) {
        const screenY = this.y - camera.y;
        
        // Получаем цвета и ID текущего скина
        const skinId = this.game.skins ? this.game.skins.currentSkin : 'default';
        const colors = this.game.skins ? this.game.skins.getColors() : {
            body: '#718096',
            cabin: '#2d3748',
            drill: '#a0aec0',
            window: '#4299e1'
        };
        
        // Размеры бура
        const bodyWidth = 70;
        const bodyHeight = 120;
        const drillLength = 50;
        
        ctx.save();
        
        // Применяем эффект дрожания при бурении
        const shakeX = this.shakeOffsetX;
        const shakeY = this.shakeOffsetY;
        ctx.translate(this.x + shakeX, screenY + shakeY);
        
        // === УНИКАЛЬНЫЕ ДЕТАЛИ ДЛЯ КАЖДОГО СКИНА ===
        
        // 1. СВЕРЛО - разное для разных скинов
        this.renderDrillBit(ctx, skinId, colors, bodyHeight, drillLength);
        
        // 2. КОРПУС БУРА
        this.renderBody(ctx, skinId, colors, bodyWidth, bodyHeight);
        
        // 3. КАБИНА
        this.renderCabin(ctx, skinId, colors, bodyWidth, bodyHeight);
        
        // 4. ИЛЛЮМИНАТОР / ГЛАЗ / и т.д.
        this.renderWindow(ctx, skinId, colors, bodyHeight);
        
        // 5. УНИКАЛЬНЫЕ ДЕТАЛИ СКИНА
        this.renderSkinDetails(ctx, skinId, colors, bodyWidth, bodyHeight);
        
        // 6. ИНДИКАТОР ТЕМПЕРАТУРЫ
        const tempPercent = this.temperature / this.maxTemperature;
        const tempColor = tempPercent > 0.7 ? '#e53e3e' : (tempPercent > 0.4 ? '#ecc94b' : '#48bb78');
        
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(bodyWidth/2 + 5, -25, 6, 50);
        
        ctx.fillStyle = tempColor;
        const fillHeight = 46 * tempPercent;
        ctx.fillRect(bodyWidth/2 + 7, 23 - fillHeight, 2, fillHeight);
        
        // 7. ИНДИКАЦИЯ ПЕРЕГРЕВА
        if (this.temperature > 70) {
            const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.strokeStyle = `rgba(229, 62, 62, ${pulseAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(-bodyWidth/2 - 2, -bodyHeight/2 - 2, bodyWidth + 4, bodyHeight + 4, 14);
            ctx.stroke();
        }
        
        // 8. ТЕНЬ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, bodyHeight/2 + 35, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Эффект дрифта
        if (this.game.driftSystem.multiplier > 1.5) {
            this.renderDriftEffect(ctx, screenY);
        }
    }
    
    // === ОТДЕЛЬНЫЕ ЧАСТИ БУРА ===
    
    renderDrillBit(ctx, skinId, colors, bodyHeight, drillLength) {
        const drillGrad = ctx.createLinearGradient(0, bodyHeight/2, 0, bodyHeight/2 + drillLength);
        drillGrad.addColorStop(0, colors.drill);
        drillGrad.addColorStop(1, this.darkenColor(colors.drill, 30));
        
        ctx.fillStyle = drillGrad;
        
        if (skinId === 'lava') {
            // Лавовый - пламя вместо сверла
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(-15, bodyHeight/2);
            ctx.quadraticCurveTo(-20, bodyHeight/2 + 30, 0, bodyHeight/2 + 60);
            ctx.quadraticCurveTo(20, bodyHeight/2 + 30, 15, bodyHeight/2);
            ctx.fill();
            // Внутреннее пламя
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath();
            ctx.moveTo(-8, bodyHeight/2);
            ctx.quadraticCurveTo(-10, bodyHeight/2 + 20, 0, bodyHeight/2 + 40);
            ctx.quadraticCurveTo(10, bodyHeight/2 + 20, 8, bodyHeight/2);
            ctx.fill();
        } else if (skinId === 'diamond') {
            // Алмазный - кристалл
            ctx.fillStyle = colors.drill;
            ctx.beginPath();
            ctx.moveTo(0, bodyHeight/2 - 10);
            ctx.lineTo(18, bodyHeight/2 + 20);
            ctx.lineTo(0, bodyHeight/2 + 55);
            ctx.lineTo(-18, bodyHeight/2 + 20);
            ctx.closePath();
            ctx.fill();
            // Грани
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, bodyHeight/2 - 10);
            ctx.lineTo(0, bodyHeight/2 + 55);
            ctx.moveTo(-18, bodyHeight/2 + 20);
            ctx.lineTo(18, bodyHeight/2 + 20);
            ctx.stroke();
        } else {
            // Стандартное сверло
            ctx.beginPath();
            ctx.moveTo(-20, bodyHeight/2);
            ctx.lineTo(0, bodyHeight/2 + drillLength + 15);
            ctx.lineTo(20, bodyHeight/2);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = this.darkenColor(colors.drill, 50);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    renderBody(ctx, skinId, colors, bodyWidth, bodyHeight) {
        const bodyGrad = ctx.createLinearGradient(-bodyWidth/2, 0, bodyWidth/2, 0);
        bodyGrad.addColorStop(0, this.darkenColor(colors.body, 20));
        bodyGrad.addColorStop(0.3, colors.body);
        bodyGrad.addColorStop(0.7, colors.body);
        bodyGrad.addColorStop(1, this.darkenColor(colors.body, 20));
        
        ctx.fillStyle = bodyGrad;
        
        if (skinId === 'military') {
            // Военный - угловатый корпус
            ctx.beginPath();
            ctx.moveTo(-bodyWidth/2, -bodyHeight/2 + 10);
            ctx.lineTo(-bodyWidth/2 + 10, -bodyHeight/2);
            ctx.lineTo(bodyWidth/2 - 10, -bodyHeight/2);
            ctx.lineTo(bodyWidth/2, -bodyHeight/2 + 10);
            ctx.lineTo(bodyWidth/2, bodyHeight/2 - 10);
            ctx.lineTo(bodyWidth/2 - 10, bodyHeight/2);
            ctx.lineTo(-bodyWidth/2 + 10, bodyHeight/2);
            ctx.lineTo(-bodyWidth/2, bodyHeight/2 - 10);
            ctx.closePath();
            ctx.fill();
        } else {
            // Стандартный округлый
            ctx.beginPath();
            ctx.roundRect(-bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight, 12);
            ctx.fill();
        }
        
        ctx.strokeStyle = this.darkenColor(colors.body, 40);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    renderCabin(ctx, skinId, colors, bodyWidth, bodyHeight) {
        const cabinGrad = ctx.createLinearGradient(-bodyWidth/2, -bodyHeight/2, bodyWidth/2, -bodyHeight/2 + 50);
        cabinGrad.addColorStop(0, this.darkenColor(colors.cabin, 20));
        cabinGrad.addColorStop(0.5, colors.cabin);
        cabinGrad.addColorStop(1, this.darkenColor(colors.cabin, 20));
        
        ctx.fillStyle = cabinGrad;
        
        if (skinId === 'cyber') {
            // Киберпанк - треугольная кабина
            ctx.beginPath();
            ctx.moveTo(-bodyWidth/2, -bodyHeight/2 + 50);
            ctx.lineTo(0, -bodyHeight/2);
            ctx.lineTo(bodyWidth/2, -bodyHeight/2 + 50);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.roundRect(-bodyWidth/2, -bodyHeight/2, bodyWidth, 50, [12, 12, 0, 0]);
            ctx.fill();
        }
    }
    
    renderWindow(ctx, skinId, colors, bodyHeight) {
        const windowGlow = this.isDrilling ? 0.8 + 0.2 * Math.sin(Date.now() / 100) : 0.4;
        
        if (skinId === 'alien') {
            // Инопланетный - вертикальный глаз
            ctx.fillStyle = colors.window;
            ctx.globalAlpha = windowGlow;
            ctx.beginPath();
            ctx.ellipse(0, -bodyHeight/2 + 25, 8, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Зрачок
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(0, -bodyHeight/2 + 25, 3, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (skinId === 'cyber') {
            // Киберпанк - квадратный экран
            ctx.fillStyle = colors.window;
            ctx.globalAlpha = windowGlow;
            ctx.fillRect(-12, -bodyHeight/2 + 15, 24, 24);
            ctx.globalAlpha = 1;
        } else {
            // Стандартный круглый
            ctx.fillStyle = colors.window;
            ctx.globalAlpha = windowGlow;
            ctx.beginPath();
            ctx.arc(0, -bodyHeight/2 + 25, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.strokeStyle = '#1a202c';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    renderSkinDetails(ctx, skinId, colors, bodyWidth, bodyHeight) {
        switch(skinId) {
            case 'golden':
                // Корона сверху
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(-20, -bodyHeight/2);
                ctx.lineTo(-15, -bodyHeight/2 - 15);
                ctx.lineTo(-5, -bodyHeight/2 - 8);
                ctx.lineTo(0, -bodyHeight/2 - 20);
                ctx.lineTo(5, -bodyHeight/2 - 8);
                ctx.lineTo(15, -bodyHeight/2 - 15);
                ctx.lineTo(20, -bodyHeight/2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
                
            case 'cyber':
                // Провода-антенны
                ctx.strokeStyle = colors.window;
                ctx.lineWidth = 2;
                // Левая антенна
                ctx.beginPath();
                ctx.moveTo(-25, -bodyHeight/2 + 20);
                ctx.quadraticCurveTo(-40, -bodyHeight/2 - 10, -35, -bodyHeight/2 - 25);
                ctx.stroke();
                // Правая антенна
                ctx.beginPath();
                ctx.moveTo(25, -bodyHeight/2 + 20);
                ctx.quadraticCurveTo(40, -bodyHeight/2 - 10, 35, -bodyHeight/2 - 25);
                ctx.stroke();
                // Мигающие огоньки на проводах
                if (Math.sin(Date.now() / 200) > 0) {
                    ctx.fillStyle = '#ff00ff';
                    ctx.beginPath();
                    ctx.arc(-35, -bodyHeight/2 - 25, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#00ffff';
                    ctx.beginPath();
                    ctx.arc(35, -bodyHeight/2 - 25, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'military':
                // Бронепластины по бокам
                ctx.fillStyle = this.darkenColor(colors.body, 20);
                ctx.fillRect(-bodyWidth/2 - 8, -20, 8, 40);
                ctx.fillRect(bodyWidth/2, -20, 8, 40);
                // Заклёпки
                ctx.fillStyle = '#4a5568';
                for (let y = -15; y <= 15; y += 10) {
                    ctx.beginPath();
                    ctx.arc(-bodyWidth/2 - 4, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(bodyWidth/2 + 4, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'diamond':
                // Кристаллы на боках
                ctx.fillStyle = colors.drill;
                // Левый кристалл
                ctx.beginPath();
                ctx.moveTo(-bodyWidth/2 - 5, 0);
                ctx.lineTo(-bodyWidth/2 - 15, -10);
                ctx.lineTo(-bodyWidth/2 - 15, 10);
                ctx.closePath();
                ctx.fill();
                // Правый кристалл
                ctx.beginPath();
                ctx.moveTo(bodyWidth/2 + 5, 0);
                ctx.lineTo(bodyWidth/2 + 15, -10);
                ctx.lineTo(bodyWidth/2 + 15, 10);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'pirate':
                // Повязка на глаз
                ctx.fillStyle = '#1a202c';
                ctx.fillRect(-18, -bodyHeight/2 + 18, 36, 14);
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(0, -bodyHeight/2 + 25, 10, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                // Стандартные детали - полосы и болты
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(-bodyWidth/2 + 5, -10, bodyWidth - 10, 3);
                ctx.fillRect(-bodyWidth/2 + 5, 20, bodyWidth - 10, 3);
                
                ctx.fillStyle = this.darkenColor(colors.body, 30);
                const boltPositions = [
                    {x: -25, y: -40}, {x: 25, y: -40},
                    {x: -25, y: 40}, {x: 25, y: 40}
                ];
                for (const bolt of boltPositions) {
                    ctx.beginPath();
                    ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
        }
    }
    
    // Вспомогательный метод для затемнения цвета
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Вспомогательный метод для рисования закругленного прямоугольника
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    renderDriftEffect(ctx, screenY) {
        const intensity = (this.game.driftSystem.multiplier - 1.5) / 1.5;

        ctx.save();
        ctx.globalAlpha = intensity * 0.5;
        ctx.fillStyle = '#ff6b6b';

        for (let i = 0; i < 5; i++) {
            const offset = (Date.now() / 100 + i * 20) % 100;
            ctx.beginPath();
            ctx.arc(
                this.x + (Math.random() - 0.5) * 80,
                screenY + this.height/2 + offset,
                10 + Math.random() * 20,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }
}
