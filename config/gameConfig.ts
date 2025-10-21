// Game Configuration - Single source of truth for all game settings
// Shared between frontend and backend
export const GAME_CONFIG = {
  // Grid configuration
  grid: {
    cols: 12,           // A-L = 12 columns
    rows: 12,           // 1-12 = 12 rows
    totalSquares: 144,  // 12 × 12 = 144 squares
    squareSizeMeters: 1, // Size of each square in meters (1 = 1m x 1m, 2 = 2m x 2m)
  },

  // Pricing configuration
  pricing: {
    squarePrice: 10.00,     // Price per square in euros
    currency: 'EUR',
    currencySymbol: '€',
    fixedPrize: 150.00,     // Fixed prize amount
  },

  // Prize pool configuration (not used with fixed prize)
  prizePools: {
    // Prize distribution as percentages of total pool
    firstQuarter: 0.20,     // 20% - First quarter winner
    halfTime: 0.15,         // 15% - Half time winner  
    thirdQuarter: 0.20,     // 20% - Third quarter winner
    finalScore: 0.35,       // 35% - Final score winner
    house: 0.10,            // 10% - House fee
  },

  // Grid labels
  labels: {
    columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], // 12 columns
    rows: Array.from({ length: 12 }, (_, i) => i + 1),                      // 1-12 rows
  },

  // Map configuration - Martina's Field coordinates
  map: {
    center: [-6.2297778, 52.9416389] as [number, number], // 52°56'29.9"N 6°13'47.2"W
    zoom: 21.3, // Optimal zoom to show the field with grid clearly
  },

  // Field configuration - GPS coordinates and conversions
  field: {
    // GPS coordinate conversion factors for Martina's Field location
    metersToDegreesLat: 0.000009,  // 1 meter in latitude degrees
    metersToDegreesLng: 0.000014,  // 1 meter in longitude degrees (adjusted for 52.94°N latitude)
  },
} as const;

// Calculated values
export const CALCULATED_VALUES = {
  get totalPrizePool(): number {
    return GAME_CONFIG.pricing.fixedPrize;
  },

  get prizeBreakdown(): Record<string, number> {
    const fixedPrize = GAME_CONFIG.pricing.fixedPrize;
    return {
      firstQuarter: fixedPrize,
      halfTime: fixedPrize,
      thirdQuarter: fixedPrize,
      finalScore: fixedPrize,
      house: 0, // No house fee with fixed prize
      total: fixedPrize,
    };
  },

  get gridDimensions(): { cols: number; rows: number; total: number } {
    return {
      cols: GAME_CONFIG.grid.cols,
      rows: GAME_CONFIG.grid.rows,
      total: GAME_CONFIG.grid.totalSquares,
    };
  },

  get fieldDimensions(): { 
    fieldSizeMeters: number; 
    halfFieldSize: number; 
    squareSizeMeters: number;
  } {
    const fieldSizeMeters = GAME_CONFIG.grid.cols * GAME_CONFIG.grid.squareSizeMeters;
    return {
      fieldSizeMeters,
      halfFieldSize: fieldSizeMeters / 2,
      squareSizeMeters: GAME_CONFIG.grid.squareSizeMeters,
    };
  },
};

// Validation
const validateConfig = () => {
  const { cols, rows, totalSquares } = GAME_CONFIG.grid;
  if (cols * rows !== totalSquares) {
    throw new Error(`Grid configuration error: ${cols} × ${rows} ≠ ${totalSquares}`);
  }

  const prizeTotal = Object.values(GAME_CONFIG.prizePools).reduce((sum, pct) => sum + pct, 0);
  if (Math.abs(prizeTotal - 1.0) > 0.001) {
    throw new Error(`Prize pool percentages must sum to 1.0, got ${prizeTotal}`);
  }

  if (GAME_CONFIG.labels.columns.length !== cols) {
    throw new Error(`Column labels length (${GAME_CONFIG.labels.columns.length}) must match cols (${cols})`);
  }

  if (GAME_CONFIG.labels.rows.length !== rows) {
    throw new Error(`Row labels length (${GAME_CONFIG.labels.rows.length}) must match rows (${rows})`);
  }
};

// Validate on import
validateConfig();

export default GAME_CONFIG;