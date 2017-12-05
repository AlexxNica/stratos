import { IAPIAction } from '../store/types/request.types';
import { interval } from 'rxjs/observable/interval';
import { ActionState, RequestState, UpdatingSection } from '../store/reducers/api-request-reducer/types';
import { composeFn } from './../store/helpers/reducer.helper';
import { Action, compose, Store } from '@ngrx/store';
import { AppState } from '../store/app-state';
import { denormalize, Schema } from 'normalizr';
import { Observable } from 'rxjs/Rx';
import { APIResource, EntityInfo } from '../store/types/api.types';
import {
  getEntityUpdateSections,
  getUpdateSectionById,
  selectEntity,
  selectRequestInfo,
  selectUpdateInfo,
  getEntitySection,
} from '../store/selectors/api.selectors';
import { CfEntitiesState } from '../store/types/entity.types';
import { Inject, Injectable } from '@angular/core';
import { OtherEntitiesRequestDataState } from '../store/types/other-entity.types';
import { AppSummarySchema, AppEnvVarsSchema, AppStatsSchema } from '../store/types/application.types';

type PollUntil = (apiResource: APIResource, updatingState: ActionState) => boolean;

@Injectable()
export class EntityService {

  constructor(
    private store: Store<AppState>,
    private entityKey: string,
    private schema: Schema,
    private entityId: string,
    private action: IAPIAction,
    private entitySection = 'cf'
  ) {
    this.entitySelect$ = store.select(selectEntity(entityKey, entityId, entitySection));
    this.entityRequestSelect$ = store.select(selectRequestInfo(entityKey, entityId, entitySection));
    this.actionDispatch = (updatingKey) => {
      if (updatingKey) {
        action.updatingKey = updatingKey;
      }
      this.store.dispatch(action);
    };

    this.updateEntity = () => {
      this.actionDispatch(this.refreshKey);
    };

    this.entityObs$ = this.getEntityObservable(
      schema,
      this.actionDispatch,
      this.entitySelect$,
      this.entityRequestSelect$
    );

    this.updatingSection$ = this.entityObs$.map(ei => ei.entityRequestInfo.updating);

    this.isDeletingEntity$ = this.entityObs$.map(a => a.entityRequestInfo.deleting.busy).startWith(false);

    this.waitForEntity$ = this.entityObs$
      .filter((appInfo) => {
        const available = !!appInfo.entity &&
          !appInfo.entityRequestInfo.deleting.busy &&
          !appInfo.entityRequestInfo.deleting.deleted &&
          !appInfo.entityRequestInfo.error;
        return (
          available
        );
      })
      .delay(1);

    this.isFetchingEntity$ = this.entityObs$.map(ei => ei.entityRequestInfo.fetching);
  }

  refreshKey = 'updating';

  private entitySelect$: Observable<APIResource>;
  private entityRequestSelect$: Observable<RequestState>;
  private actionDispatch: Function;

  updateEntity: Function;

  entityObs$: Observable<EntityInfo>;

  isFetchingEntity$: Observable<boolean>;

  isDeletingEntity$: Observable<boolean>;

  waitForEntity$: Observable<EntityInfo>;

  updatingSection$: Observable<UpdatingSection>;

  fetching: boolean;

  private getEntityObservable = (
    schema: Schema,
    actionDispatch: Function,
    entitySelect$: Observable<APIResource>,
    entityRequestSelect$: Observable<RequestState>
  ): Observable<EntityInfo> => {
    return Observable.combineLatest(
      entitySelect$,
      entityRequestSelect$
    )
      .withLatestFrom(
      this.store.select(getEntitySection(this.entitySection)),
    )
      .do(([[entity, entityRequestInfo], entities]: [[APIResource, RequestState], CfEntitiesState | OtherEntitiesRequestDataState]) => {
        if (
          !entityRequestInfo ||
          !entity &&
          !entityRequestInfo.fetching &&
          !entityRequestInfo.error &&
          !entityRequestInfo.deleting.busy &&
          !entityRequestInfo.deleting.deleted
        ) {
          actionDispatch();
        }
      })
      .filter(([[entity, entityRequestInfo], entities]: [[APIResource, RequestState], CfEntitiesState | OtherEntitiesRequestDataState]) => {
        return !!entityRequestInfo;
      })
      .map(([[entity, entityRequestInfo], entities]: [[APIResource, RequestState], CfEntitiesState | OtherEntitiesRequestDataState]) => {
        return {
          entityRequestInfo,
          entity: entity ? {
            entity: denormalize(entity, schema, entities).entity,
            metadata: entity.metadata
          } : null
        };
      });


  }
  /**
   * @param interval - The polling interval in ms.
   * @param key - The store updating key for the poll
   */
  poll(interval = 10000, key = this.refreshKey) {
    return Observable.interval(interval)
      .withLatestFrom(
      this.entitySelect$,
      this.entityRequestSelect$
      )
      .map(a => ({
        resource: a[1],
        updatingSection: composeFn(
          getUpdateSectionById(key),
          getEntityUpdateSections,
          () => a[2]
        )
      }))
      .do(({ resource, updatingSection }) => {
        console.log('SKIP UPDATING APP'); // TODO: RC REMOVE
        // if (!updatingSection || !updatingSection.busy) {
        //   this.actionDispatch(key);
        // }
      })
      .filter(({ resource, updatingSection }) => {
        return !!updatingSection;
      });
  }

}
