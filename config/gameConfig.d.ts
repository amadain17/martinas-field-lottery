export declare const GAME_CONFIG: {
    readonly grid: {
        readonly cols: 12;
        readonly rows: 12;
        readonly totalSquares: 144;
        readonly squareSizeMeters: 1;
    };
    readonly pricing: {
        readonly squarePrice: 10;
        readonly currency: "EUR";
        readonly currencySymbol: "€";
        readonly fixedPrize: 150;
    };
    readonly prizePools: {
        readonly firstQuarter: 0.2;
        readonly halfTime: 0.15;
        readonly thirdQuarter: 0.2;
        readonly finalScore: 0.35;
        readonly house: 0.1;
    };
    readonly labels: {
        readonly columns: readonly ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
        readonly rows: number[];
    };
    readonly map: {
        readonly center: [number, number];
        readonly zoom: 21.3;
    };
    readonly field: {
        readonly metersToDegreesLat: 0.000009;
        readonly metersToDegreesLng: 0.000014;
    };
};
export declare const CALCULATED_VALUES: {
    readonly totalPrizePool: number;
    readonly prizeBreakdown: Record<string, number>;
    readonly gridDimensions: {
        cols: number;
        rows: number;
        total: number;
    };
    readonly fieldDimensions: {
        fieldSizeMeters: number;
        halfFieldSize: number;
        squareSizeMeters: number;
    };
};
export default GAME_CONFIG;
//# sourceMappingURL=gameConfig.d.ts.map