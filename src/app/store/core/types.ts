import { Action } from '@ngrx/store';
import { SingleEntityAction } from './single-request/types';
import { RequestOptions } from '@angular/http';
import { Schema } from 'normalizr';

export type IActionTypes = [
  string,
  string,
  string
];

export interface EntitiesState {
  application: any;
  stack: any;
  space: any;
  organization: any;
  route: any;
  event: any;
}

export class APIAction implements Action, SingleEntityAction {
  type: string;
  actions: IActionTypes;
  options: RequestOptions;
  entity: Schema;
  entityKey: string;
  cnis?: string;
  // For single entity requests
  guid?: string;
  updatingKey?: string;
}

export interface NormalizedResponse {
  entities: {
    [key: string]: any
  };
  result: any[];
}
