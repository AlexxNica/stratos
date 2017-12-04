import { cnsisStoreNames } from './cnsis.types';
import { AppSummaryStoreNames, AppStatsStoreNames, AppEnvVarsStoreNames, AppSummary, AppStats, AppEnvVarsState } from './application.types';

export interface OtherEntitiesRequestState {
  'cnsis': any;
  'appSummary': any;
  'appStats': any;
  'appEnvVars': any;
}
export interface OtherEntitiesRequestDataState extends OtherEntitiesRequestState {
  'cnsis': any;
  'appSummary': {
    [key: string]: AppSummary
  };
  'appStats': {
    [key: string]: {
      [key: string]: AppStats
    }
  };
  'appEnvVars': {
    [key: string]: AppEnvVarsState
  };
}
export const OtherEntityStateNames = [
  cnsisStoreNames.type,
  AppSummaryStoreNames.type,
  AppStatsStoreNames.type,
  AppEnvVarsStoreNames.type,
];
