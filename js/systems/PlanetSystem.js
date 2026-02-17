class PlanetSystem {
    constructor(game) {
        this.game = game;

        this.planets = [
            {
                id: 'earth',
                name: 'Земля',
                emoji: '🌍',
                layers: 500,
                difficulty: 1.0,
                description: 'Базовая планета',
                special: null
            },
            {
                id: 'moon',
                name: 'Луна',
                emoji: '🌙',
                layers: 1000,
                difficulty: 1.5,
                description: 'Низкая гравитация = быстрый дрифт',
                special: 'low_gravity'
            },
            {
                id: 'mars',
                name: 'Марс',
                emoji: '🔴',
                layers: 1500,
                difficulty: 2.2,
                description: 'Пыльные бури замедляют охлаждение',
                special: 'dust_storms'
            },
            {
                id: 'europa',
                name: 'Европа',
                emoji: '❄️',
                layers: 2000,
                difficulty: 3.0,
                description: 'Ледяная корка требует нагрева',
                special: 'ice_crust'
            }
        ];

        this.currentPlanetIndex = 0;
        this.currentPlanet = this.planets[0].id;
    }

    get currentPlanetData() {
        return this.planets[this.currentPlanetIndex];
    }

    getDifficultyMultiplier() {
        return this.currentPlanetData.difficulty;
    }

    nextPlanet() {
        this.currentPlanetIndex = (this.currentPlanetIndex + 1) % this.planets.length;
        this.currentPlanet = this.planets[this.currentPlanetIndex].id;

        // Сброс части прокачки
        this.game.drill.y = 200;
        this.game.drill.targetY = 200;
        this.game.drill.depth = 0;
        this.game.camera.y = 0;
        this.game.layers = [];
        this.game.generateInitialLayers();

        // Применяем особенности планеты
        this.applyPlanetSpecial();
    }

    applyPlanetSpecial() {
        const special = this.currentPlanetData.special;

        switch(special) {
            case 'low_gravity':
                this.game.driftSystem.decayRate = 1; // Медленнее тратится
                break;
            case 'dust_storms':
                this.game.drill.maxTemperature = 80; // Быстрее перегрев
                break;
            case 'ice_crust':
                this.game.layers.forEach(l => l.hardness *= 1.5);
                break;
            default:
                this.game.driftSystem.decayRate = 2;
                this.game.drill.maxTemperature = 100;
        }
    }

    renderBackground(ctx) {
        // Canvas прозрачный - фон рисуется в CSS #game-container
        // Здесь только динамические элементы если нужны
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const time = Date.now() / 1000;
        
        // Очищаем canvas (делаем прозрачным)
        ctx.clearRect(0, 0, width, height);
        
        // Рисуем только динамические звёзды поверх общего фона
        this.renderStars(ctx, width, height, time);
    }

    renderNebula(ctx, width, height, time) {
        // Фиолетовая туманность сверху слева
        const nebula1 = ctx.createRadialGradient(
            width * 0.2 + Math.sin(time * 0.3) * 30, 
            height * 0.2 + Math.cos(time * 0.2) * 20, 
            0,
            width * 0.2, 
            height * 0.2, 
            width * 0.5
        );
        nebula1.addColorStop(0, 'rgba(120, 60, 180, 0.25)');
        nebula1.addColorStop(0.4, 'rgba(80, 40, 120, 0.12)');
        nebula1.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nebula1;
        ctx.fillRect(0, 0, width, height);

        // Голубая туманность справа
        const nebula2 = ctx.createRadialGradient(
            width * 0.85 + Math.cos(time * 0.25) * 25, 
            height * 0.3 + Math.sin(time * 0.35) * 15, 
            0,
            width * 0.85, 
            height * 0.3, 
            width * 0.4
        );
        nebula2.addColorStop(0, 'rgba(60, 120, 180, 0.2)');
        nebula2.addColorStop(0.4, 'rgba(40, 80, 120, 0.1)');
        nebula2.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nebula2;
        ctx.fillRect(0, 0, width, height);

        // Розовая туманность снизу
        const nebula3 = ctx.createRadialGradient(
            width * 0.5 + Math.sin(time * 0.2) * 40, 
            height * 0.85, 
            0,
            width * 0.5, 
            height * 0.9, 
            width * 0.6
        );
        nebula3.addColorStop(0, 'rgba(180, 80, 120, 0.15)');
        nebula3.addColorStop(0.5, 'rgba(120, 50, 80, 0.08)');
        nebula3.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nebula3;
        ctx.fillRect(0, 0, width, height);
    }

    renderStars(ctx, width, height, time) {
        // Статичные звёзды с мерцанием
        for (let i = 0; i < 80; i++) {
            // Псевдослучайные позиции на основе индекса
            const x = ((i * 137.5) % 100) / 100 * width;
            const y = ((i * 71.3) % 100) / 100 * height;
            const size = (i % 3) * 0.5 + 0.5;
            
            // Мерцание на основе времени и индекса
            const twinkle = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.7;
            ctx.globalAlpha = (0.3 + (i % 5) / 10) * twinkle;
            
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Свечение для ярких звёзд
            if (i % 7 === 0) {
                ctx.globalAlpha = 0.2 * twinkle;
                ctx.beginPath();
                ctx.arc(x, y, size * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Особо яркие звёзды с крестообразным свечением
        const brightStars = [
            { x: 0.15, y: 0.12, color: '#fff' },
            { x: 0.85, y: 0.22, color: '#eef' },
            { x: 0.35, y: 0.35, color: '#fef' },
            { x: 0.65, y: 0.18, color: '#eff' },
            { x: 0.45, y: 0.08, color: '#fff' }
        ];
        
        for (const star of brightStars) {
            const x = star.x * width;
            const y = star.y * height;
            const twinkle = Math.sin(time * 3 + star.x * 10) * 0.4 + 0.6;
            
            // Крестообразное свечение
            ctx.globalAlpha = 0.3 * twinkle;
            ctx.strokeStyle = star.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x + 8, y);
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x, y + 8);
            ctx.stroke();
            
            // Центральная точка
            ctx.globalAlpha = 1 * twinkle;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }

    renderBackgroundPlanet(ctx, width, height, time) {
        // Планета в далеке (справа сверху)
        const planetX = width * 0.75 + Math.sin(time * 0.1) * 10;
        const planetY = height * 0.15 + Math.cos(time * 0.15) * 5;
        const planetSize = 60;
        
        // Пульсация
        const pulse = Math.sin(time * 0.5) * 0.05 + 1;
        const actualSize = planetSize * pulse;
        
        // Градиент планеты
        const planetGrad = ctx.createRadialGradient(
            planetX - actualSize * 0.3, 
            planetY - actualSize * 0.3, 
            0,
            planetX, 
            planetY, 
            actualSize
        );
        planetGrad.addColorStop(0, '#4a5a8a');
        planetGrad.addColorStop(0.5, '#2a3a6a');
        planetGrad.addColorStop(1, '#1a2040');
        
        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(planetX, planetY, actualSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Свечение вокруг планеты
        const glowGrad = ctx.createRadialGradient(
            planetX, planetY, actualSize * 0.8,
            planetX, planetY, actualSize * 1.5
        );
        glowGrad.addColorStop(0, 'rgba(80, 120, 180, 0.3)');
        glowGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(planetX, planetY, actualSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}