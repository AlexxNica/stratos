import { RouterReducerState } from '@ngrx/router-store';
import { RouterStateSnapshot } from '@angular/router';
import { CNSISState } from './types/cnsis.types';
import { AuthState } from './reducers/auth.reducer';
import { DashboardState } from './reducers/dashboard-reducer';
import { PaginationState } from './types/pagination.types';
import { CreateNewApplicationState } from './types/create-application.types';
import { CfEntitiesState } from './types/entity.types';
import { ActionHistoryState } from './reducers/action-history-reducer';
import { UAASetupState } from './types/uaa-setup.types';
import { ListsState } from './reducers/list.reducer';
import { OtherEntitiesRequestState } from './types/other-entity.types';

export interface IStateHasEntities {
  cf: CfEntitiesState;
}

export interface IRequestState extends IStateHasEntities {
  other: OtherEntitiesRequestState;
}

export interface AppState {
  actionHistory: ActionHistoryState;
  auth: AuthState;
  uaaSetup: UAASetupState;
  cnsis: CNSISState;
  pagination: PaginationState;
  request: IRequestState;
  requestData: IRequestState;
  dashboard: DashboardState;
  createApplication: CreateNewApplicationState;
  lists: ListsState;
  routerReducer: RouterReducerState<any>;
}
