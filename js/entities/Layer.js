class Layer {
    constructor(game, index, previousLayerY = null) {
        this.game = game;
        this.index = index;

        // Позиция
        this.width = game.width - 40;
        this.height = 80;
        this.x = game.width / 2;
        
        // ИСПРАВЛЕНО: Правильное позиционирование слоев относительно бура
        // Для первого слоя: размещаем его сразу под буром
        const initialDrillY = game.drill ? game.drill.y : 200;
        const drillHeight = game.drill ? game.drill.height : 200;
        if (previousLayerY !== null) {
            this.y = previousLayerY + this.height;
        } else {
            // Первый слой размещаем так, чтобы бур касался его верхней грани
            // Учитываем: y бура - половина высоты бура + небольшой зазор + половина высоты слоя
            this.y = initialDrillY + drillHeight/2 + this.height/2 + 20;
        }

        // Характеристики - бесконечная прогрессия сложности
        const depthProgress = Math.floor(index / 10) * 0.1;
        this.hardness = 1 + depthProgress;
        this.maxHealth = 10 * this.hardness;
        this.health = this.maxHealth;
        this.reward = Math.floor(5 * this.hardness);

        // Визуал
        this.color = this.generateColor();
        this.pattern = this.generatePattern();
        this.isDestroyed = false;
        
        // Для эффекта разрушения
        this.destroyProgress = 0;
        this.destroyParticles = [];
    }

    generateColor() {
        // Цвета по глубине (10 уровней, потом повтор)
        const depthTier = Math.floor(this.index / 10) % 10;
        
        // Палитры для каждого уровня глубины
        const palettes = [
            // Уровень 0-9: Земля/Глина
            ['#8B4513', '#A0522D', '#CD853F', '#DEB887'],
            // Уровень 10-19: Песок/Песчаник
            ['#D2691E', '#F4A460', '#DAA520', '#B8860B'],
            // Уровень 20-29: Известняк/Камень
            ['#808080', '#A9A9A9', '#C0C0C0', '#D3D3D3'],
            // Уровень 30-39: Уголь/Сланец
            ['#2F4F4F', '#36454F', '#4A646C', '#5F7275'],
            // Уровень 40-49: Медная руда
            ['#B87333', '#CD7F32', '#D4A574', '#E6B89C'],
            // Уровень 50-59: Железная руда
            ['#8B4513', '#A0522D', '#B22222', '#CD5C5C'],
            // Уровень 60-69: Серебро/Свинец
            ['#708090', '#778899', '#B0C4DE', '#C0C0C0'],
            // Уровень 70-79: Золото
            ['#FFD700', '#DAA520', '#B8860B', '#F0E68C'],
            // Уровень 80-89: Рубин/Красный камень
            ['#8B0000', '#A52A2A', '#DC143C', '#B22222'],
            // Уровень 90-99: Аметист/Кристалл
            ['#4B0082', '#663399', '#8A2BE2', '#9370DB']
        ];
        
        const palette = palettes[depthTier];
        return palette[this.index % palette.length];
    }

    generatePattern() {
        // Процедурная генерация текстуры
        return {
            cracks: Math.random() > 0.7,
            crystals: Math.random() > 0.9,
            fossils: Math.random() > 0.95
        };
    }

    takeDamage(damage, dt) {
        if (this.isDestroyed) return false;

        this.health -= damage;

        // Эффект повреждения (частицы при ударе)
        const particleCount = Math.min(Math.floor(damage * 2), 10);
        for (let i = 0; i < particleCount; i++) {
            const particleType = Math.random() > 0.7 ? 'debris' : 'chip';
            const size = particleType === 'debris' ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
            
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * this.width,
                this.y - this.height / 2 + Math.random() * this.height,
                particleType,
                this.color,
                size
            );
        }

        // Эффект искр при сильном ударе
        if (damage > 5 && Math.random() < 0.3) {
            for (let i = 0; i < 3; i++) {
                this.game.createParticle(
                    this.x + (Math.random() - 0.5) * 20,
                    this.y - this.height / 2,
                    'spark',
                    '#ffaa00',
                    2 + Math.random() * 2
                );
            }
        }

        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    destroy() {
        this.isDestroyed = true;
        this.destroyProgress = 0;
        
        // Создаем осколки для эффекта разрушения
        const fragmentCount = 15 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < fragmentCount; i++) {
            const size = 5 + Math.random() * 10;
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const rotationSpeed = (Math.random() - 0.5) * 10;
            
            this.destroyParticles.push({
                x: this.x + (Math.random() - 0.5) * this.width,
                y: this.y + (Math.random() - 0.5) * this.height,
                size: size,
                color: this.color,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: rotationSpeed,
                life: 1.0,
                decay: 0.5 + Math.random() * 0.5
            });
        }
        
        // Эффект пыли
        for (let i = 0; i < 20; i++) {
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * this.width,
                this.y + (Math.random() - 0.5) * this.height,
                'dust',
                this.color,
                3 + Math.random() * 5
            );
        }
        
        // Эффект взрыва
        for (let i = 0; i < 8; i++) {
            this.game.createParticle(
                this.x,
                this.y,
                'explosion',
                '#ff8800',
                8 + Math.random() * 12
            );
        }
    }

    update(dt) {
        // Анимация разрушения
        if (this.isDestroyed && this.destroyParticles.length > 0) {
            this.destroyProgress += dt;
            
            // Обновляем осколки
            for (let i = this.destroyParticles.length - 1; i >= 0; i--) {
                const particle = this.destroyParticles[i];
                
                particle.x += particle.velocityX * dt;
                particle.y += particle.velocityY * dt;
                particle.rotation += particle.rotationSpeed * dt;
                particle.life -= particle.decay * dt;
                
                // Гравитация
                particle.velocityY += 100 * dt;
                
                // Удаляем мертвые частицы
                if (particle.life <= 0) {
                    this.destroyParticles.splice(i, 1);
                }
            }
        }
    }

    render(ctx, camera) {
        if (this.isDestroyed) return;

        const screenY = this.y - camera.y;

        // Оптимизация: пропускаем рендеринг если слой далеко за экраном
        if (screenY < -200 || screenY > ctx.canvas.height + 200) return;

        ctx.save();

        // Основной цвет
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Текстура
        this.renderTexture(ctx, screenY);

        // Полоска здоровья (всегда показываем)
        const healthPercent = this.health / this.maxHealth;
        const barWidth = this.width - 20;
        const barHeight = 10;
        const barX = this.x - this.width / 2 + 10;
        const barY = screenY - this.height / 2 + 10;
        
        // Фон полоски
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Заполнение полоски
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.25 ? '#FFC107' : '#f44336');
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Рамка полоски
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // СЧЁТЧИК КЛИКОВ - сколько осталось
        const drill = this.game.drill;
        const damagePerClick = drill ? (drill.power * this.game.driftSystem.multiplier) : 1;
        const clicksLeft = Math.ceil(this.health / damagePerClick);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Тень для текста
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(clicksLeft.toString(), this.x, screenY);
        
        // Сброс тени
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
        
        // Рендерим осколки разрушения
        if (this.isDestroyed && this.destroyParticles.length > 0) {
            this.renderFragments(ctx, camera);
        }
    }
    
    renderFragments(ctx, camera) {
        const screenY = this.y - camera.y;
        
        ctx.save();
        
        for (const fragment of this.destroyParticles) {
            const fragmentScreenY = fragment.y - camera.y;
            const alpha = Math.max(0, fragment.life);
            
            ctx.save();
            ctx.translate(fragment.x, fragmentScreenY);
            ctx.rotate(fragment.rotation);
            ctx.globalAlpha = alpha;
            
            // Осколок
            ctx.fillStyle = fragment.color;
            ctx.fillRect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
            
            // Контур осколка
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
            
            // Внутренняя деталь
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(-fragment.size/4, -fragment.size/4, fragment.size/2, fragment.size/2);
            
            ctx.restore();
        }
        
        ctx.restore();
    }

    renderTexture(ctx, screenY) {
        const left = this.x - this.width / 2;
        const top = screenY - this.height / 2;

        // Текстура - точки/зерна (не буквы!)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 20; i++) {
            const px = left + 20 + (i * 47) % (this.width - 40);
            const py = top + 15 + (i * 23) % (this.height - 30);
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Граница слоя
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, this.width, this.height);
        
        // Внутренняя рамка для объёма
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 3, top + 3, this.width - 6, this.height - 6);
    }
}