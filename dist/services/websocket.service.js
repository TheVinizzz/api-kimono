"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = void 0;
const ws_1 = require("ws");
const url_1 = __importDefault(require("url"));
class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.pingInterval = null;
    }
    init(server) {
        this.wss = new ws_1.WebSocketServer({
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
    verifyClient(info) {
        try {
            const parsedUrl = url_1.default.parse(info.req.url || '', true);
            const token = parsedUrl.query.token;
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
        }
        catch (error) {
            console.error('Erro ao verificar cliente WebSocket:', error);
            return false;
        }
    }
    handleConnection(ws, req) {
        console.log('🔌 Nova conexão WebSocket estabelecida');
        try {
            const parsedUrl = url_1.default.parse(req.url || '', true);
            const token = parsedUrl.query.token;
            // Configurar cliente
            if (token && token.startsWith('admin_')) {
                ws.isAuthenticated = true;
                ws.userRole = 'admin';
                console.log('🔐 Cliente autenticado como admin');
            }
            else {
                ws.isAuthenticated = false;
                ws.userRole = 'guest';
            }
            this.clients.add(ws);
            // Configurar handlers
            ws.on('message', (data) => {
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
        }
        catch (error) {
            console.error('Erro ao configurar conexão WebSocket:', error);
            ws.close();
        }
    }
    handleMessage(ws, data) {
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
        }
        catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
        }
    }
    sendToClient(ws, message) {
        try {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
        catch (error) {
            console.error('Erro ao enviar mensagem para cliente:', error);
        }
    }
    ping() {
        this.clients.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    ws.ping();
                }
                catch (error) {
                    console.error('Erro ao enviar ping:', error);
                    this.clients.delete(ws);
                }
            }
            else {
                this.clients.delete(ws);
            }
        });
    }
    // Métodos públicos para notificações
    notifyOrderCreated(orderData) {
        const message = {
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
    notifyOrderUpdated(orderData) {
        const message = {
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
    notifyOrderPaid(orderData) {
        const message = {
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
    notifyOrderStatusChanged(orderData, oldStatus) {
        const message = {
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
    broadcastToAdmins(message) {
        this.clients.forEach((ws) => {
            if (ws.isAuthenticated && ws.userRole === 'admin' && ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendToClient(ws, message);
            }
        });
    }
    broadcast(message) {
        this.clients.forEach((ws) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendToClient(ws, message);
            }
        });
    }
    getActiveConnections() {
        return this.clients.size;
    }
    getAuthenticatedConnections() {
        let count = 0;
        this.clients.forEach((ws) => {
            if (ws.isAuthenticated)
                count++;
        });
        return count;
    }
    destroy() {
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
exports.webSocketService = new WebSocketService();
exports.default = exports.webSocketService;
