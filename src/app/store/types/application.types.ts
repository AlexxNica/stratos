import { getAPIResourceGuid } from '../selectors/api.selectors';
import { schema } from 'normalizr';
import { APIResource } from './api.types';

export interface NewApplication {
  name: string;
  space_guid: string;
}

export const AppSummaryStoreNames = {
  section: 'other',
  type: 'appSummary'
};

export interface AppSummary extends APIResource { }

// const ApplicationEntiySchema = {
//   entity: {
//     stack: StackSchema,
//     space: SpaceSchema
//   }
// };

export const AppSummarySchema = new schema.Entity(AppSummaryStoreNames.type, {
}, {
    idAttribute: 'guid'
  });

export const AppStatsStoreNames = {
  section: 'other',
  type: 'appStats'
};

export const AppStatsSchema = new schema.Entity(AppStatsStoreNames.type, {}, {
  idAttribute: getAPIResourceGuid
});

export interface AppStats {
  state: string;
  isolation_segment: any;
  stats: {
    [key: string]: AppInstanceStats
  };
}
export interface AppInstanceStats {
  disk_quota: number;
  fds_quota: number;
  host: string;
  mem_quota: number;
  name: string;
  port: number;
  uptime: number;
  uris: string[];
  usage: AppInstanceUsage;
}

export interface AppInstanceUsage {
  cpu: number;
  disk: number;
  mem: number;
  time: string;
}

export const AppEnvVarsStoreNames = {
  section: 'other',
  type: 'appEnvVars'
};

export const AppEnvVarsSchema = new schema.Entity(AppEnvVarsStoreNames.type, {}, {
  idAttribute: 'guid'
});

export interface AppEnvVarsState {
  application_env_json?: any;
  environment_json?: {
    STRATOS_PROJECT?: any;
  };
  running_env_json?: any;
  staging_env_json?: any;
  system_env_json?: any;
}
