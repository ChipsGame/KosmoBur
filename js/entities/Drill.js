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
        const drillWidth = 60;
        // Адаптивная высота для рендеринга (пропорциональна реальной высоте бура)
        const drillHeight = this.height === 160 ? 130 : 160; // Уменьшаем отрисовку для маленького бура

        ctx.save();
        // Применяем эффект дрожания при бурении
        const shakeX = this.shakeOffsetX;
        const shakeY = this.shakeOffsetY;
        ctx.translate(this.x + shakeX, screenY + shakeY);
        // ctx.rotate(this.rotation); // Убрали вращение всего бура

        // === ОСНОВНОЙ КОРПУС БУРА (Металлический цилиндр) ===
        // Градиент для металлического эффекта
        const bodyGradient = ctx.createLinearGradient(-drillWidth/2, -drillHeight/2, drillWidth/2, drillHeight/2);
        bodyGradient.addColorStop(0, '#707070');
        bodyGradient.addColorStop(0.2, '#909090');
        bodyGradient.addColorStop(0.4, '#b0b0b0');
        bodyGradient.addColorStop(0.6, '#d0d0d0');
        bodyGradient.addColorStop(0.8, '#b0b0b0');
        bodyGradient.addColorStop(1, '#808080');

        // Тело бура с закругленными краями
        ctx.fillStyle = bodyGradient;
        this.drawRoundedRect(ctx, -drillWidth/2, -drillHeight/2, drillWidth, drillHeight, 10);
        ctx.fill();
        
        // Текстура металла (штриховка)
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.3)';
        ctx.lineWidth = 1;
        
        // Горизонтальные линии
        for (let y = -drillHeight/2 + 10; y < drillHeight/2; y += 8) {
            ctx.beginPath();
            ctx.moveTo(-drillWidth/2 + 5, y);
            ctx.lineTo(drillWidth/2 - 5, y);
            ctx.stroke();
        }
        
        // Вертикальные линии
        for (let x = -drillWidth/2 + 10; x < drillWidth/2; x += 8) {
            ctx.beginPath();
            ctx.moveTo(x, -drillHeight/2 + 5);
            ctx.lineTo(x, drillHeight/2 - 5);
            ctx.stroke();
        }
        
        // Углубления под болты
        ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
        const boltHoles = [
            {x: -drillWidth/2 + 8, y: -drillHeight/2 + 8},
            {x: drillWidth/2 - 8, y: -drillHeight/2 + 8},
            {x: -drillWidth/2 + 8, y: drillHeight/2 - 8},
            {x: drillWidth/2 - 8, y: drillHeight/2 - 8}
        ];
        
        for (const hole of boltHoles) {
            ctx.beginPath();
            ctx.arc(hole.x, hole.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Внутреннее отверстие
            ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
            ctx.beginPath();
            ctx.arc(hole.x, hole.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
        }

        // === СПИРАЛЬНЫЕ КАНАВКИ (вращающийся эффект) ===
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 4;
        const spiralCount = 8;
        const spiralOffset = this.rotation * 2; // Смещение при вращении
        
        for (let i = 0; i < spiralCount; i++) {
            const yPos = -drillHeight/2 + (i * drillHeight / spiralCount) + (spiralOffset % (drillHeight / spiralCount));
            
            ctx.beginPath();
            ctx.moveTo(-drillWidth/2 + 5, yPos);
            ctx.lineTo(drillWidth/2 - 5, yPos);
            ctx.stroke();
        }

        // === РЕЛЬЕФНЫЕ ПАНЕЛИ НА КОРПУСЕ ===
        ctx.save();
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        
        // Вертикальные панели
        const panelWidth = 15;
        const panelHeight = 40;
        const panelSpacing = 30;
        
        for (let i = -1; i <= 1; i++) {
            const panelX = i * panelSpacing;
            const panelY = -20;
            
            // Тень панели
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(panelX - panelWidth/2 + 1, panelY - panelHeight/2 + 1, panelWidth, panelHeight);
            
            // Основная панель
            const panelGrad = ctx.createLinearGradient(panelX - panelWidth/2, panelY - panelHeight/2, panelX + panelWidth/2, panelY + panelHeight/2);
            panelGrad.addColorStop(0, '#707070');
            panelGrad.addColorStop(0.5, '#808080');
            panelGrad.addColorStop(1, '#606060');
            
            ctx.fillStyle = panelGrad;
            ctx.fillRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight);
            
            // Контур панели
            ctx.strokeRect(panelX - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight);
            
            // Болты на панелях
            ctx.fillStyle = '#404040';
            const boltPositions = [
                {x: panelX - 4, y: panelY - 15},
                {x: panelX + 4, y: panelY - 15},
                {x: panelX - 4, y: panelY + 15},
                {x: panelX + 4, y: panelY + 15}
            ];
            
            for (const bolt of boltPositions) {
                ctx.beginPath();
                ctx.arc(bolt.x, bolt.y, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Крестообразный шлиц
                ctx.strokeStyle = '#202020';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bolt.x - 1, bolt.y);
                ctx.lineTo(bolt.x + 1, bolt.y);
                ctx.moveTo(bolt.x, bolt.y - 1);
                ctx.lineTo(bolt.x, bolt.y + 1);
                ctx.stroke();
            }
        }
        
        ctx.restore();

        // === КОЛЬЦА УСИЛЕНИЯ ===
        ctx.fillStyle = '#808080';
        // Адаптивные позиции колец в зависимости от размера бура
        const ringSpacing = drillHeight / 4;
        const ringPositions = [
            -drillHeight/2 + ringSpacing * 0.5,
            -drillHeight/2 + ringSpacing * 1.5,
            -drillHeight/2 + ringSpacing * 2.5,
            -drillHeight/2 + ringSpacing * 3.5
        ];
        for (const yPos of ringPositions) {
            ctx.beginPath();
            ctx.ellipse(0, yPos, drillWidth/2 + 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Болты на кольцах
            const boltCount = 6;
            for (let i = 0; i < boltCount; i++) {
                const angle = (i * Math.PI * 2) / boltCount;
                const boltX = Math.cos(angle) * (drillWidth/2 + 3);
                const boltY = yPos + Math.sin(angle) * 5;
                
                ctx.fillStyle = '#505050';
                ctx.beginPath();
                ctx.arc(boltX, boltY, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Крестообразный шлиц
                ctx.strokeStyle = '#303030';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(boltX - 2, boltY);
                ctx.lineTo(boltX + 2, boltY);
                ctx.moveTo(boltX, boltY - 2);
                ctx.lineTo(boltX, boltY + 2);
                ctx.stroke();
            }
        }



        // === ВНУТРЕННИЙ МЕХАНИЗМ (вращающаяся часть) ===
        ctx.save();
        const innerRotation = this.rotation * 3; // Вращается быстрее основного бура
        ctx.rotate(innerRotation);
        
        // Шестерни
        ctx.fillStyle = '#404040';
        // Адаптивные позиции шестерен
        const gearSpacing = drillHeight / 4;
        for (let i = 0; i < 3; i++) {
            const gearY = -drillHeight/2 + gearSpacing * (i + 1);
            ctx.beginPath();
            ctx.ellipse(0, gearY, 15, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Зубья шестерни
            ctx.strokeStyle = '#202020';
            ctx.lineWidth = 2;
            const toothCount = 8;
            for (let j = 0; j < toothCount; j++) {
                const angle = (j * Math.PI * 2) / toothCount;
                const startX = Math.cos(angle) * 15;
                const startY = gearY + Math.sin(angle) * 15;
                const endX = Math.cos(angle) * 22;
                const endY = gearY + Math.sin(angle) * 22;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        ctx.restore();

        // === НАКОНЕЧНИК БУРА (с температурным свечением) ===
        const tipHeat = this.temperature / this.maxTemperature;
        // Позиция наконечника - начинается от нижней границы корпуса и выходит ВНИЗ
        const tipTop = drillHeight/2;  // Начинаем от нижнего края корпуса
        const tipBottom = drillHeight/2 + 50;  // Длина наконечника 50px вниз
        const tipGradient = ctx.createLinearGradient(0, tipTop, 0, tipBottom);
        
        if (tipHeat > 0.7) {
            // Горячий наконечник - красное свечение
            tipGradient.addColorStop(0, '#ff3300');
            tipGradient.addColorStop(0.5, '#ff6600');
            tipGradient.addColorStop(1, '#ffaa00');
        } else {
            // Холодный наконечник - металлический
            tipGradient.addColorStop(0, '#ff6b6b');
            tipGradient.addColorStop(0.3, '#ff8e8e');
            tipGradient.addColorStop(0.7, '#d95454');
            tipGradient.addColorStop(1, '#b34040');
        }
        
        // Основная часть наконечника (треугольник вниз)
        ctx.fillStyle = tipGradient;
        ctx.beginPath();
        ctx.moveTo(-25, tipTop);      // Левый верхний угол (у корпуса)
        ctx.lineTo(0, tipBottom);     // Нижняя точка (остриё)
        ctx.lineTo(25, tipTop);       // Правый верхний угол (у корпуса)
        ctx.closePath();
        ctx.fill();
        
        // Фаска на наконечнике
        ctx.strokeStyle = tipHeat > 0.7 ? '#ffffff' : '#d0d0d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, tipTop + 8);
        ctx.lineTo(0, tipBottom - 8);
        ctx.lineTo(20, tipTop + 8);
        ctx.stroke();

        // === СВЕТОВЫЕ БЛИКИ И ТЕНИ ДЛЯ ОБЪЕМА ===
        // Верхний блик
        const highlightGradient = ctx.createLinearGradient(-drillWidth/2, -drillHeight/2, drillWidth/2, -drillHeight/2);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.moveTo(-drillWidth/2, -drillHeight/2);
        ctx.lineTo(drillWidth/2, -drillHeight/2);
        ctx.lineTo(drillWidth/2 - 10, -drillHeight/2 + 20);
        ctx.lineTo(-drillWidth/2 + 10, -drillHeight/2 + 20);
        ctx.closePath();
        ctx.fill();
        
        // Боковая тень
        const shadowGradient = ctx.createLinearGradient(drillWidth/2, -drillHeight/2, drillWidth/2, drillHeight/2);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.moveTo(drillWidth/2, -drillHeight/2);
        ctx.lineTo(drillWidth/2, drillHeight/2);
        ctx.lineTo(drillWidth/2 - 15, drillHeight/2 - 20);
        ctx.lineTo(drillWidth/2 - 15, -drillHeight/2 + 20);
        ctx.closePath();
        ctx.fill();

        // === ИНДИКАТОР ПЕРЕГРЕВА (оставляем только свечение) ===
        if (this.temperature > 80) {
            const warningAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 200); // Пульсация
            
            // Тепловое свечение (оставляем только это)
            const heatGlowCenterY = drillHeight/2 - 20;
            const heatGlow = ctx.createRadialGradient(0, heatGlowCenterY, 10, 0, heatGlowCenterY, 50);
            heatGlow.addColorStop(0, `rgba(255, 100, 0, ${warningAlpha * 0.5})`);
            heatGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = heatGlow;
            ctx.beginPath();
            ctx.arc(0, heatGlowCenterY, 50, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Эффект дрифта
        if (this.game.driftSystem.multiplier > 1.5) {
            this.renderDriftEffect(ctx, screenY);
        }
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
