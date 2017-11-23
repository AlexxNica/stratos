import { normalize } from 'normalizr';
import { Observable } from 'rxjs/Rx';
import { Http, RequestMethod } from '@angular/http';
import { WrapperAPIActionSuccess, WrapperAPIActionFailed } from '../types/api.types';
import { APIAction, NormalizedResponse } from './types';
import { CNSISModel } from '../types/cnsis.types';

export const makeApiRequest = (http: Http, options, action: APIAction) => {
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

      return actions;
    })
    .catch(err => {
      return Observable.of(new WrapperAPIActionFailed(action.actions[2], err.message, action));
    });
};

export function completeResourceEntity(resource: APIResource | any, cfGuid: string): APIResource {
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

export function getErrors(resData) {
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

export function getEntities(apiAction: APIAction, data): {
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

export function mergeData(entity, metadata, cfGuid) {
  return { ...entity, ...metadata, cfGuid };
}

export function addBaseHeaders(cnsis: CNSISModel[] | string, header: Headers): Headers {
  const cnsiHeader = 'x-cap-cnsi-list';
  const headers = header || new Headers();
  if (typeof cnsis === 'string') {
    headers.set(cnsiHeader, cnsis);
  } else {
    headers.set(cnsiHeader, cnsis.filter(c => c.registered).map(c => c.guid).join(','));
  }
  return headers;
}

export function getActionFromString(type: string) {
  return { type };
}

export function getPaginationParams(paginationState: PaginationEntityState): PaginationParam {
  return {
    ...paginationState.params,
    page: paginationState.currentPage.toString(),
  };
}

export function qParamsToString(params: QParam[]) {
  return params.map(joinQParam);
}

function joinQParam(q: QParam) {
  return `${q.key}${q.joiner}${(q.value as string[]).join ? (q.value as string[]).join(',') : q.value}`;
}


