class DriftSystem {
    constructor(game) {
        this.game = game;

        // Настройки
        this.maxCharge = 30; // секунд для максимума
        this.charge = 0;
        this.multiplier = 1.0;

        // Множители
        this.multipliers = [
            { threshold: 0, mult: 1.0, name: 'Обычный' },
            { threshold: 5, mult: 1.5, name: 'Ускоренный' },
            { threshold: 15, mult: 2.0, name: 'Турбо' },
            { threshold: 30, mult: 3.0, name: 'БЕШЕНЫЙ' }
        ];

        this.isActive = false;
        this.decayRate = 2; // секунд в секунду при остановке
        
        // Множитель от улучшения Combo Boost
        this.comboMultiplier = 1;
    }

    onDrilling(dt) {
        this.isActive = true;
        // Применяем comboMultiplier от улучшения
        const effectiveDt = dt * this.comboMultiplier;
        this.charge = Math.min(this.charge + effectiveDt, this.maxCharge);
        this.updateMultiplier();
    }

    onStop() {
        this.isActive = false;
    }

    update(dt) {
        if (!this.isActive && this.charge > 0) {
            this.charge = Math.max(this.charge - this.decayRate * dt, 0);
            this.updateMultiplier();
        }
    }

    updateMultiplier() {
        for (let i = this.multipliers.length - 1; i >= 0; i--) {
            if (this.charge >= this.multipliers[i].threshold) {
                this.multiplier = this.multipliers[i].mult;
                break;
            }
        }
    }

    getCurrentTier() {
        for (let i = this.multipliers.length - 1; i >= 0; i--) {
            if (this.charge >= this.multipliers[i].threshold) {
                return this.multipliers[i];
            }
        }
        return this.multipliers[0];
    }

    renderEffects(ctx) {
        // Визуальные эффекты дрифта отрисовываются в Drill
    }
}