import { getRequestTypeFromMethod } from '../reducers/api-request-reducer/request-helpers';
import {
  CFAction,
  CFStartAction,
  ICFAction,
  StartCFAction,
  WrapperCFActionFailed,
  WrapperCFActionSuccess,
  StartNoneCFAction,
  WrapperNoneCFActionSuccess,
  WrapperNoneCFActionFailed,
  IAPIAction,
} from '../types/request.types';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

import { Injectable } from '@angular/core';
import { Headers, Http, Request, RequestMethod, Response, URLSearchParams } from '@angular/http';
import { Actions, Effect } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
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

const { proxyAPIVersion, cfAPIVersion } = environment;
export const AAAAA2 = 'sdfsdfdsf';
export class AAAAA implements Action {
  type = AAAAA2;
}

@Injectable()
export class APIEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) { }

  @Effect() apiRequestStart$ = this.actions$.ofType<ICFAction>(ApiActionTypes.API_REQUEST)
    .mergeMap(apiAction => {
      const b = new StartCFAction(
        apiAction,
        getRequestTypeFromMethod(apiAction.options.method)
      );
      return [b];
    });



  @Effect() nonApiRequestStart$ = this.actions$.ofType<ICFAction>(NonApiActionTypes.REQUEST)
    .mergeMap(apiAction => {
      console.log(apiAction);
      const a = new StartNoneCFAction(
        apiAction,
        getRequestTypeFromMethod(apiAction.options ? apiAction.options.method : '')
      );
      return [new AAAAA(), a];
    });

  @Effect() apiRequest$ = this.actions$.ofType<StartCFAction>(ApiActionTypes.API_REQUEST_START)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {

      const paramsObject = {};
      const _apiAction = { ...action.apiAction };
      const apiAction = _apiAction as ICFAction;
      const paginatedAction = _apiAction as PaginatedAction;
      const options = { ...apiAction.options };

      this.store.dispatch(this.getActionFromString(apiAction.actions[0]));

      // Apply the params from the store
      if (paginatedAction.paginationKey) {
        options.params = new URLSearchParams();
        const paginationParams = this.getPaginationParams(selectPaginationState(apiAction.entityKey, paginatedAction.paginationKey)(state));
        if (paginationParams.hasOwnProperty('q')) {
          // Convert q into a cf q string
          paginationParams.qString = qParamsToString(paginationParams.q);
          for (const q of paginationParams.qString) {
            options.params.append('q', q);
          }
          delete paginationParams.qString;
          delete paginationParams.q;
        }
        for (const key in paginationParams) {
          if (paginationParams.hasOwnProperty(key)) {
            if (key === 'page' || !options.params.has(key)) { // Don't override params from actions except page.
              options.params.set(key, paginationParams[key] as string);
            }
          }
        }
        if (!options.params.has(resultPerPageParam)) {
          options.params.set(resultPerPageParam, resultPerPageParamDefault.toString());
        }

      }

      options.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${options.url}`;
      options.headers = this.addBaseHeaders(
        apiAction.cnis ||
        state.requestData[cnsisStoreNames.section][cnsisStoreNames.type], options.headers
      );

      return this.http.request(new Request(options))
        .mergeMap(response => {
          let resData;
          try {
            resData = response.json();
          } catch (e) {
            resData = null;
          }
          if (resData) {
            const cnsisErrors = this.getErrors(resData);
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

          if (
            apiAction.options.method === 'post' || apiAction.options.method === RequestMethod.Post ||
            apiAction.options.method === 'delete' || apiAction.options.method === RequestMethod.Delete
          ) {
            actions.unshift(new ClearPaginationOfType(apiAction.entityKey));
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

  @Effect() noneApiRequest2$ = this.actions$.ofType<AAAAA>(AAAAA2)
    .do((action) => console.log(`aaaaaReceived ${action.type}`))
    .filter((action) => action.type !== AAAAA2);

  // @Effect() noneApiRequest2$ = this.actions$.ofType<StartNoneCFAction>(NonApiActionTypes.START)
  //   .do((action) => console.log(`aaaaaReceived ${action.type}`))
  //   .subscribe();

  @Effect() noneApiRequest$ = this.actions$.ofType<ICFAction>(NonApiActionTypes.REQUEST)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {

      const paramsObject = {};
      const apiAction = action as ICFAction;
      const options = { ...apiAction.options };
      const requestType = getRequestTypeFromMethod(options ? options.method : '');

      if (!options.url) {
        return [];
      }
      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

      this.store.dispatch(new StartNoneCFAction(apiAction, requestType));
      this.store.dispatch(this.getActionFromString(apiAction.actions[0]));

      options.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${options.url}`;
      options.headers = this.addBaseHeaders(
        apiAction.cnis ||
        state.requestData[cnsisStoreNames.section][cnsisStoreNames.type], options.headers
      );

      return this.http.request(new Request(options))
        .mergeMap(response => {
          let resData;
          try {
            resData = response.json();
          } catch (e) {
            resData = null;
          }
          if (resData) {
            const cnsisErrors = this.getErrors(resData);
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

          // const mappedData = {
          //   entities: {
          //     [apiAction.entityKey]: {}
          //   },
          //   result: []
          // };
          // Object.keys(resData).forEach(entityId => {
          //   mappedData.entities[apiAction.entityKey][entityId] = resData[entityId];
          //   mappedData.result.push(entityId);
          // });

          const actions = [];
          actions.push({ type: apiAction.actions[1], apiAction });
          actions.push(new WrapperNoneCFActionSuccess(
            entities,
            apiAction,
            requestType,
            totalResults,
          ));

          return actions;
        })
        .catch(err => {
          return [
            { type: apiAction.actions[1], apiAction },
            new WrapperNoneCFActionFailed(
              err.message,
              apiAction,
              requestType
            )
          ];
        });
    });

  private completeResourceEntity(resource: APIResource | any, cfGuid: string, id: string): APIResource {
    if (!resource) {
      return resource;
    }
    return resource.metadata ? {
      entity: { ...resource.entity, guid: id, cfGuid },
      metadata: resource.metadata
    } : {
        entity: { ...resource, cfGuid },
        metadata: { guid: id }
      };
  }

  getErrors(resData) {
    return Object.keys(resData)
      .map(guid => {
        const cnsis = resData[guid];
        cnsis.guid = guid;
        return cnsis;
      })
      .filter(cnsis => {
        return cnsis.error;
      });
  }

  getEntities(apiAction: IAPIAction, data): {
    entities: NormalizedResponse
    totalResults: number
  } {
    const id = apiAction.guid;
    let totalResults = 0;
    const allEntities = Object.keys(data).map(cfGuid => {
      const cfData = data[cfGuid];
      totalResults += cfData['total_results'];
      if (cfData.resources) {
        if (!cfData.resources.length) {
          return null;
        }
        return cfData.resources.map(resource => {
          return this.completeResourceEntity(resource, cfGuid, id);
        });
      } else {

        return this.completeResourceEntity(cfData, cfGuid, id);
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

  addBaseHeaders(cnsis: CNSISModel[] | string, header: Headers): Headers {
    const cnsiHeader = 'x-cap-cnsi-list';
    const headers = header || new Headers();
    if (typeof cnsis === 'string') {
      headers.set(cnsiHeader, cnsis);
    } else {
      const registeredCNSIGuids = [];
      Object.keys(cnsis).forEach(cnsiGuid => {
        const cnsi = cnsis[cnsiGuid];
        if (cnsi.registered) {
          registeredCNSIGuids.push(cnsi.guid);
        }
      });
      headers.set(cnsiHeader, registeredCNSIGuids);
    }
    return headers;
  }

  getActionFromString(type: string) {
    return { type };
  }

  getPaginationParams(paginationState: PaginationEntityState): PaginationParam {
    return {
      ...paginationState.params,
      page: paginationState.currentPage.toString(),
    };
  }
}
