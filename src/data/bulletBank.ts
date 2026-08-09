export interface BulletEntry {
  id: string;
  text: string;
  tags: string[];
  sourceCompany: string;
  sourceRole: string;
  sourcePeriod: string;
  hasMetric: boolean;
  metricType?: 'churn' | 'onboarding_volume' | 'portfolio_size' | 'ticket_volume';
}

export const EVIDENCE_BULLET_BANK: BulletEntry[] = [
  // --------------------------------------------------------------------------
  // LOGZZ - Customer Onboarding & Success Analyst
  // --------------------------------------------------------------------------
  {
    id: 'logzz-cs-1',
    text: 'Redução de churn em 15% por meio da otimização do onboarding e atuação proativa em contas de risco.',
    tags: ['churn', 'retention', 'onboarding', 'customer_success', 'customer_health', 'risk_management', 'metrics'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: true,
    metricType: 'churn',
  },
  {
    id: 'logzz-cs-2',
    text: 'Condução de 5 a 15 onboardings B2B por mês, acelerando a adoção do produto e o time-to-value.',
    tags: ['onboarding', 'implementation', 'product_adoption', 'b2b', 'time_to_value', 'metrics'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: true,
    metricType: 'onboarding_volume',
  },
  {
    id: 'logzz-cs-3',
    text: 'Diagnóstico consultivo de clientes e alinhamento de expectativas de sucesso para alinhamento estratégico.',
    tags: ['customer_success', 'consultative', 'stakeholder_management', 'b2b', 'relationship'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cs-4',
    text: 'Acompanhamento de engajamento, adoção de produto e métricas de customer health score.',
    tags: ['customer_health', 'product_adoption', 'kpi_monitoring', 'customer_success', 'reporting'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cs-5',
    text: 'Gestão contínua do relacionamento durante as etapas de onboarding, adoção, retenção e expansão.',
    tags: ['customer_lifecycle', 'retention', 'upsell', 'expansion', 'account_management', 'customer_success'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cs-6',
    text: 'Uso estratégico de dados para segmentação de clientes e priorização de atendimento da carteira.',
    tags: ['data_analysis', 'customer_segmentation', 'cs_operations', 'portfolio_management', 'sql', 'power_bi'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Onboarding & Success Analyst',
    sourcePeriod: 'Abril de 2025 – Outubro de 2025',
    hasMetric: false,
  },

  // --------------------------------------------------------------------------
  // LOGZZ - Customer Experience Analyst
  // --------------------------------------------------------------------------
  {
    id: 'logzz-cx-1',
    text: 'Mapeamento detalhado da jornada do cliente para identificar touchpoints críticos e eliminar pontos de fricção.',
    tags: ['customer_experience', 'customer_journey', 'journey_mapping', 'touchpoints', 'process_improvement'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Experience Analyst',
    sourcePeriod: 'Maio de 2024 – Abril de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cx-2',
    text: 'Análise quantitativa e qualitativa de feedbacks (NPS, CSAT), dados de uso de produto e padrões comportamentais.',
    tags: ['customer_experience', 'nps', 'csat', 'customer_insights', 'data_analysis', 'power_bi', 'reporting'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Experience Analyst',
    sourcePeriod: 'Maio de 2024 – Abril de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cx-3',
    text: 'Atuação interdisciplinar em conjunto com as equipes de Produto e Operações para resolução de causas-raiz.',
    tags: ['stakeholder_management', 'cross_functional', 'product', 'business_operations', 'collaboration'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Experience Analyst',
    sourcePeriod: 'Maio de 2024 – Abril de 2025',
    hasMetric: false,
  },
  {
    id: 'logzz-cx-4',
    text: 'Proposição e implementação de melhorias contínuas em processos para otimizar a jornada e experiência do cliente.',
    tags: ['process_improvement', 'customer_experience', 'business_operations', 'cs_operations'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Experience Analyst',
    sourcePeriod: 'Maio de 2024 – Abril de 2025',
    hasMetric: false,
  },

  // --------------------------------------------------------------------------
  // LOGZZ - Customer Success Associate
  // --------------------------------------------------------------------------
  {
    id: 'logzz-csa-1',
    text: 'Gestão de carteira ativa com mais de 150 clientes corporativos B2B.',
    tags: ['portfolio_management', 'account_management', 'b2b', 'customer_success', 'metrics'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Success Associate',
    sourcePeriod: 'Outubro de 2023 – Maio de 2024',
    hasMetric: true,
    metricType: 'portfolio_size',
  },
  {
    id: 'logzz-csa-2',
    text: 'Monitoramento constante de engajamento, satisfação, taxa de adoção e mitigação de risco de churn.',
    tags: ['churn', 'retention', 'customer_health', 'product_adoption', 'nps', 'csat'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Success Associate',
    sourcePeriod: 'Outubro de 2023 – Maio de 2024',
    hasMetric: false,
  },
  {
    id: 'logzz-csa-3',
    text: 'Mapeamento proativo e identificação de oportunidades de upsell e expansão de conta na carteira.',
    tags: ['upsell', 'expansion', 'account_management', 'revenue_operations', 'b2b'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Success Associate',
    sourcePeriod: 'Outubro de 2023 – Maio de 2024',
    hasMetric: false,
  },
  {
    id: 'logzz-csa-4',
    text: 'Desenvolvimento de relacionamento estratégico e consultivo com executivos e clientes B2B.',
    tags: ['account_management', 'consultative', 'stakeholder_management', 'relationship'],
    sourceCompany: 'Logzz',
    sourceRole: 'Customer Success Associate',
    sourcePeriod: 'Outubro de 2023 – Maio de 2024',
    hasMetric: false,
  },

  // --------------------------------------------------------------------------
  // CHATSENTRY - Bilingual Customer Service Freelancer
  // --------------------------------------------------------------------------
  {
    id: 'chatsentry-1',
    text: 'Atendimento bilíngue de alta performance especializado em português e inglês C2.',
    tags: ['customer_support', 'bilingual', 'english', 'communication', 'customer_service'],
    sourceCompany: 'ChatSentry',
    sourceRole: 'Bilingual Customer Service Freelancer',
    sourcePeriod: 'Outubro de 2025 – Janeiro de 2026',
    hasMetric: false,
  },
  {
    id: 'chatsentry-2',
    text: 'Resolução ágil de aproximadamente 60 tickets diários de alta complexidade via Zendesk e canais omnichannel.',
    tags: ['customer_support', 'zendesk', 'intercom', 'tickets', 'customer_service', 'metrics'],
    sourceCompany: 'ChatSentry',
    sourceRole: 'Bilingual Customer Service Freelancer',
    sourcePeriod: 'Outubro de 2025 – Janeiro de 2026',
    hasMetric: true,
    metricType: 'ticket_volume',
  },
  {
    id: 'chatsentry-3',
    text: 'Mapeamento e identificação de problemas recorrentes relatados por clientes para diagnóstico de causa-raiz.',
    tags: ['customer_support', 'customer_insights', 'process_improvement', 'data_analysis'],
    sourceCompany: 'ChatSentry',
    sourceRole: 'Bilingual Customer Service Freelancer',
    sourcePeriod: 'Outubro de 2025 – Janeiro de 2026',
    hasMetric: false,
  },
  {
    id: 'chatsentry-4',
    text: 'Análise crítica de padrões de solicitações para estruturar e otimizar a base de conhecimento interna.',
    tags: ['data_analysis', 'documentation', 'customer_support', 'knowledge_base'],
    sourceCompany: 'ChatSentry',
    sourceRole: 'Bilingual Customer Service Freelancer',
    sourcePeriod: 'Outubro de 2025 – Janeiro de 2026',
    hasMetric: false,
  },
  {
    id: 'chatsentry-5',
    text: 'Proposta e execução de melhorias diretas nos fluxos operacionais de atendimento ao cliente.',
    tags: ['process_improvement', 'cs_operations', 'business_operations', 'customer_support'],
    sourceCompany: 'ChatSentry',
    sourceRole: 'Bilingual Customer Service Freelancer',
    sourcePeriod: 'Outubro de 2025 – Janeiro de 2026',
    hasMetric: false,
  },

  // --------------------------------------------------------------------------
  // PREFEITURA MUNICIPAL DE GUARIBA - Estágio em Recursos Humanos
  // --------------------------------------------------------------------------
  {
    id: 'guariba-1',
    text: 'Elaboração e organização de documentação administrativa corporativa e relatórios departamentais.',
    tags: ['business_operations', 'documentation', 'organization'],
    sourceCompany: 'Prefeitura Municipal de Guariba',
    sourceRole: 'Estágio em Recursos Humanos',
    sourcePeriod: 'Setembro de 2022 – Novembro de 2023',
    hasMetric: false,
  },
  {
    id: 'guariba-2',
    text: 'Desenvolvimento e manutenção de planilhas de controle gerencial e dashboards operacionais em Excel.',
    tags: ['excel', 'sheets', 'business_operations', 'data_analysis', 'reporting'],
    sourceCompany: 'Prefeitura Municipal de Guariba',
    sourceRole: 'Estágio em Recursos Humanos',
    sourcePeriod: 'Setembro de 2022 – Novembro de 2023',
    hasMetric: false,
  },
  {
    id: 'guariba-3',
    text: 'Atualização e gerenciamento de bases de dados internas com garantia de integridade das informações.',
    tags: ['data_analysis', 'excel', 'business_operations', 'database'],
    sourceCompany: 'Prefeitura Municipal de Guariba',
    sourceRole: 'Estágio em Recursos Humanos',
    sourcePeriod: 'Setembro de 2022 – Novembro de 2023',
    hasMetric: false,
  },

  // --------------------------------------------------------------------------
  // RAÍZEN - Assistente Administrativo
  // --------------------------------------------------------------------------
  {
    id: 'raizen-1',
    text: 'Gestão e controle operacional de insumos tecnológicos da unidade industrial.',
    tags: ['business_operations', 'inventory', 'organization'],
    sourceCompany: 'Raízen',
    sourceRole: 'Assistente Administrativo',
    sourcePeriod: 'Agosto de 2019 – Outubro de 2021',
    hasMetric: false,
  },
  {
    id: 'raizen-2',
    text: 'Padronização e documentação de processos operacionais internos para ganho de eficiência.',
    tags: ['process_improvement', 'documentation', 'business_operations', 'standardization'],
    sourceCompany: 'Raízen',
    sourceRole: 'Assistente Administrativo',
    sourcePeriod: 'Agosto de 2019 – Outubro de 2021',
    hasMetric: false,
  },
  {
    id: 'raizen-3',
    text: 'Execução e acompanhamento de rotinas de controle interno, conformidade e auditoria.',
    tags: ['business_operations', 'compliance', 'kpi_monitoring'],
    sourceCompany: 'Raízen',
    sourceRole: 'Assistente Administrativo',
    sourcePeriod: 'Agosto de 2019 – Outubro de 2021',
    hasMetric: false,
  },
];
