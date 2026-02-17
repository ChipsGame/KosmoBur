/**
 * СИСТЕМА УЛУЧШЕНИЙ - КЛИКЕР ВЕРСИЯ
 * Улучшения не уменьшают HP слоёв напрямую!
 */
class Upgrades {
    constructor(game) {
        this.game = game;

        this.upgrades = [
            // === АВТОБУР (оставляем как есть) ===
            {
                id: 'auto_drill_unlock',
                name: 'Автобур',
                description: 'Бурит автоматически 0.5 раза в сек',
                baseCost: 500,
                costMultiplier: 3,
                maxLevel: 1,
                effect: (level) => level > 0 ? 0.5 : 0,
                icon: '🤖',
                category: 'auto',
                unlocksAt: 50
            },
            {
                id: 'auto_drill_speed',
                name: 'Скорость Автобура',
                description: '+0.5 клика/сек за уровень',
                baseCost: 1000,
                costMultiplier: 1.5,
                maxLevel: 20,
                effect: (level) => level * 0.5,
                icon: '⚙️',
                category: 'auto',
                requires: 'auto_drill_unlock'
            },
            {
                id: 'auto_drill_power',
                name: 'Мощность Автобура',
                description: '+20% урона автобура',
                baseCost: 2000,
                costMultiplier: 1.6,
                maxLevel: 15,
                effect: (level) => 1 + level * 0.2,
                icon: '🔋',
                category: 'auto',
                requires: 'auto_drill_unlock'
            },
            
            // === БАЗОВЫЕ УЛУЧШЕНИЯ (новые) ===
            {
                id: 'crit_chance',
                name: 'Критический Удар',
                description: 'Шанс пробить слой с 1 клика',
                baseCost: 100,
                costMultiplier: 1.4,
                maxLevel: 20,
                effect: (level) => Math.min(level * 0.02, 0.3), // Макс 30%
                icon: '💥',
                category: 'basic'
            },
            {
                id: 'combo_boost',
                name: 'Комбо Буст',
                description: 'Дрифт растёт быстрее на +10%',
                baseCost: 150,
                costMultiplier: 1.35,
                maxLevel: 15,
                effect: (level) => 1 + level * 0.1,
                icon: '🔥',
                category: 'basic'
            },
            {
                id: 'cooling_system',
                name: 'Охлаждение',
                description: 'Перегрев на -10%',
                baseCost: 200,
                costMultiplier: 1.4,
                maxLevel: 10,
                effect: (level) => 1 - level * 0.1,
                icon: '❄️',
                category: 'basic'
            },
            {
                id: 'coin_magnet',
                name: 'Монетный Магнит',
                description: '+15% монет с каждого слоя',
                baseCost: 300,
                costMultiplier: 1.45,
                maxLevel: 15,
                effect: (level) => 1 + level * 0.15,
                icon: '🧲',
                category: 'basic'
            },
            {
                id: 'luck',
                name: 'Удача',
                description: '+10% шанс найти руду',
                baseCost: 500,
                costMultiplier: 1.5,
                maxLevel: 10,
                effect: (level) => level * 0.1,
                icon: '🍀',
                category: 'basic'
            },
            
            // === ПРОДВИНУТЫЕ (с 100м) ===
            {
                id: 'double_reward',
                name: 'Двойная Награда',
                description: 'Шанс 2x монет с слоя',
                baseCost: 1000,
                costMultiplier: 1.5,
                maxLevel: 10,
                effect: (level) => Math.min(level * 0.03, 0.25), // Макс 25%
                icon: '💰',
                category: 'advanced',
                unlocksAt: 100
            },
            {
                id: 'super_strike',
                name: 'Супер Удар',
                description: 'Каждый 10й клик = x2 урона',
                baseCost: 1500,
                costMultiplier: 1.6,
                maxLevel: 5,
                effect: (level) => level > 0 ? (11 - level) : 0, // Уровень 1 = каждый 10й, Уровень 5 = каждый 6й
                icon: '⚡',
                category: 'advanced',
                unlocksAt: 100
            },
            {
                id: 'heat_shield',
                name: 'Тепловой Щит',
                description: 'Макс. перегрев +20%',
                baseCost: 2000,
                costMultiplier: 1.7,
                maxLevel: 5,
                effect: (level) => level * 0.2,
                icon: '🛡️',
                category: 'advanced',
                unlocksAt: 100
            },
            
            // === ЭКСПЕРТНЫЕ (с 300м) ===
            {
                id: 'rampage',
                name: 'Ярость',
                description: 'Быстрые клики = сильнее удары',
                baseCost: 5000,
                costMultiplier: 2,
                maxLevel: 5,
                effect: (level) => 1 + level * 0.1,
                icon: '😤',
                category: 'expert',
                unlocksAt: 300
            },
            {
                id: 'deep_diver',
                name: 'Глубоководник',
                description: 'Награды растут с глубиной быстрее',
                baseCost: 8000,
                costMultiplier: 2,
                maxLevel: 5,
                effect: (level) => 1 + level * 0.2,
                icon: '🌊',
                category: 'expert',
                unlocksAt: 300
            }
        ];

        this.levels = {};
        this.upgrades.forEach(u => this.levels[u.id] = 0);
        
        // Текущая вкладка
        this.currentCategory = 'basic';
    }

