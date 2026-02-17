const Utils = {
    // Случайное число в диапазоне
    random: (min, max) => Math.random() * (max - min) + min,

    // Случайный целый
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Интерполяция
    lerp: (a, b, t) => a + (b - a) * t,

    // Ограничение
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    // Форматирование чисел
    formatNumber: (num) => {
        if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num/1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    },

    // Цветовая интерполяция
    interpolateColor: (color1, color2, factor) => {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }
};