"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CALCULATED_VALUES = exports.GAME_CONFIG = void 0;
exports.GAME_CONFIG = {
    grid: {
        cols: 12,
        rows: 12,
        totalSquares: 144,
        squareSizeMeters: 1,
    },
    pricing: {
        squarePrice: 10.00,
        currency: 'EUR',
        currencySymbol: '€',
        fixedPrize: 150.00,
    },
    prizePools: {
        firstQuarter: 0.20,
        halfTime: 0.15,
        thirdQuarter: 0.20,
        finalScore: 0.35,
        house: 0.10,
    },
    labels: {
        columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
        rows: Array.from({ length: 12 }, (_, i) => i + 1),
    },
    map: {
        center: [-6.2297778, 52.9416389],
        zoom: 21.3,
    },
    field: {
        metersToDegreesLat: 0.000009,
        metersToDegreesLng: 0.000014,
    },
};
exports.CALCULATED_VALUES = {
    get totalPrizePool() {
        return exports.GAME_CONFIG.pricing.fixedPrize;
    },
    get prizeBreakdown() {
        const fixedPrize = exports.GAME_CONFIG.pricing.fixedPrize;
        return {
            firstQuarter: fixedPrize,
            halfTime: fixedPrize,
            thirdQuarter: fixedPrize,
            finalScore: fixedPrize,
            house: 0,
            total: fixedPrize,
        };
    },
    get gridDimensions() {
        return {
            cols: exports.GAME_CONFIG.grid.cols,
            rows: exports.GAME_CONFIG.grid.rows,
            total: exports.GAME_CONFIG.grid.totalSquares,
        };
    },
    get fieldDimensions() {
        const fieldSizeMeters = exports.GAME_CONFIG.grid.cols * exports.GAME_CONFIG.grid.squareSizeMeters;
        return {
            fieldSizeMeters,
            halfFieldSize: fieldSizeMeters / 2,
            squareSizeMeters: exports.GAME_CONFIG.grid.squareSizeMeters,
        };
    },
};
const validateConfig = () => {
    const { cols, rows, totalSquares } = exports.GAME_CONFIG.grid;
    if (cols * rows !== totalSquares) {
        throw new Error(`Grid configuration error: ${cols} × ${rows} ≠ ${totalSquares}`);
    }
    const prizeTotal = Object.values(exports.GAME_CONFIG.prizePools).reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(prizeTotal - 1.0) > 0.001) {
        throw new Error(`Prize pool percentages must sum to 1.0, got ${prizeTotal}`);
    }
    if (exports.GAME_CONFIG.labels.columns.length !== cols) {
        throw new Error(`Column labels length (${exports.GAME_CONFIG.labels.columns.length}) must match cols (${cols})`);
    }
    if (exports.GAME_CONFIG.labels.rows.length !== rows) {
        throw new Error(`Row labels length (${exports.GAME_CONFIG.labels.rows.length}) must match rows (${rows})`);
    }
};
validateConfig();
exports.default = exports.GAME_CONFIG;
//# sourceMappingURL=gameConfig.js.map