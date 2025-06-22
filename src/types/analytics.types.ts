// Tipos para o objeto PageVisit
export interface PageVisit {
  id: number;
  url: string;
  path: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  userId?: number;
  sessionId?: string;
  timestamp: Date;
  deviceType?: string;
  browserName?: string;
  operatingSystem?: string;
  country?: string;
  city?: string;
}

// Estatísticas de contagem
export interface CountStat {
  _count: {
    id: number;
  };
}

// Tipo para estatísticas de páginas visitadas
export interface PageVisitStat extends CountStat {
  path: string;
}

// Tipo para estatísticas de dispositivos
export interface DeviceTypeStat extends CountStat {
  deviceType: string;
}

// Tipo para estatísticas de navegadores
export interface BrowserStat extends CountStat {
  browserName: string;
}

// Tipo para estatísticas de sistemas operacionais
export interface OperatingSystemStat extends CountStat {
  operatingSystem: string;
}

// Tipo para estatísticas de referrers
export interface ReferrerStat extends CountStat {
  referrer: string;
}

// Tipo para estatísticas por hora
export interface HourlyStat {
  hour: number;
  count: number;
}

// Tipo para o objeto completo de estatísticas
export interface AnalyticsData {
  totalVisits: number;
  pageVisits: PageVisitStat[];
  deviceTypes: DeviceTypeStat[];
  browsers: BrowserStat[];
  operatingSystems: OperatingSystemStat[];
  referrers: ReferrerStat[];
  visitsPerHour: HourlyStat[];
} 