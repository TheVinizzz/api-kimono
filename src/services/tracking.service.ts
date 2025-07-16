import { PrismaClient, OrderStatus } from '@prisma/client';
import { CorreiosService } from './correios.service';
import { webSocketService } from './websocket.service';
import { StatusRastreamento, CorreiosRastreamentoEvento } from '../types/correios.types';

const prisma = new PrismaClient();
const correiosService = new CorreiosService();

export interface TrackingUpdate {
  orderId: number;
  trackingNumber: string;
  status: string;
  location?: string;
  description: string;
  timestamp: Date;
  isDelivered: boolean;
  hasNewEvents: boolean;
}

export interface TrackingJob {
  id: string;
  status: 'running' | 'stopped' | 'error';
  lastRun?: Date;
  nextRun?: Date;
  ordersProcessed: number;
  errors: string[];
}

export class TrackingService {
  private static instance: TrackingService;
  private trackingJob: TrackingJob | null = null;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): TrackingService {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
    }
    return TrackingService.instance;
  }

  /**
   * Inicia o serviço automático de rastreamento
   */
  async startAutomaticTracking(intervalMinutes: number = 60): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Serviço de rastreamento já está em execução');
      return;
    }

    console.log(`🚀 Iniciando serviço automático de rastreamento (intervalo: ${intervalMinutes} minutos)`);
    
    this.isRunning = true;
    this.trackingJob = {
      id: `tracking-job-${Date.now()}`,
      status: 'running',
      lastRun: undefined,
      nextRun: new Date(Date.now() + intervalMinutes * 60 * 1000),
      ordersProcessed: 0,
      errors: []
    };

    // Executar primeira verificação imediatamente
    await this.processTrackingUpdates();

    // Configurar execução periódica
    this.intervalId = setInterval(async () => {
      await this.processTrackingUpdates();
    }, intervalMinutes * 60 * 1000);

    console.log('✅ Serviço automático de rastreamento iniciado com sucesso');
  }

  /**
   * Para o serviço automático de rastreamento
   */
  stopAutomaticTracking(): void {
    if (!this.isRunning) {
      console.log('⚠️ Serviço de rastreamento não está em execução');
      return;
    }

    console.log('🛑 Parando serviço automático de rastreamento...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.trackingJob) {
      this.trackingJob.status = 'stopped';
    }

    console.log('✅ Serviço automático de rastreamento parado');
  }

  /**
   * Processa atualizações de rastreamento para todos os pedidos pendentes
   */
  async processTrackingUpdates(): Promise<void> {
    if (!this.trackingJob) {
      console.error('❌ Job de rastreamento não está configurado');
      return;
    }

    try {
      console.log('🔄 Processando atualizações de rastreamento...');
      
      this.trackingJob.lastRun = new Date();
      this.trackingJob.ordersProcessed = 0;
      this.trackingJob.errors = [];

      // Buscar pedidos que têm código de rastreamento mas ainda não foram entregues
      const pedidosPendentes = await prisma.order.findMany({
        where: {
          trackingNumber: {
            not: null
          },
          NOT: {
            trackingNumber: ''
          },
          status: {
            notIn: ['DELIVERED', 'CANCELED']
          }
        },
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          customerEmail: true,
          customerName: true
        }
      });

      console.log(`📦 Encontrados ${pedidosPendentes.length} pedidos para verificar`);

      if (pedidosPendentes.length === 0) {
        console.log('✅ Nenhum pedido pendente para rastreamento');
        return;
      }

      // Extrair códigos de rastreamento únicos
      const codigosRastreio = pedidosPendentes
        .map(p => p.trackingNumber!)
        .filter((codigo, index, array) => array.indexOf(codigo) === index);

      // Rastrear todos os códigos de uma vez
      const resultadosRastreamento = await correiosService.rastrearMultiplosObjetos(codigosRastreio);

      // Processar cada pedido
      for (const pedido of pedidosPendentes) {
        try {
          const rastreamento = resultadosRastreamento[pedido.trackingNumber!];
          
          if (rastreamento && rastreamento.eventos && rastreamento.eventos.length > 0) {
            const update = await this.processOrderTracking(pedido.id, pedido.trackingNumber!, rastreamento.eventos);
            
                         if (update.hasNewEvents) {
               // Enviar notificação via WebSocket
               webSocketService.notifyOrderUpdated({
                 id: pedido.id,
                 status: update.status,
                 trackingUpdate: update
               });
               
               console.log(`📨 Atualização enviada para pedido ${pedido.id}: ${update.status}`);
             }
          }

          this.trackingJob.ordersProcessed++;
          
        } catch (error: any) {
          const errorMsg = `Erro ao processar pedido ${pedido.id}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          this.trackingJob.errors.push(errorMsg);
        }
      }

      this.trackingJob.nextRun = new Date(Date.now() + 60 * 60 * 1000); // Próxima execução em 1 hora
      
      console.log(`✅ Processamento concluído: ${this.trackingJob.ordersProcessed} pedidos processados, ${this.trackingJob.errors.length} erros`);

    } catch (error: any) {
      console.error('❌ Erro no processamento de rastreamento:', error.message);
      this.trackingJob.status = 'error';
      this.trackingJob.errors.push(`Erro geral: ${error.message}`);
    }
  }

  /**
   * Processa o rastreamento de um pedido específico
   */
  async processOrderTracking(orderId: number, trackingNumber: string, eventos: CorreiosRastreamentoEvento[]): Promise<TrackingUpdate> {
    try {
      // Buscar último evento registrado no banco
      const ultimoEvento = await prisma.shipmentUpdate.findFirst({
        where: { orderId },
        orderBy: { timestamp: 'desc' }
      });

      // Ordenar eventos por data/hora (mais recente primeiro)
      const eventosOrdenados = eventos.sort((a, b) => {
        const dataHoraA = new Date(`${a.data} ${a.hora}`);
        const dataHoraB = new Date(`${b.data} ${b.hora}`);
        return dataHoraB.getTime() - dataHoraA.getTime();
      });

      const eventoMaisRecente = eventosOrdenados[0];
      const dataHoraEvento = new Date(`${eventoMaisRecente.data} ${eventoMaisRecente.hora}`);

      let hasNewEvents = false;
      let isDelivered = false;

      // Verificar se há novos eventos
      if (!ultimoEvento || dataHoraEvento > ultimoEvento.timestamp) {
        hasNewEvents = true;

        // Salvar novos eventos no banco
        for (const evento of eventosOrdenados) {
          const dataHora = new Date(`${evento.data} ${evento.hora}`);
          
          // Verificar se este evento já existe
          const eventoExiste = await prisma.shipmentUpdate.findFirst({
            where: {
              orderId,
              timestamp: dataHora,
              description: evento.descricao
            }
          });

          if (!eventoExiste) {
            await prisma.shipmentUpdate.create({
              data: {
                orderId,
                status: evento.codigo,
                location: evento.local,
                description: evento.descricao,
                timestamp: dataHora
              }
            });
          }
        }

        // Determinar se o pedido foi entregue
        isDelivered = this.isDeliveredStatus(eventoMaisRecente.codigo, eventoMaisRecente.descricao);

        // Atualizar status do pedido se necessário
        const novoStatus = this.mapCorreiosStatusToOrderStatus(eventoMaisRecente.codigo, eventoMaisRecente.descricao);
        
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: novoStatus,
            currentLocation: eventoMaisRecente.local,
            updatedAt: new Date()
          }
        });

        console.log(`📋 Pedido ${orderId} atualizado: ${novoStatus} - ${eventoMaisRecente.descricao}`);
      }

      return {
        orderId,
        trackingNumber,
        status: eventoMaisRecente.descricao,
        location: eventoMaisRecente.local,
        description: eventoMaisRecente.descricao,
        timestamp: dataHoraEvento,
        isDelivered,
        hasNewEvents
      };

    } catch (error: any) {
      console.error(`❌ Erro ao processar rastreamento do pedido ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Mapeia códigos dos Correios para status do pedido
   */
  private mapCorreiosStatusToOrderStatus(codigo: string, descricao: string): OrderStatus {
    const descricaoLower = descricao.toLowerCase();
    
    if (descricaoLower.includes('entregue') || codigo === 'BDE' || codigo === 'BDI') {
      return 'DELIVERED';
    }
    
    if (descricaoLower.includes('saiu para entrega') || descricaoLower.includes('out for delivery')) {
      return 'OUT_FOR_DELIVERY';
    }
    
    if (descricaoLower.includes('em trânsito') || descricaoLower.includes('em transito') || 
        descricaoLower.includes('encaminhado') || codigo === 'DO' || codigo === 'RO') {
      return 'IN_TRANSIT';
    }
    
    if (descricaoLower.includes('postado') || descricaoLower.includes('postagem') || codigo === 'PO') {
      return 'SHIPPED';
    }
    
    return 'PROCESSING';
  }

  /**
   * Verifica se o status indica entrega
   */
  private isDeliveredStatus(codigo: string, descricao: string): boolean {
    const descricaoLower = descricao.toLowerCase();
    return descricaoLower.includes('entregue') || codigo === 'BDE' || codigo === 'BDI';
  }

  /**
   * Obtém o status atual do job de rastreamento
   */
  getTrackingJobStatus(): TrackingJob | null {
    return this.trackingJob;
  }

  /**
   * Força a atualização de um pedido específico
   */
  async forceTrackingUpdate(orderId: number): Promise<TrackingUpdate | null> {
    try {
      const pedido = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          trackingNumber: true,
          status: true
        }
      });

      if (!pedido || !pedido.trackingNumber) {
        throw new Error('Pedido não encontrado ou sem código de rastreamento');
      }

      console.log(`🔍 Forçando atualização do pedido ${orderId}`);

      const rastreamento = await correiosService.rastrearObjeto(pedido.trackingNumber);
      
      if (rastreamento && rastreamento.eventos && rastreamento.eventos.length > 0) {
        const update = await this.processOrderTracking(orderId, pedido.trackingNumber, rastreamento.eventos);
        
                 // Enviar notificação via WebSocket
         webSocketService.notifyOrderUpdated({
           id: orderId,
           status: update.status,
           trackingUpdate: update
         });
        
        return update;
      }

      return null;

    } catch (error: any) {
      console.error(`❌ Erro ao forçar atualização do pedido ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtém histórico de rastreamento de um pedido
   */
  async getTrackingHistory(orderId: number): Promise<any[]> {
    try {
      const eventos = await prisma.shipmentUpdate.findMany({
        where: { orderId },
        orderBy: { timestamp: 'desc' }
      });

      return eventos.map(evento => ({
        id: evento.id,
        status: evento.status,
        location: evento.location,
        description: evento.description,
        timestamp: evento.timestamp,
        formattedDate: evento.timestamp.toLocaleDateString('pt-BR'),
        formattedTime: evento.timestamp.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));

    } catch (error: any) {
      console.error(`❌ Erro ao buscar histórico do pedido ${orderId}:`, error.message);
      throw error;
    }
  }
}

export const trackingService = TrackingService.getInstance(); 