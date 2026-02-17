/**
 * СИСТЕМА СКИНОВ ДЛЯ БУРА
 * 15 различных скинов
 */
class Skins {
    constructor(game) {
        this.game = game;
        
        // Текущий выбранный скин
        this.currentSkin = 'default';
        
        // Купленные скины
        this.ownedSkins = ['default'];
        
        // Все доступные скины
        this.skins = [
            {
                id: 'default',
                name: 'Стандартный',
                description: 'Классический космический бур',
                price: 0,
                icon: '🔧',
                colors: {
                    body: '#718096',
                    cabin: '#2d3748',
                    drill: '#a0aec0',
                    window: '#4299e1'
                }
            },
            {
                id: 'golden',
                name: 'Золотой',
                description: 'Роскошный золотой бур для богачей',
                price: 500,
                icon: '👑',
                colors: {
                    body: '#d69e2e',
                    cabin: '#744210',
                    drill: '#ecc94b',
                    window: '#f6e05e'
                }
            },
            {
                id: 'lava',
                name: 'Лавовый',
                description: 'Раскалённый бур из вулканической породы',
                price: 2500,
                icon: '🔥',
                colors: {
                    body: '#9b2c2c',
                    cabin: '#742a2a',
                    drill: '#f56565',
                    window: '#fc8181'
                }
            },
            {
                id: 'ice',
                name: 'Ледяной',
                description: 'Бур из вечной мерзлоты',
                price: 2500,
                icon: '❄️',
                colors: {
                    body: '#90cdf4',
                    cabin: '#3182ce',
                    drill: '#e6fffa',
                    window: '#b2f5ea'
                }
            },
            {
                id: 'toxic',
                name: 'Токсичный',
                description: 'Радиоактивный бур с ядовитым свечением',
                price: 3000,
                icon: '☢️',
                colors: {
                    body: '#48bb78',
                    cabin: '#22543d',
                    drill: '#9ae6b4',
                    window: '#68d391'
                }
            },
            {
                id: 'cyber',
                name: 'Киберпанк',
                description: 'Футуристический бур из 2077 года',
                price: 4000,
                icon: '🤖',
                colors: {
                    body: '#1a202c',
                    cabin: '#000000',
                    drill: '#00ff00',
                    window: '#ff00ff'
                }
            },
            {
                id: 'rusty',
                name: 'Ржавый',
                description: 'Старый добрый ржавый бур',
                price: 500,
                icon: '🦀',
                colors: {
                    body: '#c05621',
                    cabin: '#7c2d12',
                    drill: '#dd6b20',
                    window: '#fbd38d'
                }
            },
            {
                id: 'diamond',
                name: 'Алмазный',
                description: 'Бур из чистых алмазов',
                price: 10000,
                icon: '💎',
                colors: {
                    body: '#b2f5ea',
                    cabin: '#319795',
                    drill: '#e6fffa',
                    window: '#81e6d9'
                }
            },
            {
                id: 'shadow',
                name: 'Теневой',
                description: 'Бур из теневого измерения',
                price: 3500,
                icon: '🌑',
                colors: {
                    body: '#2d3748',
                    cabin: '#1a202c',
                    drill: '#4a5568',
                    window: '#718096'
                }
            },
            {
                id: 'rainbow',
                name: 'Радужный',
                description: 'Бур со всеми цветами радуги',
                price: 4500,
                icon: '🌈',
                colors: {
                    body: '#ed64a6',
                    cabin: '#805ad5',
                    drill: '#f687b3',
                    window: '#fbd38d'
                }
            },
            {
                id: 'military',
                name: 'Военный',
                description: 'Бронированный военный бур',
                price: 2000,
                icon: '🎖️',
                colors: {
                    body: '#556b2f',
                    cabin: '#2f3b17',
                    drill: '#6b8e23',
                    window: '#9acd32'
                }
            },
            {
                id: 'candy',
                name: 'Конфетный',
                description: 'Сладкий бур для сладкоежек',
                price: 1500,
                icon: '🍬',
                colors: {
                    body: '#f687b3',
                    cabin: '#b83280',
                    drill: '#fbb6ce',
                    window: '#fed7e2'
                }
            },
            {
                id: 'steampunk',
                name: 'Стимпанк',
                description: 'Бур в викторианском стиле',
                price: 3000,
                icon: '⚙️',
                colors: {
                    body: '#975a16',
                    cabin: '#744210',
                    drill: '#d69e2e',
                    window: '#f6ad55'
                }
            },
            {
                id: 'alien',
                name: 'Инопланетный',
                description: 'Технологии пришельцев',
                price: 50000,
                icon: '👽',
                colors: {
                    body: '#38a169',
                    cabin: '#276749',
                    drill: '#68d391',
                    window: '#9ae6b4'
                }
            },
            {
                id: 'pirate',
                name: 'Пиратский',
                description: 'Бур для подводных сокровищ',
                price: 2000,
                icon: '🏴‍☠️',
                colors: {
                    body: '#2c5282',
                    cabin: '#1a365d',
                    drill: '#4299e1',
                    window: '#f6e05e'
                }
            }
        ];
    }
    
