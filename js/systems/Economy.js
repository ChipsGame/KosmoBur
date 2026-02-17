class Economy {
    constructor() {
        this.coins = 0;
        this.ore = 0;
        this.totalEarned = 0;
        this.coinMultiplier = 1; // Начальный множитель монет
        this.oreChance = 0.1;    // Начальный шанс руды (10%)
        
        // Новые свойства для улучшений
        this.doubleRewardChance = 0; // Шанс двойной награды
        this.depthMultiplier = 1;    // Множитель наград от глубины
    }

    addCoins(amount) {
        this.coins += amount;
        this.totalEarned += amount;
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
    }

    spendOre(amount) {
        if (this.ore >= amount) {
            this.ore -= amount;
            return true;
        }
        return false;
    }
}