import { environment } from '../../../environments/environment';
import { AppState } from '../app-state';
import { cnsisStoreNames, CNSISModel } from '../types/cnsis.types';
import { Headers, Http, Request, RequestMethod, Response } from '@angular/http';
import { RequestArgs } from '@angular/http/src/interfaces';
import { selectPaginationState } from '../selectors/pagination.selectors';
import { qParamsToString, resultPerPageParam, resultPerPageParamDefault } from '../reducers/pagination.reducer';
import { PaginationEntityState, PaginationParam } from '../types/pagination.types';
import { ClearPaginationOfType } from '../actions/pagination.actions';

const { proxyAPIVersion, cfAPIVersion } = environment;

export function createCFRequest(state: AppState, cnsi: string, options: RequestArgs, paginationOptions?: {
  paginationKey: string;
  entityKey: string;
}): Request {

  // Apply the params from the store
  if (paginationOptions && paginationOptions.paginationKey) {
    options.params = new URLSearchParams();
    const paginationParams =
      getCFPaginationParams(selectPaginationState(paginationOptions.entityKey, paginationOptions.paginationKey)(state));
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
  options.headers = addCFBaseHeaders(cnsi || state.requestData[cnsisStoreNames.section][cnsisStoreNames.type], options.headers);

  return new Request(options);
}

export function getActionFromString(type: string) {
  return { type };
}

export function addCFBaseHeaders(cnsis: CNSISModel[] | string, header: Headers): Headers {
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

export function getCFPaginationParams(paginationState: PaginationEntityState): PaginationParam {
  return {
    ...paginationState.params,
    page: paginationState.currentPage.toString(),
  };
}

export function getCFErrors(resData) {
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

export function createClearPaginationAction(apiAction): ClearPaginationOfType {
  if (
    apiAction.options.method === 'post' || apiAction.options.method === RequestMethod.Post ||
    apiAction.options.method === 'delete' || apiAction.options.method === RequestMethod.Delete
  ) {
    return new ClearPaginationOfType(apiAction.entityKey);
  }
  return null;
}

