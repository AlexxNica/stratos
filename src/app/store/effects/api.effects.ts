import { ApiRequestTypes, getRequestTypeFromMethod } from '../reducers/api-request-reducer/request-helpers';
import {
  CFAction,
  CFStartAction,
  IAPIAction,
  ICFAction,
  StartCFAction,
  WrapperCFActionFailed,
  WrapperCFActionSuccess,
  StartBasicNoneCFAction,
  StartNoneCFAction,
  WrapperNoneCFActionSuccess,
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
import { RequestArgs } from '@angular/http/src/interfaces';

const { proxyAPIVersion, cfAPIVersion } = environment;

//TODO: RC MOVE
export function createBasicCFRequestOption(action: StartBasicNoneCFAction, state: AppState): Request {
  const newOptions = { ...action.options };
  newOptions.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${action.options.url}`; //TODO: RC ????
  newOptions.headers =
    createCNSIHeader(action, action.cnis || state.requestData[cnsisStoreNames.section][cnsisStoreNames.type], newOptions.headers);
  return new Request(newOptions);
}

function createCNSIHeader(action, cnsis: CNSISModel[] | string, header: Headers) {
  let headers = header || new Headers();
  if (action.passthrough) {
    headers = createCNSIPassthroughHeader(headers);
  } else {
    headers = createCNSIListHeader(cnsis, headers);
  }
  return headers;
}

function createCNSIPassthroughHeader(headers: Headers) {
  const cnsiPassthroughHeader = 'x-cap-passthrough';
  headers.set(cnsiPassthroughHeader, 'true');
  return headers;
}

function createCNSIListHeader(cnsis: CNSISModel[] | string, header: Headers): Headers {
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



  @Effect() basicNoneCFAction$ = this.actions$.ofType<StartBasicNoneCFAction>(NonApiActionTypes.REQUEST)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {
      const apiAction = {
        entityKey: action.entityKey,
        guid: action.guid,
        type: action.type,
        cnis: action.cnis,
      } as IAPIAction;
      // updatingKey: CNSISEffect.connectingKey, //TODO: RC

      const headers = new Headers();
      headers.append('Content-Type', 'application/x-www-form-urlencoded');
      const request = createBasicCFRequestOption(action, state);

      let res: Observable<Response>;
      this.store.dispatch(new StartNoneCFAction(apiAction, action.requestType));
      switch (action.requestType) {
        case 'fetch':
          break;
        case 'update':
          res = this.http.post('/pp/v1/auth/login/cnsi', action.requestParams, { headers });
          break;
        case 'create':
          break;
        case 'delete':
          break;
      }
      return res.map(response => {

        return new WrapperNoneCFActionSuccess({ entities: {}, result: [] }, apiAction, 'update');
      })
        .catch(e => {
          return [new WrapperNoneCFActionFailed('Could not connect', apiAction, actionType)];
        });
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

  private completeResourceEntity(resource: APIResource | any, cfGuid: string): APIResource {
    if (!resource) {
      return resource;
    }
    return resource.metadata ? {
      entity: { ...resource.entity, guid: resource.metadata.guid, cfGuid },
      metadata: resource.metadata
    } : {
        entity: { ...resource, cfGuid },
        metadata: { guid: resource.guid }
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
    let totalResults = 0;
    const allEntities = Object.keys(data).map(cfGuid => {
      const cfData = data[cfGuid];
      totalResults += cfData['total_results'];
      if (cfData.resources) {
        if (!cfData.resources.length) {
          return null;
        }
        return cfData.resources.map(resource => {
          return this.completeResourceEntity(resource, cfGuid);
        });
      } else {

        return this.completeResourceEntity(cfData, cfGuid);
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
