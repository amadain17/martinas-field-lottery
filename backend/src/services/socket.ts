import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketInstance(io: Server): void {
  ioInstance = io;
}

export function getSocketInstance(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io instance not initialized');
  }
  return ioInstance;
}

export function emitSquareSelected(data: {
  eventId: string;
  squareId: string;
  squareNumber: number;
  ownerInitials: string;
  selectedAt: string;
}): void {
  if (ioInstance) {
    console.log('🔔 Emitting squareSelected event to all clients:', data);
    console.log(`📊 Currently connected clients: ${ioInstance.sockets.sockets.size}`);
    ioInstance.emit('squareSelected', data);
    console.log('✅ Event emitted successfully');
  } else {
    console.log('❌ No socket instance available for emitting squareSelected');
  }
}