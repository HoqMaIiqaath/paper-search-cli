export interface QueryJournalMetricsOptions {
  journals: string[];
  includeRaw?: boolean;
}

export interface JournalMetricsRow {
  journal: string;
  status: 'found' | 'not_found' | 'error';
  source: 'easyScholar';
  message?: string;
  core: {
    impact_factor?: string;
    impact_factor_5y?: string;
    jcr_quartile?: string;
    ssci_quartile?: string;
    jci?: string;
    cas_base?: string;
    cas_upgraded?: string;
    cas_small?: string;
    cas_top?: string;
    cas_zone?: string;
    cas_small_zones?: string[];
    esi?: string;
    warning?: string;
    pku?: string;
    cssci?: string;
    cscd?: string;
    ahci?: string;
    ccf?: string;
    ei?: string;
    china_st_core?: string;
  };
  official_all?: Record<string, unknown>;
  official_select?: Record<string, unknown>;
  custom_rank?: unknown;
}
