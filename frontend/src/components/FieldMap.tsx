import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Square } from '../services/api';
import { GAME_CONFIG, CALCULATED_VALUES } from '../../../config/gameConfig';
import { useGameStore } from '../store/gameStore';

// Set Mapbox token with error handling
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
console.log('🗺️ Mapbox token check:', { 
  token: mapboxToken ? 'Present' : 'Missing', 
  length: mapboxToken?.length,
  env: import.meta.env 
});

if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken;
  console.log('✅ Mapbox token set successfully');
} else {
  console.error('❌ VITE_MAPBOX_TOKEN is not set in environment variables');
}

interface FieldMapProps {
  center?: [number, number];
  zoom?: number;
  gridCols?: number;
  gridRows?: number;
  squares?: Square[];
}

interface FieldGeometry {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
}

interface GridSquareFeature {
  type: 'Feature';
  properties: {
    square: number;
    position: string;
    status: string;
    ownerInitials: string | null;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface GridLabelFeature {
  type: 'Feature';
  properties: {
    text: string;
    type: 'column' | 'row';
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const FieldMap: React.FC<FieldMapProps> = ({
  center = [-0.1276, 51.5074], // Default to London
  zoom = 16.5,
  gridCols = 10,
  gridRows = 8,
  squares = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { setShowPaymentModal, paymentCredit, setSelectedSquare, setShowSquareSelection } = useGameStore();

  const generateGridSquares = useCallback((
    mapInstance: mapboxgl.Map, 
    field: FieldGeometry, 
    rows: number, 
    cols: number,
    squareData: Square[]
  ) => {
    console.log('generateGridSquares called with:', { rows, cols, squareDataLength: squareData.length });
    console.log('First 5 squares data:', squareData.slice(0, 5).map(s => ({ position: s.position, gridX: s.gridX, gridY: s.gridY, squareNumber: s.squareNumber })));
    
    const [minLng, minLat, maxLng, maxLat] = [
      field.geometry.coordinates[0][0][0],
      field.geometry.coordinates[0][0][1],
      field.geometry.coordinates[0][2][0],
      field.geometry.coordinates[0][2][1]
    ];

    console.log('Field bounds:', { minLng, minLat, maxLng, maxLat });

    const squares: GridSquareFeature[] = [];
    const lngStep = (maxLng - minLng) / cols;
    const latStep = (maxLat - minLat) / rows;

    console.log('Grid steps:', { lngStep, latStep });

    // Use actual square data to create grid
    squareData.forEach(squareInfo => {
      const { gridX, gridY, position, status, ownerInitials } = squareInfo;
      
      const lng1 = minLng + gridX * lngStep;
      const lng2 = minLng + (gridX + 1) * lngStep;
      // Invert Y coordinates so gridY=0 (row 1) is at the top (maxLat)
      const lat1 = maxLat - (gridY + 1) * latStep;
      const lat2 = maxLat - gridY * latStep;

      squares.push({
        type: 'Feature',
        properties: { 
          square: squareInfo.squareNumber,
          position: position,
          status: status === 'TAKEN' ? 'sold' : 'available',
          ownerInitials: ownerInitials || null
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1]
          ]]
        }
      });
    });

    console.log('Created squares features:', squares.length);

    // Add grid squares to map
    mapInstance.addSource('grid-squares', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: squares
      }
    });

    console.log('Added squares source to map');

    // Add square fills
    mapInstance.addLayer({
      id: 'grid-squares-fill',
      type: 'fill',
      source: 'grid-squares',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'status'], 'sold'], '#ff0000',
          '#00ff00'
        ],
        'fill-opacity': 0.3
      }
    });

    // Add square borders
    mapInstance.addLayer({
      id: 'grid-squares-line',
      type: 'line',
      source: 'grid-squares',
      paint: {
        'line-color': '#000000',
        'line-width': 1
      }
    });

    // Add click handlers
    mapInstance.on('click', 'grid-squares-fill', (e) => {
      if (e.features && e.features[0]) {
        const position = e.features[0].properties?.position;
        const status = e.features[0].properties?.status;
        const ownerInitials = e.features[0].properties?.ownerInitials;
        
        if (status === 'sold') {
          alert(`Square ${position} - Owned by ${ownerInitials}`);
          return;
        }
        
        // Handle available square selection
        if (!paymentCredit || paymentCredit.status !== 'CONFIRMED') {
          // Store the selected square for payment
          // Find the square from the game store data (not the GeoJSON features)
          const { squares: gameSquares } = useGameStore.getState();
          const square = gameSquares.find(s => s.position === position);
          if (square) {
            setSelectedSquare(square.id);
          }
          setShowPaymentModal(true);
        } else {
          // Payment confirmed, allow square selection
          const square = squareData.find(s => s.position === position);
          if (square) {
            setSelectedSquare(square.id);
            setShowSquareSelection(true);
          }
        }
      }
    });

    // Change cursor on hover
    mapInstance.on('mouseenter', 'grid-squares-fill', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });

    mapInstance.on('mouseleave', 'grid-squares-fill', () => {
      mapInstance.getCanvas().style.cursor = '';
    });

    // Add grid labels
    addGridLabels(mapInstance, field, rows, cols);
  }, [paymentCredit, setSelectedSquare, setShowPaymentModal, setShowSquareSelection]);

  const updateGridSquares = useCallback((
    mapInstance: mapboxgl.Map, 
    field: FieldGeometry, 
    rows: number, 
    cols: number,
    squareData: Square[]
  ) => {
    console.log('updateGridSquares called with:', { rows, cols, squareDataLength: squareData.length });
    
    const [minLng, minLat, maxLng, maxLat] = [
      field.geometry.coordinates[0][0][0],
      field.geometry.coordinates[0][0][1],
      field.geometry.coordinates[0][2][0],
      field.geometry.coordinates[0][2][1]
    ];

    const lngStep = (maxLng - minLng) / cols;
    const latStep = (maxLat - minLat) / rows;

    const squares: GridSquareFeature[] = [];

    // Use actual square data to create grid
    squareData.forEach(squareInfo => {
      const { gridX, gridY, position, status, ownerInitials } = squareInfo;
      
      const lng1 = minLng + gridX * lngStep;
      const lng2 = minLng + (gridX + 1) * lngStep;
      // Invert Y coordinates so gridY=0 (row 1) is at the top (maxLat)
      const lat1 = maxLat - (gridY + 1) * latStep;
      const lat2 = maxLat - gridY * latStep;

      squares.push({
        type: 'Feature',
        properties: { 
          square: squareInfo.squareNumber,
          position: position,
          status: status === 'TAKEN' ? 'sold' : 'available',
          ownerInitials: ownerInitials || null
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1]
          ]]
        }
      });
    });

    console.log('Updated squares features:', squares.length);

    // Update the source data without removing/adding layers
    const source = mapInstance.getSource('grid-squares') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: squares
      });
      console.log('Updated grid squares source data');
    }
  }, []);

  useEffect(() => {
    console.log('Map useEffect triggered with:', { center, zoom, gridCols, gridRows, squaresLength: squares.length });
    
    if (map.current) return; // Initialize map only once
    
    if (mapContainer.current) {
      console.log('Creating new Mapbox map...');
      
      // Check if Mapbox token is available
      if (!mapboxgl.accessToken) {
        console.error('Mapbox token not available, cannot initialize map');
        return;
      }
      
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: center,
          zoom: zoom,
          attributionControl: false, // Disable default attribution
          padding: { top: 40, bottom: 40, left: 40, right: 40 } // Add padding for labels
        });
      } catch (error) {
        console.error('Failed to initialize Mapbox map:', error);
        return;
      }

      // Add attribution control at bottom
      map.current.addControl(new mapboxgl.AttributionControl({
        compact: false
      }), 'bottom-right');

      // Add mock field boundary (will be replaced with real coordinates)
      map.current.on('load', () => {
        if (!map.current) return;

        // Real field boundary - calculated from grid configuration
        const { fieldSizeMeters, halfFieldSize } = CALCULATED_VALUES.fieldDimensions;
        const { metersToDegreesLat, metersToDegreesLng } = GAME_CONFIG.field;
        
        const fieldBoundary: FieldGeometry = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [center[0] - halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat],
              [center[0] + halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat],
              [center[0] + halfFieldSize * metersToDegreesLng, center[1] + halfFieldSize * metersToDegreesLat],
              [center[0] - halfFieldSize * metersToDegreesLng, center[1] + halfFieldSize * metersToDegreesLat],
              [center[0] - halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat]
            ]]
          },
          properties: {}
        };

        // Add field boundary
        map.current.addSource('field-boundary', {
          type: 'geojson',
          data: fieldBoundary
        });

        map.current.addLayer({
          id: 'field-boundary',
          type: 'line',
          source: 'field-boundary',
          layout: {},
          paint: {
            'line-color': '#ff0000',
            'line-width': 3
          }
        });

        // Generate and add grid squares
        console.log('Generating grid squares with:', { gridRows, gridCols, squaresLength: squares.length });
        generateGridSquares(map.current, fieldBoundary, gridRows, gridCols, squares);
      });
    }
  }, [center, zoom, gridCols, gridRows, generateGridSquares]);

  // Track previous squares state to detect actual changes
  const prevSquaresRef = useRef<Square[]>([]);
  
  // Separate useEffect to update squares when data actually changes
  useEffect(() => {
    if (!map.current || squares.length === 0) return;
    
    // Check if there are actual changes in square status
    const hasChanges = squares.length !== prevSquaresRef.current.length ||
      squares.some((square, index) => {
        const prevSquare = prevSquaresRef.current[index];
        return !prevSquare || 
               square.status !== prevSquare.status || 
               square.ownerInitials !== prevSquare.ownerInitials;
      });
    
    if (!hasChanges) {
      // No actual changes, just update the reference and skip regeneration
      prevSquaresRef.current = squares;
      return;
    }
    
    console.log('🔄 FieldMap detected actual changes, updating map...', { 
      squaresLength: squares.length,
      takenSquares: squares.filter(s => s.status === 'TAKEN').length 
    });
    
    // Check if map style is loaded before updating
    if (!map.current.isStyleLoaded()) {
      console.log('⏳ Map style not loaded yet, waiting...');
      return;
    }
    
    // Update only the grid squares data without removing/recreating the entire source
    if (map.current.getSource('grid-squares')) {
      // Real field boundary (same as in the main useEffect)
      const { fieldSizeMeters, halfFieldSize } = CALCULATED_VALUES.fieldDimensions;
      const { metersToDegreesLat, metersToDegreesLng } = GAME_CONFIG.field;
      
      const fieldBoundary: FieldGeometry = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [center[0] - halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat],
            [center[0] + halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat],
            [center[0] + halfFieldSize * metersToDegreesLng, center[1] + halfFieldSize * metersToDegreesLat],
            [center[0] - halfFieldSize * metersToDegreesLng, center[1] + halfFieldSize * metersToDegreesLat],
            [center[0] - halfFieldSize * metersToDegreesLng, center[1] - halfFieldSize * metersToDegreesLat]
          ]]
        },
        properties: {}
      };
      
      // Update grid squares data without full regeneration
      console.log('🔄 Updating grid squares data');
      updateGridSquares(map.current, fieldBoundary, gridRows, gridCols, squares);
    }
    
    // Update the reference
    prevSquaresRef.current = squares;
  }, [squares, center, gridRows, gridCols]);

  const addGridLabels = (
    mapInstance: mapboxgl.Map,
    field: FieldGeometry,
    rows: number,
    cols: number
  ) => {
    const [minLng, minLat, maxLng, maxLat] = [
      field.geometry.coordinates[0][0][0],
      field.geometry.coordinates[0][0][1],
      field.geometry.coordinates[0][2][0],
      field.geometry.coordinates[0][2][1]
    ];

    const lngStep = (maxLng - minLng) / cols;
    const latStep = (maxLat - minLat) / rows;
    const labels: GridLabelFeature[] = [];

    // Column labels using centralized configuration
    for (let col = 0; col < cols; col++) {
      const centerLng = minLng + (col + 0.5) * lngStep;
      const topLat = maxLat + latStep * 0.15; // More spacing above the grid for better visibility
      
      labels.push({
        type: 'Feature',
        properties: {
          text: GAME_CONFIG.labels.columns[col],
          type: 'column'
        },
        geometry: {
          type: 'Point',
          coordinates: [centerLng, topLat]
        }
      });
    }

    // Row labels using centralized configuration  
    for (let row = 0; row < rows; row++) {
      const centerLat = maxLat - (row + 0.5) * latStep;
      const leftLng = minLng - lngStep * 0.15; // More spacing to the left of the grid for better visibility
      
      labels.push({
        type: 'Feature',
        properties: {
          text: GAME_CONFIG.labels.rows[row].toString(),
          type: 'row'
        },
        geometry: {
          type: 'Point',
          coordinates: [leftLng, centerLat]
        }
      });
    }

    // Add labels source
    mapInstance.addSource('grid-labels', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: labels
      }
    });

    // Add labels layer
    mapInstance.addLayer({
      id: 'grid-labels',
      type: 'symbol',
      source: 'grid-labels',
      layout: {
        'text-field': ['get', 'text'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 20, // Larger text for better visibility
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#2c3e50', // Darker halo for better contrast
        'text-halo-width': 4 // Wider halo for better readability
      }
    });
  };

  useEffect(() => {
    // Add custom CSS to move Mapbox attribution below the map
    const style = document.createElement('style');
    style.textContent = `
      .mapboxgl-ctrl-bottom-right {
        bottom: -40px !important;
        right: 10px !important;
      }
      .mapboxgl-ctrl-attrib {
        background-color: rgba(255, 255, 255, 0.9) !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 11px !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  console.log('FieldMap rendering with:', { gridCols, gridRows, squares: squares.length });

  return (
    <div className="map-container" style={{ position: 'relative', marginBottom: '50px', maxWidth: '700px', margin: '0 auto' }}>
      <div ref={mapContainer} className="map" style={{ 
        width: '700px',  // Square dimensions
        height: '700px', // Square dimensions
        background: '#f0f0f0', 
        border: '2px solid #ccc',
        borderRadius: '8px',
        margin: '0 auto' // Center the map if container is wider
      }} />
    </div>
  );
};