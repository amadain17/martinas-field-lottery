import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Event, Square, PaymentCredit } from '../services/api';
import { apiService } from '../services/api';

interface GameState {
  // Current event
  currentEvent: Event | null;
  squares: Square[];
  
  // Payment state
  paymentCredit: PaymentCredit | null;
  selectedSquareId: string | null;
  
  // UI state
  showPaymentModal: boolean;
  showSquareSelection: boolean;
  loading: boolean;
  error: string | null;
  
  // Socket connection
  socket: Socket | null;
  
  // Actions
  loadEvent: (eventId: string) => Promise<void>;
  loadSquares: (eventId: string) => Promise<void>;
  createPaymentIntent: (customerName: string, customerEmail: string, customerPhone?: string) => Promise<void>;
  loadPaymentCredit: (creditId: string) => Promise<void>;
  selectSquare: (squareId: string) => Promise<void>;
  setSelectedSquare: (squareId: string | null) => void;
  setShowPaymentModal: (show: boolean) => void;
  setShowSquareSelection: (show: boolean) => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
  initializeSocket: () => void;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentEvent: null,
  squares: [],
  paymentCredit: null,
  selectedSquareId: null,
  showPaymentModal: false,
  showSquareSelection: false,
  loading: false,
  error: null,
  socket: null,

