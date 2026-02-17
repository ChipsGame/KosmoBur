/**
 * Вспомогательный класс для отладки и оптимизации
 */
class DebugHelper {
    constructor(game) {
        this.game = game;
        this.logs = [];
        this.enabled = true; // Включить для отладки, выключить для релиза
    }
    
    log(message) {
        if (this.enabled) {
            console.log(`[Debug] ${message}`);
            this.logs.push(`${new Date().toLocaleTimeString()}: ${message}`);
        }
    }
    
    logGameState() {
        if (!this.enabled) return;
        
        const logs = [
            `=== СОСТОЯНИЕ ИГРЫ ===`,
            `Экран: ${window.innerWidth}x${window.innerHeight}`,
            `Canvas: ${this.game.canvas.width}x${this.game.canvas.height}`,
            `Бур: y=${Math.floor(this.game.drill.y)}, targetY=${Math.floor(this.game.drill.targetY)}`,
            `Камера: y=${Math.floor(this.game.camera.y)}`,
            `Слоев: ${this.game.layers.length}`,
            `Первый слой: ${this.game.layers[0] ? `y=${Math.floor(this.game.layers[0].y)}` : 'нет'}`,
            `Последний слой: ${this.game.layers[this.game.layers.length-1] ? `y=${Math.floor(this.game.layers[this.game.layers.length-1].y)}` : 'нет'}`,
            `Видимых слоев: ${this.game.visibleLayers ? this.game.visibleLayers.length : 'нет данных'}`,
            `=== КОНЕЦ ===`
        ];
        
        logs.forEach(log => this.log(log));
    }
    
    checkDrillPosition() {
        if (!this.enabled) return;
        
        if (this.game.layers.length > 0) {
            const firstLayer = this.game.layers[0];
            const drillBottom = this.game.drill.y + this.game.drill.height / 2;
            const layerTop = firstLayer.y - firstLayer.height / 2;
            
            const distanceToLayer = layerTop - drillBottom;
            this.log(`Расстояние от бура до первого слоя: ${Math.floor(distanceToLayer)}px`);
            
            if (distanceToLayer > 100) {
                this.log(`ВНИМАНИЕ: Бур слишком далеко от первого слоя!`);
            } else if (distanceToLayer < 0) {
                this.log(`ВНИМАНИЕ: Бур внутри слоя!`);
            } else {
                this.log(`Расстояние нормальное`);
            }
        }
    }
    
    checkRenderPerformance() {
        if (!this.enabled) return;
        
        // Логируем производительность каждые 5 секунд
        setInterval(() => {
            const visibleCount = this.game.visibleLayers ? this.game.visibleLayers.length : 0;
            const totalCount = this.game.layers.length;
            this.log(`Производительность: ${visibleCount}/${totalCount} слоев видно, ${this.game.particles.length} частиц`);
        }, 5000);
    }
    
    drawDebugInfo(ctx) {
        if (!this.enabled) return;
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 400, 180);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        let y = 30;
        ctx.fillText(`Отладка - Космический Бур`, 20, y); y += 20;
        ctx.fillText(`Экран: ${window.innerWidth}x${window.innerHeight}`, 20, y); y += 20;
        ctx.fillText(`Бур: y=${Math.floor(this.game.drill.y)}, высота=${this.game.drill.height}`, 20, y); y += 20;
        ctx.fillText(`Камера: y=${Math.floor(this.game.camera.y)}`, 20, y); y += 20;
        ctx.fillText(`Слоев: ${this.game.layers.length}, видно: ${this.game.visibleLayers ? this.game.visibleLayers.length : 'нет'}`, 20, y); y += 20;
        
        if (this.game.layers.length > 0) {
            const firstLayer = this.game.layers[0];
            const drillBottom = this.game.drill.y + this.game.drill.height / 2;
            const layerTop = firstLayer.y - firstLayer.height / 2;
            const distance = Math.floor(layerTop - drillBottom);
            
            ctx.fillText(`Первый слой: y=${Math.floor(firstLayer.y)}`, 20, y); y += 20;
            ctx.fillText(`Расстояние до слоя: ${distance}px`, 20, y); y += 20;
            
            if (distance > 100) {
                ctx.fillStyle = 'yellow';
                ctx.fillText(`ВНИМАНИЕ: Бур слишком далеко!`, 20, y); y += 20;
            } else if (distance < 0) {
                ctx.fillStyle = 'red';
                ctx.fillText(`ВНИМАНИЕ: Бур внутри слоя!`, 20, y); y += 20;
            }
        }
        
        ctx.restore();
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugHelper;
}