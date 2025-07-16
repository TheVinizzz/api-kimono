import { Request, Response } from 'express';
import { trackingService } from '../services/tracking.service';
import { correiosService } from '../services/correios.service';

export class TrackingController {
  
  /**
   * Inicia o serviço automático de rastreamento
   */
  async startAutomaticTracking(req: Request, res: Response): Promise<void> {
    try {
      const { intervalMinutes = 60 } = req.body;
      
      await trackingService.startAutomaticTracking(intervalMinutes);
      
      res.json({
        success: true,
        message: 'Serviço automático de rastreamento iniciado',
        interval: intervalMinutes
      });
    } catch (error: any) {
      console.error('Erro ao iniciar rastreamento automático:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Para o serviço automático de rastreamento
   */
  async stopAutomaticTracking(req: Request, res: Response): Promise<void> {
    try {
      trackingService.stopAutomaticTracking();
      
      res.json({
        success: true,
        message: 'Serviço automático de rastreamento parado'
      });
    } catch (error: any) {
      console.error('Erro ao parar rastreamento automático:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém o status do job de rastreamento
   */
  async getTrackingJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = trackingService.getTrackingJobStatus();
      
      res.json({
        success: true,
        job: status
      });
    } catch (error: any) {
      console.error('Erro ao obter status do job:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Força a atualização de rastreamento para um pedido específico
   */
  async forceTrackingUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const orderIdNum = parseInt(orderId);
      
      if (!orderIdNum || orderIdNum <= 0) {
        res.status(400).json({
          success: false,
          error: 'ID do pedido inválido'
        });
        return;
      }

      const update = await trackingService.forceTrackingUpdate(orderIdNum);
      
      if (update) {
        res.json({
          success: true,
          message: 'Rastreamento atualizado com sucesso',
          update
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Nenhuma atualização disponível para este pedido'
        });
      }
    } catch (error: any) {
      console.error('Erro ao forçar atualização:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém o histórico de rastreamento de um pedido
   */
  async getTrackingHistory(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const orderIdNum = parseInt(orderId);
      
      if (!orderIdNum || orderIdNum <= 0) {
        res.status(400).json({
          success: false,
          error: 'ID do pedido inválido'
        });
        return;
      }

      const history = await trackingService.getTrackingHistory(orderIdNum);
      
      res.json({
        success: true,
        orderId: orderIdNum,
        history,
        count: history.length
      });
    } catch (error: any) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Rastreia um código específico diretamente na API dos Correios
   */
  async trackCode(req: Request, res: Response): Promise<void> {
    try {
      const { trackingCode } = req.params;
      
      if (!trackingCode || trackingCode.length < 13) {
        res.status(400).json({
          success: false,
          error: 'Código de rastreamento inválido'
        });
        return;
      }

      const tracking = await correiosService.rastrearObjeto(trackingCode);
      
      if (tracking) {
        res.json({
          success: true,
          trackingCode,
          tracking
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Código de rastreamento não encontrado'
        });
      }
    } catch (error: any) {
      console.error('Erro ao rastrear código:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Processa atualizações de rastreamento manualmente
   */
  async processTrackingUpdates(req: Request, res: Response): Promise<void> {
    try {
      await trackingService.processTrackingUpdates();
      
      const status = trackingService.getTrackingJobStatus();
      
      res.json({
        success: true,
        message: 'Processamento de rastreamento executado com sucesso',
        job: status
      });
    } catch (error: any) {
      console.error('Erro ao processar atualizações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * Obtém estatísticas de rastreamento
   */
  async getTrackingStats(req: Request, res: Response): Promise<void> {
    try {
      // Aqui você pode implementar estatísticas específicas
      // Por exemplo: pedidos por status, tempo médio de entrega, etc.
      
      res.json({
        success: true,
        message: 'Estatísticas de rastreamento não implementadas ainda',
        stats: {
          // Implementar estatísticas aqui
        }
      });
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

export const trackingController = new TrackingController(); 