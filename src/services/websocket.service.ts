import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import url from 'url';

export interface WebSocketMessage {
  type: 'order_created' | 'order_updated' | 'order_paid' | 'order_status_changed' | 'ping';
  data?: any;
  timestamp: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  isAuthenticated?: boolean;
  userId?: number;
  userRole?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedWebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  public init(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Ping interval para manter conexões vivas
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000); // 30 segundos

    console.log('🔌 WebSocket Server inicializado em /ws');
  }

  private verifyClient(info: { req: IncomingMessage }): boolean {
    try {
      const parsedUrl = url.parse(info.req.url || '', true);
      const token = parsedUrl.query.token as string;
      
      // Em produção, você deve validar o token JWT aqui
      // Por simplicidade, vamos aceitar qualquer token para o admin
      if (token && token.startsWith('admin_')) {
        return true;
      }
      
      // Permitir conexões sem token para desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar cliente WebSocket:', error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): void {
    console.log('🔌 Nova conexão WebSocket estabelecida');
    
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const token = parsedUrl.query.token as string;
      
      // Configurar cliente
      if (token && token.startsWith('admin_')) {
        ws.isAuthenticated = true;
        ws.userRole = 'admin';
        console.log('🔐 Cliente autenticado como admin');
      } else {
        ws.isAuthenticated = false;
        ws.userRole = 'guest';
      }

      this.clients.add(ws);

      // Configurar handlers
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        console.log('🔌 Conexão WebSocket fechada');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Erro WebSocket:', error);
        this.clients.delete(ws);
      });

      // Enviar pong para mensagens de ping
      ws.on('ping', () => {
        ws.pong();
      });

    } catch (error) {
      console.error('Erro ao configurar conexão WebSocket:', error);
      ws.close();
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Mensagem WebSocket recebida:', message);

      // Responder a pings
      if (message.type === 'ping') {
        this.sendToClient(ws, {
          type: 'ping',
          data: { message: 'pong' },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem para cliente:', error);
    }
  }

  private ping(): void {
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error('Erro ao enviar ping:', error);
          this.clients.delete(ws);
        }
      } else {
        this.clients.delete(ws);
      }
    });
  }

  // Métodos públicos para notificações
  public notifyOrderCreated(orderData: any): void {
    const message: WebSocketMessage = {
      type: 'order_created',
      data: {
        orderId: orderData.id,
        customerName: orderData.customerName,
        total: orderData.total,
        status: orderData.status,
        createdAt: orderData.createdAt
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToAdmins(message);
    console.log('🔔 Notificação enviada: Novo pedido criado #' + orderData.id);
  }

  public notifyOrderUpdated(orderData: any): void {
    const message: WebSocketMessage = {
      type: 'order_updated',
      data: {
        orderId: orderData.id,
        status: orderData.status,
        total: orderData.total,
        updatedAt: orderData.updatedAt
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToAdmins(message);
    console.log('🔔 Notificação enviada: Pedido atualizado #' + orderData.id);
  }

  public notifyOrderPaid(orderData: any): void {
    const message: WebSocketMessage = {
      type: 'order_paid',
      data: {
        orderId: orderData.id,
        customerName: orderData.customerName,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paidAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToAdmins(message);
    console.log('🔔 Notificação enviada: Pedido pago #' + orderData.id);
  }

  public notifyOrderStatusChanged(orderData: any, oldStatus: string): void {
    const message: WebSocketMessage = {
      type: 'order_status_changed',
      data: {
        orderId: orderData.id,
        oldStatus,
        newStatus: orderData.status,
        customerName: orderData.customerName,
        changedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.broadcastToAdmins(message);
    console.log(`🔔 Notificação enviada: Status do pedido #${orderData.id} alterado de ${oldStatus} para ${orderData.status}`);
  }

  private broadcastToAdmins(message: WebSocketMessage): void {
    this.clients.forEach((ws) => {
      if (ws.isAuthenticated && ws.userRole === 'admin' && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
      }
    });
  }

  public broadcast(message: WebSocketMessage): void {
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
      }
    });
  }

  public getActiveConnections(): number {
    return this.clients.size;
  }

  public getAuthenticatedConnections(): number {
    let count = 0;
    this.clients.forEach((ws) => {
      if (ws.isAuthenticated) count++;
    });
    return count;
  }

  public destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((ws) => {
      ws.close();
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('🔌 WebSocket Service destruído');
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService; 