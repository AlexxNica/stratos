import { RequestAction, NoneCFRequestAction } from '../types/request.types';
import { RequestOptions } from '@angular/http';
import { Schema, schema } from 'normalizr';
import { Action, createSelector } from '@ngrx/store';

import { AppState } from '../app-state';
import { cnsisStoreNames } from '../types/cnsis.types';

export const GET_CNSIS = '[CNSIS] Get all';
export const GET_CNSIS_LOGIN = '[CNSIS] Get all at login';
export const GET_CNSIS_SUCCESS = '[CNSIS] Get all success';
export const GET_CNSIS_FAILED = '[CNSIS] Get all failed';

export const CONNECT_CNSIS = '[CNSIS] Connect';
export const CONNECT_CNSIS_SUCCESS = '[CNSIS] Connect succeed';
export const CONNECT_CNSIS_FAILED = '[CNSIS] Connect failed';

export class GetAllCNSIS implements Action {
  constructor(public login = false) { }
  type = GET_CNSIS;
}

export class GetAllCNSISSuccess implements Action {
  constructor(public payload: {}, public login = false) { }
  type = GET_CNSIS_SUCCESS;
}

export class GetAllCNSISFailed implements Action {
  constructor(public message: string, public login = false) { }
  type = GET_CNSIS_FAILED;
}

export class ConnectCnis implements Action {
  constructor(
    public cnsiGuid: string,
    public username: string,
    public password: string,
  ) { }
  type = CONNECT_CNSIS;
}

export class GetAllCNSIEntities extends NoneCFRequestAction {
  constructor() {
    super();
    this.options = new RequestOptions();
  }
  entityKey = cnsisStoreNames.type;
  requestType = 'fetch';
  options: RequestOptions;
}
