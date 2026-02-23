class Economy {
    constructor() {
        this.coins = 0;
        this.ore = 0;
        this.totalEarned = 0;
        this.coinMultiplier = 1; // Начальный множитель монет
        this.oreChance = 0.1;    // Начальный шанс руды (10%)
        
        // Шанс двойной награды
        this.doubleRewardChance = 0;
    }

    addCoins(amount) {
        this.coins += amount;
        this.totalEarned += amount;
        
        // Отправляем в систему достижений
        if (window.game && window.game.achievements) {
            window.game.achievements.onCoinsEarned(amount);
        }
    }

    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            return true;
        }
        return false;
    }

    addOre(amount) {
        this.ore += amount;
        
        // Отправляем в систему достижений
        if (window.game && window.game.achievements) {
            window.game.achievements.onOreCollected(amount);
        }
    }

    spendOre(amount) {
        if (this.ore >= amount) {
            this.ore -= amount;
            return true;
        }
        return false;
    }
}