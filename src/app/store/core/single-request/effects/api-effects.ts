import { Headers, Http, Request, RequestMethod } from '@angular/http';
import { Store } from '@ngrx/store';
import { AppState } from '../../../app-state';
import { CNSISModel } from '../../../types/cnsis.types';
import { type } from 'os';
import { Actions, Effect } from '@ngrx/effects';
import { ApiActionTypes } from '../../../actions/api.actions';
import { StartAPIAction, WrapperAPIActionFailed, WrapperAPIActionSuccess } from '../../../types/api.types';
import { Observable } from 'rxjs/Rx';
import { ClearPaginationOfType } from '../../../actions/pagination.actions';
import { environment } from '../../../../../environments/environment';
import { APIAction, APIResource, NormalizedResponse, PaginationEntityState, PaginationParam } from '../types';
import { normalize } from 'normalizr';


const { proxyAPIVersion, cfAPIVersion } = environment;

export class APIEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) {
  }

  @Effect() apiRequestStart$ = this.actions$.ofType<APIAction>(ApiActionTypes.API_REQUEST)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {

      const options = { ...action.options };

      options.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${options.url}`;
      options.headers = this.addBaseHeaders(action.cnis || state.cnsis.entities, options.headers);

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
            const entityData = this.getEntities(action, resData);
            entities = entityData.entities;
            totalResults = entityData.totalResults;
          }

          entities = entities || {
            entities: {},
            result: []
          };

          const actions = [];
          actions.push(new WrapperAPIActionSuccess(
            action.actions[1],
            entities,
            action,
            totalResults
          ));

          if (
            action.options.method === 'post' || action.options.method === RequestMethod.Post ||
            action.options.method === 'delete' || action.options.method === RequestMethod.Delete
          ) {
            actions.unshift(new ClearPaginationOfType(action.entityKey));
          }

          return actions;
        })
        .catch(err => {
          return Observable.of(new WrapperAPIActionFailed(action.actions[2], err.message, action));
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

  getEntities(apiAction: APIAction, data): {
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
      headers.set(cnsiHeader, cnsis.filter(c => c.registered).map(c => c.guid));
    }
    return headers;
  }

  getActionFromString(type: string) {
    return { type };
  }


}
