/**
 * PixiJS Renderer - замена Canvas 2D для стабильности на iOS
 */
class PixiRenderer {
    constructor(game) {
        this.game = game;
        
        // Находим старый canvas
        const oldCanvas = document.getElementById('gameCanvas');
        
        // Получаем размеры контейнера игры
        const container = document.getElementById('game-container');
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;

        // Создаём Pixi Application с реальными размерами контейнера
        this.app = new PIXI.Application({
            width: containerWidth,
            height: containerHeight,
            backgroundColor: 0x0a0a1a,
            antialias: false,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            powerPreference: 'high-performance',
            view: oldCanvas || undefined
        });
        
        // Если oldCanvas не был передан в view, или его не было, то app.view создает новый.
        // Убедимся, что ID установлен корректно и canvas вставлен в DOM.
        if (!oldCanvas) {
             this.app.view.id = 'gameCanvas';
             if (container) {
                 container.insertBefore(this.app.view, container.firstChild);
             }
        }
        this.canvas = this.app.view;
        this.canvas.style.display = 'block';
        
        // Настраиваем автоматическое изменение размера рендера PixiJS
        // Это заставит PixiJS renderer.view.width и .height соответствовать
        // clientWidth/clientHeight элемента, указанного в resizeTo.
        this.app.resizeTo = container || window;

        // Добавим обработчик resize через app.renderer
        this.app.renderer.on('resize', this.onPixiResize.bind(this));

        // Контейнеры для слоёв
        this.bgContainer = new PIXI.Container();
        this.layersGraphics = new PIXI.Graphics();
        this.drillContainer = new PIXI.Container();
        
        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.layersGraphics);
        this.app.stage.addChild(this.drillContainer);
        
        // Рисуем фон
        this.drawBackground();

        // Установка начальных размеров после создания всего.
        // Вызываем onPixiResize вручную для первой инициализации.
        this.onPixiResize();
    }

    // Этот метод будет вызван PixiJS при изменении размера рендера
    onPixiResize() {
        // Обновляем размеры игры на основе реальных размеров рендера
        this.game.width = this.app.renderer.width;
        this.game.height = this.app.renderer.height;
        
        // Перерисовываем фон после изменения размеров
        this.redrawBackground();
        
        // Уведомляем игру об изменении размера
        if (typeof this.game.onResize === 'function') {
            this.game.onResize();
        }
    }
    
    // Отдельный метод для рисования/перерисовывания фона
    redrawBackground() {
        // Очищаем старый фон
        this.bgContainer.removeChildren(); 

        // Убедимся, что фон всегда покрывает всю ширину и высоту рендера
        const bg = new PIXI.Graphics();
        bg.beginFill(0x0a0a1a);
        bg.drawRect(0, 0, this.game.width, this.game.height);
        bg.endFill();
        this.bgContainer.addChild(bg);
        
        // Звёзды - генерируем динамически в зависимости от размера экрана
        const stars = new PIXI.Graphics();
        stars.beginFill(0xFFFFFF, 0.8);
        
        // Генерируем звезды пропорционально размеру экрана
        const starCount = Math.floor((this.game.width * this.game.height) / 50000);
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * this.game.width;
            const y = Math.random() * this.game.height;
            const size = Math.random() * 2 + 1;
            stars.drawCircle(x, y, size);
        }
        stars.endFill();
        this.bgContainer.addChild(stars);
    }
    
    // Используем redrawBackground вместо drawBackground
    drawBackground() {
        this.redrawBackground();
    }

    clear() {
        this.layersGraphics.clear();
        this.drillContainer.removeChildren();
    }
    
    renderLayer(layer, cameraY) {
        const screenY = layer.y - cameraY;
        // Отсечение элементов за пределами экрана. 
        if (screenY < -layer.height || screenY > this.game.height + layer.height) return;

        const x = layer.x - layer.width / 2;
        const y = screenY - layer.height / 2;
        
        const color = parseInt(layer.color.replace('#', ''), 16);
        
        this.layersGraphics.beginFill(color);
        this.layersGraphics.drawRoundedRect(x, y, layer.width, layer.height, 8);
        this.layersGraphics.endFill();
        
        const healthPct = layer.health / layer.maxHealth;
        const barW = layer.width - 20;
        const barH = 6;
        
        this.layersGraphics.beginFill(0x333333);
        this.layersGraphics.drawRoundedRect(x + 10, y + 10, barW, barH, 3);
        this.layersGraphics.endFill();
        
        const healthColor = healthPct > 0.5 ? 0x4CAF50 : (healthPct > 0.25 ? 0xFFC107 : 0xF44336);
        this.layersGraphics.beginFill(healthColor);
        this.layersGraphics.drawRoundedRect(x + 10, y + 10, barW * healthPct, barH, 3);
        this.layersGraphics.endFill();
    }
    
    renderDrill(drill, cameraY) {
        const screenY = drill.y - cameraY;
        // Отсечение бура за пределами экрана.
        const drillHeight = 120 + 55; // Примерная высота бура (корпус + сверло)
        if (screenY < -drillHeight || screenY > this.game.height + drillHeight) return;

        const g = new PIXI.Graphics();
        
        // Корпус
        g.beginFill(0x718096);
        g.drawRoundedRect(drill.x - 35, screenY - 60, 70, 120, 12);
        g.endFill();
        
        // Кабина
        g.beginFill(0x2d3748);
        g.drawRoundedRect(drill.x - 35, screenY - 60, 70, 50, [12, 12, 0, 0]);
        g.endFill();
        
        // Иллюминатор
        g.beginFill(0x4299e1);
        g.drawCircle(drill.x, screenY - 35, 15);
        g.endFill();
        
        // Сверло
        g.beginFill(0xa0aec0);
        g.moveTo(drill.x - 20, screenY + 60);
        g.lineTo(drill.x, screenY + 115);
        g.lineTo(drill.x + 20, screenY + 60);
        g.endFill();
        
        this.drillContainer.addChild(g);
    }
    
    renderParticle(p, cameraY) {
        const screenY = p.y - cameraY;
        // Отсечение частиц за пределами экрана.
        if (screenY < -p.size || screenY > this.game.height + p.size) return;
        
        const color = parseInt(p.color.replace('#', ''), 16);
        const alpha = p.life / p.maxLife;
        
        this.layersGraphics.beginFill(color, alpha);
        this.layersGraphics.drawCircle(p.x, screenY, p.size);
        this.layersGraphics.endFill();
    }
    
    // Метод для ручного изменения размера (если нужно)
    resize(width, height) {
        this.app.renderer.resize(width, height);
    }
    
    destroy() {
        this.app.destroy(true);
    }
}