import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { correiosService } from '../services/correios.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Chave para armazenar o histórico de jobs no AppSettings
const JOB_HISTORY_KEY = 'correios_job_history';
const JOB_LAST_RUN_KEY = 'correios_job_last_run';

// Interface para o histórico de execução
interface JobExecution {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
  pedidosProcessados: number;
  errorMessage?: string;
  duracao?: number; // em segundos
}

/**
 * Gerar código de rastreio para um pedido específico
 */
export const gerarCodigoRastreio = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({ 
        error: 'ID do pedido inválido' 
      });
    }
    
    const result = await orderService.gerarCodigoRastreio(Number(orderId));
    
    return res.json({
      success: true,
      trackingNumber: result.trackingNumber,
      message: 'Código de rastreio gerado com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao gerar código de rastreio:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

/**
 * Processar todos os pedidos pagos sem código de rastreio
 */
export const processarPedidosPagos = async (req: Request, res: Response) => {
  try {
    // Registrar início da execução
    const startTime = new Date();
    const executionId = `job-${Date.now()}`;
    
    // Criar registro de execução em andamento
    const runningExecution: JobExecution = {
      id: executionId,
      timestamp: startTime.toISOString(),
      status: 'running',
      pedidosProcessados: 0
    };
    
    // Salvar registro de execução em andamento
    await saveJobExecution(runningExecution);
    
    // Executar processamento de pedidos
    const result = await orderService.processarPedidosPagos();
    
    // Calcular duração
    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Atualizar registro com sucesso
    const successExecution: JobExecution = {
      ...runningExecution,
      status: 'success',
      pedidosProcessados: result.processados,
      duracao: durationSeconds
    };
    
    // Salvar registro atualizado
    await saveJobExecution(successExecution);
    
    // Atualizar última execução
    await updateLastJobRun({
      lastRun: startTime.toISOString(),
      nextRun: calculateNextRun(),
      status: 'success',
      pedidosProcessados: result.processados
    });
    
    return res.json({
      success: true,
      message: 'Processamento de pedidos pagos iniciado com sucesso',
      processados: result.processados,
      executionId
    });

  } catch (error: any) {
    console.error('Erro ao processar pedidos pagos:', error);
    
    // Se temos um ID de execução em andamento, atualizamos com erro
    try {
      const executionId = `job-${Date.now()}`;
      const errorExecution: JobExecution = {
        id: executionId,
        timestamp: new Date().toISOString(),
        status: 'error',
        pedidosProcessados: 0,
        errorMessage: error.message || 'Erro desconhecido'
      };
      
      await saveJobExecution(errorExecution);
      
      // Atualizar última execução
      await updateLastJobRun({
        lastRun: new Date().toISOString(),
        nextRun: calculateNextRun(),
        status: 'error',
        errorMessage: error.message || 'Erro desconhecido'
      });
    } catch (saveError) {
      console.error('Erro ao salvar registro de erro:', saveError);
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
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
    
  } catch (error: any) {
    console.error('Erro ao testar conexão com Correios:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

/**
 * Verificar status detalhado da integração com os Correios
 */
export const verificarStatusIntegracao = async (req: Request, res: Response) => {
  try {
    // Verificar configuração
    const configValida = correiosService.validateConfig();
    
    // Testar conexão apenas se a configuração for válida
    let conexaoOk = false;
    let tokenValido = false;
    let ultimaAtualizacaoToken = null;
    let detalhesErro = null;
    
    if (configValida) {
      try {
        conexaoOk = await correiosService.testarConexao();
        // Obter informações adicionais do serviço
        const statusToken = await correiosService.getTokenStatus();
        tokenValido = statusToken.valido;
        ultimaAtualizacaoToken = statusToken.ultimaAtualizacao;
      } catch (connError: any) {
        detalhesErro = connError.message || 'Erro desconhecido na conexão';
      }
    }
    
    // Verificar pedidos pendentes
    const pedidosPendentes = await orderService.contarPedidosPagosAguardandoRastreio();
    
    // Obter última execução do job
    const lastJobRun = await getLastJobRun();
    
    return res.json({
      success: true,
      status: {
        configValida,
        conexaoOk,
        tokenValido,
        ultimaAtualizacaoToken,
        pedidosPendentes,
        ambiente: process.env.CORREIOS_AMBIENTE || 'HOMOLOGACAO',
        lastJobRun
      },
      detalhesErro,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao verificar status da integração:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

/**
 * Status público da integração com os Correios (versão limitada)
 */
export const statusPublico = async (_req: Request, res: Response) => {
  try {
    // Verificar apenas se a integração está funcionando
    const configValida = correiosService.validateConfig();
    
    let servicoOperacional = false;
    
    if (configValida) {
      try {
        servicoOperacional = await correiosService.testarConexao();
      } catch (error) {
        servicoOperacional = false;
      }
    }
    
    return res.json({
      success: true,
      servicoOperacional,
      message: servicoOperacional 
        ? 'Serviço de rastreamento operacional' 
        : 'Serviço de rastreamento temporariamente indisponível'
    });
    
  } catch (error) {
    console.error('Erro ao verificar status público:', error);
    return res.status(500).json({
      success: false,
      servicoOperacional: false,
      message: 'Erro ao verificar status do serviço'
    });
  }
};

/**
 * Rastrear um objeto pelos Correios
 */
export const rastrearObjeto = async (req: Request, res: Response) => {
  try {
    const { codigoRastreio } = req.params;
    
    if (!codigoRastreio) {
      return res.status(400).json({ 
        error: 'Código de rastreio não fornecido' 
      });
    }
    
    const resultado = await correiosService.rastrearObjeto(codigoRastreio);
    
    return res.json({
      success: true,
      codigoRastreio,
      rastreamento: resultado
    });
    
  } catch (error: any) {
    console.error('Erro ao rastrear objeto:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

/**
 * Obter histórico de execuções do job de rastreamento
 */
export const obterHistoricoJob = async (_req: Request, res: Response) => {
  try {
    const historico = await getJobHistory();
    
    return res.json({
      success: true,
      historico
    });
    
  } catch (error: any) {
    console.error('Erro ao obter histórico de jobs:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

/**
 * Salvar uma execução no histórico de jobs
 */
async function saveJobExecution(execution: JobExecution): Promise<void> {
  try {
    // Buscar histórico atual
    const setting = await prisma.appSettings.findUnique({
      where: { key: JOB_HISTORY_KEY }
    });
    
    let historico: JobExecution[] = [];
    
    if (setting?.value) {
      try {
        historico = JSON.parse(setting.value);
        if (!Array.isArray(historico)) {
          historico = [];
        }
      } catch (e) {
        console.error('Erro ao fazer parse do histórico:', e);
        historico = [];
      }
    }
    
    // Verificar se já existe uma execução com esse ID
    const existingIndex = historico.findIndex(item => item.id === execution.id);
    
    if (existingIndex >= 0) {
      // Atualizar execução existente
      historico[existingIndex] = execution;
    } else {
      // Adicionar nova execução
      historico = [execution, ...historico].slice(0, 10); // Manter apenas as 10 últimas
    }
    
    // Salvar histórico atualizado
    await prisma.appSettings.upsert({
      where: { key: JOB_HISTORY_KEY },
      update: { value: JSON.stringify(historico) },
      create: {
        key: JOB_HISTORY_KEY,
        value: JSON.stringify(historico),
        category: 'correios',
        description: 'Histórico de execuções do job de rastreamento'
      }
    });
    
  } catch (error) {
    console.error('Erro ao salvar execução de job:', error);
    throw error;
  }
}

/**
 * Obter histórico de execuções do job
 */
async function getJobHistory(): Promise<JobExecution[]> {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: JOB_HISTORY_KEY }
    });
    
    if (!setting?.value) {
      return [];
    }
    
    try {
      const historico = JSON.parse(setting.value);
      return Array.isArray(historico) ? historico : [];
    } catch (e) {
      console.error('Erro ao fazer parse do histórico:', e);
      return [];
    }
    
  } catch (error) {
    console.error('Erro ao obter histórico de jobs:', error);
    return [];
  }
}

/**
 * Atualizar informações da última execução do job
 */
async function updateLastJobRun(data: {
  lastRun: string;
  nextRun: string;
  status: string;
  pedidosProcessados?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await prisma.appSettings.upsert({
      where: { key: JOB_LAST_RUN_KEY },
      update: { value: JSON.stringify(data) },
      create: {
        key: JOB_LAST_RUN_KEY,
        value: JSON.stringify(data),
        category: 'correios',
        description: 'Última execução do job de rastreamento'
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar última execução do job:', error);
    throw error;
  }
}

/**
 * Obter informações da última execução do job
 */
async function getLastJobRun(): Promise<any> {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: JOB_LAST_RUN_KEY }
    });
    
    if (!setting?.value) {
      return null;
    }
    
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      console.error('Erro ao fazer parse da última execução:', e);
      return null;
    }
    
  } catch (error) {
    console.error('Erro ao obter última execução do job:', error);
    return null;
  }
}

/**
 * Calcular próxima execução programada (30 minutos após a atual)
 */
function calculateNextRun(): string {
  const nextRun = new Date();
  nextRun.setMinutes(nextRun.getMinutes() + 30);
  return nextRun.toISOString();
} 