  // Actions
  loadEvent: async (eventId: string) => {
    console.log(`📡 loadEvent called with eventId: ${eventId}`);
    set({ loading: true, error: null });
    try {
      console.log(`🌐 Making API call to getEvent(${eventId})`);
      const { event } = await apiService.getEvent(eventId);
      console.log(`✅ Received event data:`, event);
      // Calculate totalSquares based on gridCols/gridRows
      const eventWithCalculatedTotal = {
        ...event,
        totalSquares: event.totalSquares || (event.gridCols * event.gridRows)
      };
      console.log(`📝 Setting event in store:`, eventWithCalculatedTotal);
      set({ currentEvent: eventWithCalculatedTotal, loading: false });
    } catch (error) {
      console.error(`❌ loadEvent failed:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to load event', loading: false });
    }
  },

  loadSquares: async (eventId: string) => {
    console.log(`📡 loadSquares called with eventId: ${eventId}`);
    const currentState = get();
    console.log(`📊 Current squares count before API call:`, currentState.squares.length);
    console.log(`🔍 Current TAKEN squares:`, currentState.squares.filter(s => s.status === 'TAKEN').map(s => ({ id: s.id, number: s.position, owner: s.ownerInitials })));
    
    set({ loading: true, error: null });
    try {
      console.log(`🌐 Making API call to getEventSquares(${eventId})`);
      const { squares } = await apiService.getEventSquares(eventId);
      console.log(`✅ Received squares data:`, squares?.length, 'squares');
      console.log(`🔍 Received TAKEN squares:`, squares?.filter(s => s.status === 'TAKEN').map(s => ({ id: s.id, number: s.position, owner: s.ownerInitials })));
      
      // Check if there are any differences
      const currentTakenIds = new Set(currentState.squares.filter(s => s.status === 'TAKEN').map(s => s.id));
      const newTakenIds = new Set(squares?.filter(s => s.status === 'TAKEN').map(s => s.id) || []);
      const hasChanges = currentTakenIds.size !== newTakenIds.size || 
                        [...currentTakenIds].some(id => !newTakenIds.has(id)) || 
                        [...newTakenIds].some(id => !currentTakenIds.has(id));
      
      console.log(`🔄 State change detected:`, hasChanges);
      console.log(`📈 TAKEN squares: ${currentTakenIds.size} → ${newTakenIds.size}`);
      
      set({ squares, loading: false });
      
      // Log state after update
      const newState = get();
      console.log(`📊 State updated - new squares count:`, newState.squares.length);
      console.log(`🔍 New TAKEN squares in state:`, newState.squares.filter(s => s.status === 'TAKEN').map(s => ({ id: s.id, number: s.position, owner: s.ownerInitials })));
      
    } catch (error) {
      console.error(`❌ loadSquares failed:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to load squares', loading: false });
    }
  },

  createPaymentIntent: async (customerName: string, customerEmail: string, customerPhone?: string) => {
    const { currentEvent, selectedSquareId } = get();
    console.log('🎯 createPaymentIntent called with selectedSquareId:', selectedSquareId);
    
    if (!currentEvent) {
      set({ error: 'No event selected' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await apiService.createPaymentIntent({
        eventId: currentEvent.id,
        customerName,
        customerEmail,
        customerPhone,
      });

      // Store payment credit info
      const paymentCredit: PaymentCredit = {
        id: response.creditId,
        status: 'PENDING',
        amount: response.amount,
        expiresAt: response.expiresAt,
        customerName,
        canSelectSquare: false, // Will be true after payment confirmation
      };

      // const currentState = get();
      // const hasPreSelectedSquare = currentState.selectedSquareId !== null;

      set({ 
        paymentCredit,
        showPaymentModal: false,
        showSquareSelection: true, // Show square selection modal immediately after payment creation
        loading: false 
      });

    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create payment', loading: false });
    }
  },

  loadPaymentCredit: async (creditId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payment/credit/${creditId}`);
      
      if (!response.ok) {
        throw new Error('Payment credit not found or invalid');
      }
      
      const data = await response.json();
      
      // Create PaymentCredit object from the response
      const paymentCredit: PaymentCredit = {
        id: data.id,
        status: data.status,
        amount: data.amount,
        expiresAt: data.expiresAt,
        customerName: data.customerName,
        canSelectSquare: data.status === 'CONFIRMED'
      };
      
      set({ 
        paymentCredit,
        showSquareSelection: data.status === 'CONFIRMED',
        loading: false 
      });
      
      if (data.status === 'CONFIRMED') {
        alert(`✅ Payment credit loaded! You can now select your square.\nCustomer: ${data.customerName}\nAmount: €${data.amount}`);
      } else {
        alert(`⚠️ Payment credit found but status is: ${data.status}\nPlease contact admin if this seems wrong.`);
      }
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load payment credit', loading: false });
    }
  },

  selectSquare: async (squareId: string) => {
    const { paymentCredit } = get();
    if (!paymentCredit) {
      set({ error: 'No payment credit available' });
      return;
    }

    set({ loading: true, error: null });
    try {
      // First, confirm the payment if it's still pending
      if (paymentCredit.status === 'PENDING') {
        console.log('Confirming payment for credit:', paymentCredit.id);
        const confirmResponse = await fetch(`${import.meta.env.VITE_API_URL}/payment/revolut/confirm/${paymentCredit.id}`, {
          method: 'POST'
        });

        console.log('Payment confirmation response:', confirmResponse.status, confirmResponse.ok);

        if (confirmResponse.ok) {
          const confirmData = await confirmResponse.json();
          console.log('Payment confirmation data:', confirmData);

          if (!confirmData.success) {
            console.log('Payment confirmation failed:', confirmData.error || 'Unknown error');
            set({ error: 'Payment confirmation failed', loading: false });
            return;
          }
          
          // Update the payment credit status
          const updatedCredit = {
            ...paymentCredit,
            status: 'CONFIRMED' as const,
            canSelectSquare: true
          };
          
          set({ paymentCredit: updatedCredit });
          console.log('Payment confirmed, proceeding with square selection');
        } else {
          console.log('Payment confirmation request failed with status:', confirmResponse.status);
          set({ error: 'Payment confirmation failed', loading: false });
          return;
        }
      }

      // Now select the square
      const response = await apiService.selectSquare(paymentCredit.id, squareId);
      console.log('Square selection API response:', response);
      
      // Get the selected square details for UI update
      const currentState = get();
      const selectedSquare = currentState.squares.find(square => square.id === squareId);
      console.log('Selected square details:', selectedSquare);
      
      if (selectedSquare) {
        // Update the square in the local state
        set(state => ({
          squares: state.squares.map(square => 
            square.id === squareId 
              ? { 
                  ...square, 
                  status: 'TAKEN' as const, 
                  ownerInitials: paymentCredit.customerName.split(' ').map(n => n[0]).join('').substring(0, 3)
                }
              : square
          ),
          paymentCredit: { ...paymentCredit, status: 'USED' },
          selectedSquareId: null,
          showSquareSelection: false,
          loading: false
        }));
        
        console.log('✅ Square selection completed successfully');
        alert(`Success! Square ${selectedSquare.position} is yours! Confirmation code: ${response.confirmationCode}`);
      } else {
        console.error('Selected square not found in current state');
        set({ error: 'Square not found in current state', loading: false });
      }

    } catch (error) {
      console.error('Square selection failed:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to select square', loading: false });
    }
  },

  setSelectedSquare: (squareId: string | null) => {
    set({ selectedSquareId: squareId });
  },

  setShowPaymentModal: (show: boolean) => {
    set({ showPaymentModal: show });
  },

  setShowSquareSelection: (show: boolean) => {
    set({ showSquareSelection: show });
  },

  connectSocket: () => {
    // Prevent multiple connections
    const currentState = get();
    if (currentState.socket?.connected) {
      console.log('⚠️ Socket already connected, skipping new connection');
      return;
    }
    
    // Disconnect any existing socket first
    if (currentState.socket) {
      console.log('🔄 Disconnecting existing socket before creating new one');
      currentState.socket.disconnect();
    }
    
    console.log('🔌 Attempting to connect socket to http://localhost:3001');
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      console.log('✅ Socket connected to server, ID:', socket.id);
    });

    socket.on('squareSelected', (data: {
      eventId: string;
      squareId: string;
      squareNumber: number;
      ownerInitials: string;
      selectedAt: string;
    }) => {
      console.log('🔔 Frontend received squareSelected event:', data);
      // Update the square in real-time
      set(state => {
        console.log('🔄 Updating square in state:', data.squareId, '→ TAKEN');
        const updatedSquares = state.squares.map(square => 
          square.id === data.squareId 
            ? { 
                ...square, 
                status: 'TAKEN' as const, 
                ownerInitials: data.ownerInitials,
                selectedAt: data.selectedAt
              }
            : square
        );
        console.log('📊 Updated squares count:', updatedSquares.filter(s => s.status === 'TAKEN').length);
        return { squares: updatedSquares };
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
    });

    // Debug: Listen for ALL events
    socket.onAny((eventName, ...args) => {
      if (eventName !== 'connect' && eventName !== 'disconnect') {
        console.log('🎯 Received socket event:', eventName, args);
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log('🔌 Manually disconnecting socket:', socket.id);
      socket.disconnect();
      set({ socket: null });
    }
  },

  initializeSocket: () => {
    get().connectSocket();
  },

  // Initialize data - load demo event and squares
  initialize: async () => {
    console.log('🔧 Starting gameStore initialization...');
    console.log('🔗 API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
    const { loadEvent, loadSquares } = get();
    try {
      console.log('📡 Loading event demo-event-1...');
      await loadEvent('demo-event-1');
      console.log('📡 Loading squares for demo-event-1...');
      await loadSquares('demo-event-1');
      console.log('✅ gameStore initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize data:', error);
      console.error('❌ Error details:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to initialize data' });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));