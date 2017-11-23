import { Schema } from 'normalizr';
import { RequestOptions } from '@angular/http';
import { Action } from '@ngrx/store';
import { defaultEntitiesState } from '../../reducers/entity.reducer';
import { EntitiesState } from '../types';


export const defaultState = { ...defaultEntitiesState };

export interface ActionState {
  busy: boolean;
  error: boolean;
  message: string;
}

export interface DeleteActionState extends ActionState {
  deleted: boolean;
}

export const defaultActionState = {
  busy: false,
  error: false,
  message: ''
};

export const defaultDeletingActionState = {
  busy: false,
  error: false,
  message: '',
  deleted: false
};

export const rootUpdatingKey = '_root_';
export interface UpdatingSection {
  _root_: ActionState;
  [key: string]: ActionState;
}
export interface EntityRequestState {
  fetching: boolean;
  updating: UpdatingSection;
  creating: boolean;
  deleting: DeleteActionState;
  error: boolean;
  response: any;
  message: string;
}

export const defaultEntityRequest = {
  fetching: false,
  updating: {
    _root_: { ...defaultActionState }
  },
  creating: false,
  error: false,
  deleting: { ...defaultDeletingActionState },
  response: null,
  message: ''
};

export interface EntityInfo {
  entityRequestInfo: EntityRequestState;
  entity: any;
}

export interface APIResource {
  metadata: APIResourceMetadata;
  entity: any;
}

export interface APIResourceMetadata {
  created_at: string;
  guid: string;
  update_at: string;
  url: string;
}
export interface SingleEntityAction {
  entityKey: string;
  guid?: string;
}

export type ActionMergeFunction = (oldEntities: EntitiesState, newEntities: NormalizedResponseEntities)
  => NormalizedResponseEntities;

export interface NormalizedResponseEntities {
  [key: string]: string;
}


