import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app-state';
import { EntityService } from './entity-service';
import { Schema } from 'normalizr';
import { IAPIAction } from '../store/types/request.types';

@Injectable()
export class EntityServiceFactory {

  constructor(private store: Store<AppState>) { }

  create(entityKey: string, schema: Schema, entityId: string, action: IAPIAction, entitySection = 'cf') {
    return new EntityService(this.store, entityKey, schema, entityId, action, entitySection);
  }

}
