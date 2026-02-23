class Drill {
    constructor(game) {
        this.game = game;
        this.x = game.width / 2;
        
        // Оптимизированная начальная позиция: бур должен быть сразу над первым слоем
        // Фиксированные размеры - масштабирование делает Game через canvas transform
        this.y = 200;
        this.height = 200;
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
        
        // === СВОЙСТВА ДЛЯ УЛУЧШЕНИЙ ===
        // Критический удар
        this.critChance = 0;
        
        // Супер удар - каждый 10й клик = x2 урон
        this.superStrikeEnabled = false;
        this.clickCounter = 0;

        // Состояние
        this.isDrilling = false;
        this.rotation = 0;
        this.targetY = this.y;
        
        // Эффект дрожания при бурении
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeTime = 0;
        
        // === АНИМАЦИЯ СВЕРЛА ===
        this.drillBitRotation = 0;      // Угол вращения сверла
        this.drillBitSpeed = 15;        // Скорость вращения (радиан/сек)
        this.drillGlowPhase = 0;        // Фаза для пульсации свечения

        // Визуал
        this.color = '#888';
        this.tipColor = '#ff6b6b';
        
        // Логирование для отладки
        console.log('Бур создан:', { 
            x: this.x, 
            y: this.y, 
            width: this.width, 
            height: this.height
        });
    }
    
    /**
     * Обновить позицию при изменении размера экрана
     */
    onResize() {
        // Обновляем X по центру
        this.x = this.game.width / 2;
    }

    update(dt) {
        // Проверяем ввод (клик)
        const justClicked = this.game.input.isPressed && !this.isDrilling;
        this.isDrilling = this.game.input.isPressed;

        // === АНИМАЦИЯ СВЕРЛА (постоянное вращение ПРОТИВ часовой стрелки) ===
        // Ускоряем вращение при клике, замедляем когда не кликают
        const targetSpeed = this.isDrilling ? 25 : 8;
        this.drillBitSpeed += (targetSpeed - this.drillBitSpeed) * 0.1;
        // Минус для вращения ПРОТИВ часовой стрелки (как настоящее сверло)
        this.drillBitRotation -= this.drillBitSpeed * dt;
        
        // Обновляем фазу свечения
        this.drillGlowPhase += dt * 3;

        // Обновляем эффект дрожания
        if (this.isDrilling) {
            // Интенсивность дрожания
            this.shakeIntensity = Math.min(0.5, 2.0);
            
            // Увеличиваем время для анимации дрожания
            this.shakeTime += dt * 20;
            
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
            
            // === СУПЕР УДАР: каждый 10й клик = x2 урон ===
            let isSuperStrike = false;
            if (this.superStrikeEnabled && this.clickCounter % 10 === 0) {
                isSuperStrike = true;
            }
            
            // === КРИТИЧЕСКИЙ УДАР: шанс пробить слой мгновенно ===
            const isCrit = Math.random() < this.critChance;
            
            // Импульс от клика
            const clickPower = this.speed * 0.05;
            this.targetY += clickPower;

            // Вращение
            this.rotation += 0.5;

            // Проверка столкновения со слоями
            this.checkCollisions(dt, isCrit, isSuperStrike);
            
            // Эффект удара (с особым для крита/суперудара)
            this.onClickEffect(isCrit, isSuperStrike);
            
            // Обновляем визуальный эффект клика для крита/супера
            if (isCrit || isSuperStrike) {
                this.game.input.triggerCritEffect(isCrit, isSuperStrike);
            }
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

    checkCollisions(dt, isCrit = false, isSuperStrike = false) {
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
                // Супер удар = x2 урон
                let damage = this.power;
                if (isSuperStrike) {
                    damage *= 2;
                }
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
        const finalReward = Math.floor(reward);
        this.game.economy.addCoins(finalReward);
        
        // Всплывающий текст с наградой
        if (this.game.floatingText) {
            this.game.floatingText.addCoins(layer.x, layer.y, finalReward);
        }
        
        // Шанс руды (с учетом oreChance)
        if (Math.random() < this.game.economy.oreChance) {
            this.game.economy.addOre(1);
            if (this.game.floatingText) {
                this.game.floatingText.addOre(layer.x, layer.y - 30, 1);
            }
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
            // Всплывающий текст для крита
            if (this.game.floatingText) {
                this.game.floatingText.addCrit(this.x, this.y - 50);
            }
        } else if (isSuperStrike) {
            particleCount = 8;
            sparkCount = 8;
            sparkColor = '#00ffff'; // Голубые искры для суперудара
            // Всплывающий текст для супер-удара
            if (this.game.floatingText) {
                this.game.floatingText.addSuper(this.x, this.y - 50);
            }
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
        let skinId = 'default';
        let colors = {
            body: '#718096',
            cabin: '#2d3748',
            drill: '#a0aec0',
            window: '#4299e1'
        };
        
        try {
            if (this.game.skins && this.game.skins.getColors) {
                skinId = this.game.skins.currentSkin || 'default';
                colors = this.game.skins.getColors();
            }
        } catch (e) {
            console.warn('Ошибка получения скина:', e);
        }
        
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
        
        // 6. ТЕНЬ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, bodyHeight/2 + 35, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // === ОТДЕЛЬНЫЕ ЧАСТИ БУРА ===
    
    renderDrillBit(ctx, skinId, colors, bodyHeight, drillLength) {
        ctx.save();
        
        // Перемещаемся к точке крепления сверла
        ctx.translate(0, bodyHeight/2 + 10);
        
        if (skinId === 'lava') {
            // Лавовый - пламя вместо сверла (пульсирует)
            const pulse = 1 + Math.sin(this.drillGlowPhase) * 0.1;
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(-15 * pulse, 0);
            ctx.quadraticCurveTo(-20 * pulse, 30, 0, 60 * pulse);
            ctx.quadraticCurveTo(20 * pulse, 30, 15 * pulse, 0);
            ctx.fill();
            // Внутреннее пламя
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath();
            ctx.moveTo(-8 * pulse, 0);
            ctx.quadraticCurveTo(-10 * pulse, 20, 0, 40 * pulse);
            ctx.quadraticCurveTo(10 * pulse, 20, 8 * pulse, 0);
            ctx.fill();
        } else if (skinId === 'diamond') {
            // Алмазный - кристалл с 3D вращением
            this.renderRotatingDiamond(ctx, colors);
        } else {
            // === СТАНДАРТНОЕ СВЕРЛО С 3D ВРАЩЕНИЕМ ===
            this.renderRotatingDrillBit(ctx, colors, drillLength);
        }
        
        ctx.restore();
    }
    
    /**
     * Рендер сверла с имитацией вращения (без реального поворота)
     */
    renderRotatingDrillBit(ctx, colors, drillLength) {
        const bitLength = drillLength + 15;
        
        // Фаза для анимации "вращения"
        const phase = this.drillBitRotation % (Math.PI * 2);
        const sinPhase = Math.sin(phase);
        
        // === ОСНОВНОЕ ТЕЛО СВЕРЛА (неподвижный конус) ===
        ctx.fillStyle = colors.drill;
        ctx.beginPath();
        ctx.moveTo(-16, -5);
        ctx.lineTo(0, bitLength);
        ctx.lineTo(16, -5);
        ctx.closePath();
        ctx.fill();
        
        // Контур
        ctx.strokeStyle = this.darkenColor(colors.drill, 40);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // === АНИМАЦИЯ ВРАЩЕНИЯ - движущиеся линии ===
        const lineCount = 4;
        const lineOffset = (phase / (Math.PI * 2)) * (bitLength / lineCount);
        
        ctx.strokeStyle = this.darkenColor(colors.drill, 30);
        ctx.lineWidth = 2;
        
        for (let i = 0; i < lineCount; i++) {
            const y = 10 + ((i * bitLength / lineCount + lineOffset) % bitLength) * 0.8;
            const width = 12 * (1 - y / bitLength); // Узкая к основанию
            
            // Левая линия
            ctx.beginPath();
            ctx.moveTo(-width * 0.7, y);
            ctx.lineTo(-width * 0.3, y + 8);
            ctx.stroke();
            
            // Правая линия
            ctx.beginPath();
            ctx.moveTo(width * 0.7, y);
            ctx.lineTo(width * 0.3, y + 8);
            ctx.stroke();
        }
        
        // === Центральная линия (статичная) ===
        ctx.strokeStyle = this.darkenColor(colors.drill, 50);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, bitLength - 3);
        ctx.stroke();
        
        // === БЛИК (движется вверх-вниз) ===
        const highlightY = 15 + Math.abs(sinPhase) * (bitLength - 25);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.abs(sinPhase) * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(-4, highlightY, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // === ОСТРИЕ (мигает при вращении) ===
        const tipGlow = 0.3 + Math.abs(sinPhase) * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${tipGlow})`;
        ctx.beginPath();
        ctx.moveTo(-3, bitLength - 6);
        ctx.lineTo(0, bitLength);
        ctx.lineTo(3, bitLength - 6);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Рендер алмазного кристалла с имитацией вращения
     */
    renderRotatingDiamond(ctx, colors) {
        const phase = this.drillBitRotation % (Math.PI * 2);
        const sinPhase = Math.sin(phase);
        
        // Основной кристалл (неподвижный)
        ctx.fillStyle = colors.drill;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(18, 20);
        ctx.lineTo(0, 55);
        ctx.lineTo(-18, 20);
        ctx.closePath();
        ctx.fill();
        
        // Грани
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 55);
        ctx.moveTo(-18, 20);
        ctx.lineTo(18, 20);
        ctx.stroke();
        
        // Имитация вращения - блик движется
        const highlightY = 5 + Math.abs(sinPhase) * 15;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(sinPhase) * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(0, highlightY);
        ctx.lineTo(6, highlightY + 12);
        ctx.lineTo(0, highlightY + 18);
        ctx.lineTo(-6, highlightY + 12);
        ctx.closePath();
        ctx.fill();
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
        // Улучшенное пульсирующее свечение иллюминатора
        const baseGlow = this.isDrilling ? 0.9 : 0.5;
        const pulseGlow = Math.sin(this.drillGlowPhase * 1.5) * 0.15;
        const windowGlow = Math.max(0.3, Math.min(1, baseGlow + pulseGlow));
        
        // Свечение вокруг иллюминатора
        const glowRadius = 20 + Math.sin(this.drillGlowPhase * 2) * 3;
        const glowGradient = ctx.createRadialGradient(
            0, -bodyHeight/2 + 25, 5,
            0, -bodyHeight/2 + 25, glowRadius
        );
        // Конвертируем hex в rgba для градиента
        const r = parseInt(colors.window.slice(1, 3), 16);
        const g = parseInt(colors.window.slice(3, 5), 16);
        const b = parseInt(colors.window.slice(5, 7), 16);
        glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${windowGlow})`);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(0, -bodyHeight/2 + 25, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
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
        // Метод оставлен для совместимости, но эффект дрифта удалён
        return;
    }
}