    /**
     * Получить текущий скин
     */
    getCurrentSkin() {
        return this.skins.find(s => s.id === this.currentSkin) || this.skins[0];
    }
    
    /**
     * Получить цвета текущего скина
     */
    getColors() {
        return this.getCurrentSkin().colors;
    }
    
    /**
     * Купить скин
     */
    buy(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin) return { success: false, error: 'Скин не найден' };
        if (this.ownedSkins.includes(skinId)) return { success: false, error: 'Уже куплен' };
        if (this.game.economy.coins < skin.price) return { success: false, error: 'Недостаточно монет' };
        
        if (this.game.economy.spendCoins(skin.price)) {
            this.ownedSkins.push(skinId);
            this.game.saveManager.save();
            return { success: true };
        }
        return { success: false, error: 'Ошибка покупки' };
    }
    
    /**
     * Выбрать скин
     */
    select(skinId) {
        if (!this.ownedSkins.includes(skinId)) return false;
        this.currentSkin = skinId;
        this.game.saveManager.save();
        return true;
    }
    
    /**
     * Показать магазин скинов
     */
    showShop() {
        // Удаляем старое окно
        const oldModal = document.getElementById('modal-skins');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'modal-skins';
        modal.className = 'modal';
        
        // Генерируем HTML для скинов
        const skinsHTML = this.skins.map(skin => {
            const isOwned = this.ownedSkins.includes(skin.id);
            const isSelected = this.currentSkin === skin.id;
            
            let buttonText = '';
            let buttonClass = '';
            let buttonDisabled = '';
            
            if (isSelected) {
                buttonText = '✓ Выбран';
                buttonClass = 'skin-btn-selected';
                buttonDisabled = 'disabled';
            } else if (isOwned) {
                buttonText = 'Выбрать';
                buttonClass = 'skin-btn-own';
            } else {
                buttonText = `🪙 ${Utils.formatNumber(skin.price)}`;
                buttonClass = 'skin-btn-buy';
                if (this.game.economy.coins < skin.price) {
                    buttonClass += ' skin-btn-disabled';
                    buttonDisabled = 'disabled';
                }
            }
            
            // Превью цвета скина
            const previewStyle = `background: linear-gradient(135deg, ${skin.colors.body} 0%, ${skin.colors.drill} 100%)`;
            
            return `
                <div class="skin-card ${isSelected ? 'skin-selected' : ''} ${!isOwned ? 'skin-locked' : ''}">
                    <div class="skin-preview" style="${previewStyle}">
                        <span class="skin-icon">${skin.icon}</span>
                    </div>
                    <div class="skin-info">
                        <div class="skin-name">${skin.name}</div>
                        <div class="skin-desc">${skin.description}</div>
                    </div>
                    <button class="skin-btn ${buttonClass}" data-skin="${skin.id}" ${buttonDisabled}>
                        ${buttonText}
                    </button>
                </div>
            `;
        }).join('');
        
        modal.innerHTML = `
            <div class="modal-content skins-modal">
                <h2>🎨 Магазин скинов</h2>
                <div class="skins-balance">
                    🪙 ${Utils.formatNumber(Math.floor(this.game.economy.coins))}
                </div>
                <div class="skins-grid">
                    ${skinsHTML}
                </div>
                <button class="close-modal" id="skins-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчики
        modal.querySelectorAll('.skin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skinId = e.target.dataset.skin;
                const skin = this.skins.find(s => s.id === skinId);
                
                if (this.ownedSkins.includes(skinId)) {
                    // Выбираем скин
                    if (this.select(skinId)) {
                        this.game.showNotification(`✓ Выбран скин: ${skin.name}`, '#68d391', 2000);
                        modal.remove();
                        this.showShop(); // Переоткрываем для обновления
                    }
                } else {
                    // Покупаем скин
                    const result = this.buy(skinId);
                    if (result.success) {
                        this.game.showNotification(`🎉 Куплен скин: ${skin.name}!`, '#ffd700', 3000);
                        modal.remove();
                        this.showShop(); // Переоткрываем для обновления
                    } else {
                        this.game.showNotification(`❌ ${result.error}`, '#ff6b6b', 3000);
                    }
                }
            });
        });
        
        modal.querySelector('#skins-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    /**
     * Сохранение
     */
    save() {
        return {
            current: this.currentSkin,
            owned: this.ownedSkins
        };
    }
    
    /**
     * Загрузка
     */
    load(data) {
        if (!data) return;
        this.currentSkin = data.current || 'default';
        this.ownedSkins = data.owned || ['default'];
    }
}