    getCost(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const level = this.levels[upgradeId];
        return Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, level));
    }

    canAfford(upgradeId) {
        return this.game.economy.coins >= this.getCost(upgradeId);
    }

    buy(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const cost = this.getCost(upgradeId);

        if (this.levels[upgradeId] >= upg.maxLevel) return false;
        if (!this.game.economy.spendCoins(cost)) return false;

        this.levels[upgradeId]++;
        this.applyUpgrade(upgradeId);
        return true;
    }

    applyUpgrade(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const level = this.levels[upgradeId];

        switch(upgradeId) {
            // === АВТОБУР ===
            case 'auto_drill_unlock':
                if (level > 0) {
                    this.game.autoDrill.setBaseSpeed(0.5);
                }
                break;
            case 'auto_drill_speed':
                const baseSpeed = this.levels['auto_drill_unlock'] > 0 ? 0.5 : 0;
                const bonusSpeed = upg.effect(level);
                this.game.autoDrill.setBaseSpeed(baseSpeed + bonusSpeed);
                break;
            case 'auto_drill_power':
                this.game.autoDrill.setEfficiency(upg.effect(level));
                break;
                
            // === БАЗОВЫЕ ===
            case 'crit_chance':
                this.game.drill.critChance = upg.effect(level);
                break;
            case 'combo_boost':
                // Применяется в driftSystem
                this.game.driftSystem.comboMultiplier = upg.effect(level);
                break;
            case 'cooling_system':
                this.game.drill.heatMultiplier = upg.effect(level);
                break;
            case 'coin_magnet':
                this.game.economy.coinMultiplier = upg.effect(level);
                break;
            case 'luck':
                this.game.economy.oreChance = 0.1 + upg.effect(level);
                break;
                
            // === ПРОДВИНУТЫЕ ===
            case 'double_reward':
                this.game.economy.doubleRewardChance = upg.effect(level);
                break;
            case 'super_strike':
                this.game.drill.superStrikeInterval = upg.effect(level);
                break;
            case 'heat_shield':
                this.game.drill.maxTemperature = 100 * (1 + upg.effect(level));
                break;
                
            // === ЭКСПЕРТНЫЕ ===
            case 'rampage':
                this.game.drill.rampageMultiplier = upg.effect(level);
                break;
            case 'deep_diver':
                this.game.economy.depthMultiplier = upg.effect(level);
                break;
        }
    }
    
    /**
     * Проверить, доступно ли улучшение
     */
    isAvailable(upgrade) {
        // Проверка глубины
        if (upgrade.unlocksAt && this.game.drill.depth < upgrade.unlocksAt) {
            return false;
        }
        // Проверка зависимостей
        if (upgrade.requires && this.levels[upgrade.requires] === 0) {
            return false;
        }
        return true;
    }
    
    /**
     * Получить текст блокировки
     */
    getLockText(upgrade) {
        if (upgrade.unlocksAt && this.game.drill.depth < upgrade.unlocksAt) {
            return `🔒 ${upgrade.unlocksAt}м`;
        }
        if (upgrade.requires && this.levels[upgrade.requires] === 0) {
            const req = this.upgrades.find(u => u.id === upgrade.requires);
            return `🔒 ${req.name}`;
        }
        return '';
    }

    /**
     * Получить описание эффекта улучшения
     */
    getEffectDescription(upg, level) {
        const currentEffect = upg.effect(level);
        const nextEffect = upg.effect(level + 1);
        
        switch(upg.id) {
            case 'auto_drill_unlock':
                return level > 0 ? '✓ Активен' : '+0.5 клик/с';
            case 'auto_drill_speed':
                return `+${(nextEffect - currentEffect).toFixed(1)} клик/с`;
            case 'auto_drill_power':
                return `+${Math.round((nextEffect - currentEffect) * 100)}% урона`;
            case 'crit_chance':
                return `+${Math.round((nextEffect - currentEffect) * 100)}% шанс`;
            case 'combo_boost':
                return `+${Math.round((nextEffect - 1) * 100)}% дрифта`;
            case 'cooling_system':
                return `-${Math.round((1 - nextEffect) * 100)}% нагрева`;
            case 'coin_magnet':
                return `+${Math.round((nextEffect - 1) * 100)}% монет`;
            case 'luck':
                return `+${Math.round((nextEffect - currentEffect) * 100)}% руды`;
            case 'double_reward':
                return `+${Math.round((nextEffect - currentEffect) * 100)}% шанс 2x`;
            case 'super_strike':
                return level === 0 ? 'Каждый 10й клик x2' : `Каждый ${11 - level}й клик x2`;
            case 'heat_shield':
                return `+${Math.round((nextEffect - currentEffect) * 100)}% перегрева`;
            case 'rampage':
                return `+${Math.round((nextEffect - 1) * 100)}% от скорости`;
            case 'deep_diver':
                return `+${Math.round((nextEffect - 1) * 100)}% награды`;
            default:
                return upg.description;
        }
    }

    renderUI() {
        const container = document.querySelector('.upgrades-grid');
        container.innerHTML = '';
        
        // Фильтруем улучшения по категории и доступности
        const availableUpgrades = this.upgrades.filter(upg => {
            // Всегда показываем базовые и авто
            if (upg.category === 'basic' || upg.category === 'auto') return true;
            // Для других категорий - только если разблокированы
            return this.isAvailable(upg) || this.levels[upg.id] > 0;
        });

        availableUpgrades.forEach(upg => {
            const level = this.levels[upg.id];
            const cost = this.getCost(upg.id);
            const maxed = level >= upg.maxLevel;
            const canAfford = this.canAfford(upg.id);
            const isLocked = !this.isAvailable(upg) && level === 0;
            
            // Получаем описание эффекта
            const effectDesc = maxed ? '✅ МАКС' : this.getEffectDescription(upg, level);

            const card = document.createElement('div');
            card.className = `upgrade-card ${maxed ? 'maxed' : ''} ${isLocked ? 'locked' : ''}`;
            
            if (isLocked) {
                const lockText = this.getLockText(upg);
                card.innerHTML = `
                    <div class="upgrade-icon">🔒</div>
                    <div class="upgrade-name locked-name">${upg.name}</div>
                    <div class="upgrade-lock-text">${lockText}</div>
                    <button class="upgrade-cost-btn" disabled>🔒</button>
                `;
            } else {
                card.innerHTML = `
                    <div class="upgrade-icon">${upg.icon}</div>
                    <div class="upgrade-name">${upg.name}</div>
                    <div class="upgrade-level">Ур. ${level}/${upg.maxLevel}</div>
                    <div class="upgrade-effect">${effectDesc}</div>
                    <button class="upgrade-cost-btn ${maxed ? 'maxed-btn' : ''} ${!canAfford && !maxed ? 'disabled-btn' : ''}" ${maxed || !canAfford ? 'disabled' : ''}>
                        ${maxed ? 'МАКС' : '🪙 ' + Utils.formatNumber(cost)}
                    </button>
                `;
                
                if (!maxed) {
                    card.querySelector('button').addEventListener('click', () => {
                        if (this.buy(upg.id)) {
                            this.renderUI();
                            this.game.saveManager.save();
                        }
                    });
                }
            }

            container.appendChild(card);
        });
    }
}
