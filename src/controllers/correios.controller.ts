import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { correiosService } from '../services/correios.service';

/**
 * Gerar código de rastreio para um pedido
 */
export const gerarCodigoRastreio = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({ 
        error: 'ID do pedido inválido' 
      });
    }

    const codigoRastreio = await orderService.gerarCodigoRastreio(Number(orderId));
    
    if (!codigoRastreio) {
      return res.status(400).json({ 
        error: 'Não foi possível gerar código de rastreio. Verifique se o pedido está pago e se a configuração dos Correios está correta.' 
      });
    }

    return res.json({
      success: true,
      orderId: Number(orderId),
      trackingNumber: codigoRastreio,
      message: 'Código de rastreio gerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerar código de rastreio:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

/**
 * Processar todos os pedidos pagos sem código de rastreio
 */
export const processarPedidosPagos = async (req: Request, res: Response) => {
  try {
    await orderService.processarPedidosPagos();
    
    return res.json({
      success: true,
      message: 'Processamento de pedidos pagos iniciado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar pedidos pagos:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

/**
 * Testar conexão com API dos Correios
 */
export const testarConexao = async (req: Request, res: Response) => {
  try {
    const isValid = correiosService.validateConfig();
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Configuração dos Correios incompleta',
        message: 'Verifique se todas as variáveis de ambiente dos Correios estão configuradas'
      });
    }

    const conexaoOk = await correiosService.testarConexao();
    
    if (!conexaoOk) {
      return res.status(400).json({
        success: false,
        error: 'Falha na conexão com a API dos Correios',
        message: 'Verifique suas credenciais e tente novamente'
      });
    }

    return res.json({
      success: true,
      message: 'Conexão com API dos Correios estabelecida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao testar conexão com Correios:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

/**
 * Rastrear objeto pelos Correios
 */
export const rastrearObjeto = async (req: Request, res: Response) => {
  try {
    const { codigoRastreio } = req.params;
    
    if (!codigoRastreio || codigoRastreio.length < 13) {
      return res.status(400).json({ 
        error: 'Código de rastreio inválido' 
      });
    }

    const rastreamento = await correiosService.rastrearObjeto(codigoRastreio);
    
    if (!rastreamento) {
      return res.status(404).json({ 
        error: 'Código de rastreio não encontrado ou inválido' 
      });
    }

    return res.json({
      success: true,
      codigoRastreio,
      rastreamento
    });

  } catch (error) {
    console.error('Erro ao rastrear objeto:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}; 