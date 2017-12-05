import { getRequestTypeFromMethod } from '../reducers/api-request-reducer/request-helpers';
import {
  CFAction,
  CFStartAction,
  ICFAction,
  StartCFAction,
  WrapperCFActionFailed,
  WrapperCFActionSuccess,
  IAPIAction,
  GenericCFRequestAction,
  StartNoneCFAction,
  WrapperNoneCFActionSuccess,
  WrapperNoneCFActionFailed,
} from '../types/request.types';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { Injectable } from '@angular/core';
import { Headers, Http, Request, RequestMethod, Response, URLSearchParams } from '@angular/http';
import { Actions, Effect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { normalize } from 'normalizr';
import { Observable } from 'rxjs/Observable';

import { ClearPaginationOfType, SetParams } from '../actions/pagination.actions';
import { environment } from './../../../environments/environment';
import {
  ApiActionTypes, NonApiActionTypes
} from './../actions/request.actions';
import {
  APIResource,
  NormalizedResponse,
} from './../types/api.types';
import { AppState } from './../app-state';
import {
  qParamsToString,
  resultPerPageParam,
  resultPerPageParamDefault,
} from '../reducers/pagination.reducer';
import { PaginatedAction, PaginationEntityState, PaginationParam } from '../types/pagination.types';
import { selectPaginationState } from '../selectors/pagination.selectors';
import { CNSISModel, cnsisStoreNames } from '../types/cnsis.types';
import { createCFRequest, getActionFromString, createClearPaginationAction, getCFErrors } from '../helpers/effects.helper';

@Injectable()
export class APIEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) { }

  @Effect() apiRequestStart$ = this.actions$.ofType<ICFAction>(ApiActionTypes.API_REQUEST)
    .map(apiAction => {
      return new StartCFAction(
        apiAction,
        getRequestTypeFromMethod(apiAction.options.method)
      );
    });

  @Effect() apiRequest$ = this.actions$.ofType<StartCFAction>(ApiActionTypes.API_REQUEST_START)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {

      const paramsObject = {};
      const _apiAction = { ...action.apiAction };
      const apiAction = _apiAction as ICFAction;
      const paginatedAction = _apiAction as PaginatedAction;
      const options = { ...apiAction.options };

      this.store.dispatch(getActionFromString(apiAction.actions[0]));

      const request = createCFRequest(state, apiAction.cnis, options, paginatedAction);

      return this.http.request(request)
        .mergeMap(response => {
          let resData;
          try {
            resData = response.json();
          } catch (e) {
            resData = null;
          }
          if (resData) {
            const cnsisErrors = getCFErrors(resData);
            if (cnsisErrors.length) {
              // We should consider not completely failing the whole if some cnsis return.
              throw Observable.throw(`Error from cnsis: ${cnsisErrors.map(res => `${res.guid}: ${res.error}.`).join(', ')}`);
            }
          }
          let entities;
          let totalResults = 0;

          if (resData) {
            const entityData = this.getEntities(apiAction, resData);
            entities = entityData.entities;
            totalResults = entityData.totalResults;
          }

          entities = entities || {
            entities: {},
            result: []
          };

          const actions = [];
          actions.push({ type: apiAction.actions[1], apiAction });
          actions.push(new WrapperCFActionSuccess(
            entities,
            apiAction,
            action.requestType,
            totalResults
          ));

          const clearAction = createClearPaginationAction(apiAction);
          if (clearAction) {
            actions.unshift(clearAction);
          }

          return actions;
        })
        .catch(err => {
          return [
            { type: apiAction.actions[1], apiAction },
            new WrapperCFActionFailed(
              err.message,
              apiAction,
              action.requestType
            )
          ];
        });
    });

  @Effect() genericApiRequest$ = this.actions$.ofType<GenericCFRequestAction>(NonApiActionTypes.REQUEST)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]: [GenericCFRequestAction, AppState]) => {

      this.store.dispatch(new StartNoneCFAction(action, action.requestType));
      this.store.dispatch(getActionFromString(action.actions[0]));

      const request = createCFRequest(state, action.cnis, action.options);

      return this.http.request(request)
        .mergeMap(response => {
          let resData;
          try {
            resData = response.json();
          } catch (e) {
            resData = null;
          }
          if (resData) {
            const cnsisErrors = getCFErrors(resData);
            if (cnsisErrors.length) {
              // We should consider not completely failing the whole if some cnsis return.
              throw Observable.throw(`Error from cnsis: ${cnsisErrors.map(res => `${res.guid}: ${res.error}.`).join(', ')}`);
            }
          }

          Object.values(resData).forEach(value => {
            value.guid = action.guid;
          });

          return [
            new WrapperNoneCFActionSuccess(normalize(resData, action.entity), action, action.requestType),
            getActionFromString(action.actions[1]),
          ];
        })
        .catch(err => [
          new WrapperNoneCFActionFailed(err.message, action, action.requestType),
          getActionFromString(action.actions[2])
        ]);
    });

  private completeResourceEntity(resource: APIResource | any, cfGuid: string, id?: string): APIResource {
    if (!resource) {
      return resource;
    }
    return resource.metadata ? {
      entity: { ...resource.entity, guid: resource.metadata.guid, cfGuid },
      metadata: resource.metadata
    } : {
        entity: { ...resource, cfGuid },
        metadata: { guid: id }
      };
  }

  getEntities(apiAction: IAPIAction, data): {
    entities: NormalizedResponse
    totalResults: number
  } {
    let totalResults = 0;
    const allEntities = Object.keys(data).map(cfGuid => {
      const cfData = data[cfGuid];
      totalResults += cfData['total_results'];
      if (cfData.resources) {
        if (!cfData.resources.length) {
          return null;
        }
        return cfData.resources.map(resource => {
          return this.completeResourceEntity(resource, cfGuid, apiAction.guid);
        });
      } else {

        return this.completeResourceEntity(cfData, cfGuid, apiAction.guid);
      }
    });
    const flatEntities = [].concat(...allEntities).filter(e => !!e);
    return {
      entities: flatEntities.length ? normalize(flatEntities, apiAction.entity) : null,
      totalResults
    };
  }

  mergeData(entity, metadata, cfGuid) {
    return { ...entity, ...metadata, cfGuid };
  }

}
