import { Action, compose, Store } from '@ngrx/store';
import { denormalize, Schema } from 'normalizr';
import { PaginationAction, PaginationEntityState, QParam, PaginationParam, PaginatedAction } from '../types';
import { IActionTypes } from '../../types';
import {
  SET_PAGE,
  SET_PARAMS,
  ADD_PARAMS,
  REMOVE_PARAMS,
  SetParams,
  AddParams,
  RemoveParams,
  SetPage,
  CLEAR_PAGES,
  CLEAR_PAGINATION_OF_TYPE
} from '../core.actions';

export const resultPerPageParam = 'results-per-page';
export const resultPerPageParamDefault = 5;

const defaultPaginationEntityState = {
  fetching: false,
  pageCount: 0,
  currentPage: 1,
  totalResults: 0,
  ids: {},
  params: {
    [resultPerPageParam]: resultPerPageParamDefault
  },
  error: false,
  message: ''
};

export function paginationReducer(types: IActionTypes) {
  return function (state = {}, action: PaginationAction) {
    if (action.paginationKey) {
      state = {
        ...state, ...{
          [action.paginationKey]: { ...defaultPaginationEntityState }
        }
      };
    }
    return compose(
      composeableReducer(baseReducer, action),
      composeableReducer(paramReducer, action),
      composeableReducer(pageReducer, action),
    )(state);
  };
}

function composeableReducer(reducer, action) {
  return function (state) {
    return reducer(state, action);
  };
}

function baseReducer(state, action) {
  switch (action.type) {
    case CLEAR_PAGINATION_OF_TYPE:
      const clearState = { ...state };
      clearState[action.entityKey] = {};
      return clearState;
    default:
      return state;
  }
}

function pageReducer(state, action) {
  switch (action.type) {
    case SET_PAGE:
      return {
        ...state,
        error: false,
        currentPage: (action as SetPage).pageNumber
      };
    case CLEAR_PAGES:
      const newState = { ...state };
      const entityState = {
        ...newState[action.entityKey],
        [action.paginationKey]: {
          ...newState[action.entityKey][action.paginationKey],
          ids: {},
          fetching: false,
          pageCount: 0,
          currentPage: 1,
          totalResults: 0,
          error: false,
          message: ''
        }
      };
      return {
        ...newState,
        [action.entityKey]: entityState
      };
    default:
      return state;
  }
}

function paramReducer(state, action) {
  switch (action.type) {
    case SET_PARAMS:
      const setParamAction = action as SetParams;
      return {
        ...state,
        params: removeEmptyParams({
          // TODO: Every time we call SET_PARAMS this will reset to default. Should this change to 'INIT_PARAMS'?
          [resultPerPageParam]: resultPerPageParamDefault,
          ...setParamAction.params,
          q: getUniqueQParams(setParamAction, state)
        })
      };
    case ADD_PARAMS:
      const addParamAction = action as AddParams;
      return {
        ...state,
        params: removeEmptyParams({
          ...state.params,
          ...addParamAction.params,
          q: getUniqueQParams(addParamAction, state)
        })
      };
    case REMOVE_PARAMS:
      const removeParamAction = action as RemoveParams;
      const removeParamsState = {
        ...state,
        params: {
          ...state.params,
          q: state.params.q.filter((qs: QParam) => {
            return !removeParamAction.qs.find((removeParamKey: string) => qs.key === removeParamKey);
          })
        }
      };
      removeParamAction.params.forEach((key) => {
        if (removeParamsState.params.hasOwnProperty(key)) {
          delete removeParamsState.params[key];
        }
      });
      return removeParamsState;
    default:
      return state;
  }
}

function reducerFactory(types: IActionTypes) {
  const [requestType, successType, failureType] = types;
  function reducer(state: PaginationEntityState = defaultPaginationEntityState, action): PaginationEntityState {
    switch (action.type) {
      case requestType:
        return {
          ...state,
          fetching: true,
          error: false,
          message: '',
        };
      case successType:
        const params = {};
        const { apiAction } = action;
        if (apiAction.options.params) {
          apiAction.options.params.paramsMap.forEach((value, key) => {
            const paramValue = value.length === 1 ? value[0] : value;
            params[key] = paramValue;
          });
        }
        return {
          ...state,
          fetching: false,
          error: false,
          message: '',
          ids: {
            ...state.ids,
            [state.currentPage]: action.response.result
          },
          pageCount: state.pageCount + 1,
          totalResults: action.totalResults || action.response.result.length
        };
      case failureType:
        return {
          ...state,
          fetching: false,
          error: true,
          message: action.message
        };
      default:
        return state;
    }
  }
}

export function qParamsToString(params: QParam[]) {
  return params.map(joinQParam);
}

function joinQParam(q: QParam) {
  return `${q.key}${q.joiner}${(q.value as string[]).join ? (q.value as string[]).join(',') : q.value}`;
}

function getUniqueQParams(action: AddParams | SetParams, state) {
  let qStatePrams: QParam[] = [].concat(state.params.q || []);
  const qActionPrams: QParam[] = [].concat(action.params.q || []);

  // Update existing q params
  for (const actionParam of qActionPrams) {
    const existingParam = qStatePrams.findIndex((stateParam: QParam) => stateParam.key === actionParam.key);
    if (existingParam >= 0) {
      qStatePrams[existingParam] = { ...actionParam };
    } else {
      qStatePrams.push(actionParam);
    }
  }

  //  Ensure q params are unique
  if (action.params.q) {
    qStatePrams = qStatePrams.concat(qActionPrams)
      .filter((q, index, self) => self.findIndex(
        (qs) => {
          return qs.key === q.key;
        }
      ) === index)
      .filter((q: QParam) => {
        // Filter out empties
        return !!q.value;
      });
  }
  return qStatePrams;
}

function removeEmptyParams(params: PaginationParam) {
  const newObject = {};
  Object.keys(params).forEach(key => {
    if (params[key]) {
      newObject[key] = params[key];
    }
  });
  return newObject;
}

function getActionType(action) {
  return action.apiType || action.type;
}

function getAction(action): PaginatedAction {
  if (!action) {
    return null;
  }
  return action.apiAction ? action.apiAction : action;
}

function getActionKey(action) {
  const apiAction = getAction(action);
  return apiAction.entityKey || null;
}

function getPaginationKey(action) {
  const apiAction = getAction(action);
  return apiAction.paginationKey;
}

export const getPaginationObservables = (function () {
  const mem = {};
  return function (
    { store, action, schema }: { store: Store<AppState>, action: PaginatedAction, schema: Schema },
    uid?: string
  ): {
      entities$: Observable<any[]>,
      pagination$: Observable<PaginationEntityState>
    } {
    const _key = action.entityKey + action.paginationKey + (uid || '');
    if (mem[_key]) {
      return mem[_key];
    }
    const { entityKey, paginationKey } = action;

    if (action.initialParams) {
      store.dispatch(new SetParams(entityKey, paginationKey, action.initialParams));
    }

    const paginationSelect$ = store.select(selectPaginationState(entityKey, paginationKey));

    const pagination$: Observable<PaginationEntityState> = paginationSelect$
      .filter(pagination => !!pagination);

    const entities$: Observable<any[]> = paginationSelect$
      .do(pagination => {
        if (!hasError(pagination) && !hasValidOrGettingPage(pagination)) {
          store.dispatch(action);
        }
      })
      .filter(pagination => {
        return isPageReady(pagination);
      })
      .withLatestFrom(store.select(getEntityState))
      .map(([paginationEntity, entities]) => {
        const page = paginationEntity.ids[paginationEntity.currentPage];
        return page ? denormalize(page, schema, entities) : null;
      });

    const obs = {
      pagination$,
      entities$
    };

    mem[_key] = obs;
    return obs;
  };
})();

function isPageReady(pagination: PaginationEntityState) {
  return !!pagination && !!pagination.ids[pagination.currentPage];
}

function hasValidOrGettingPage(pagination: PaginationEntityState) {
  if (pagination && Object.keys(pagination).length) {
    const hasPage = !!pagination.ids[pagination.currentPage];

    return pagination.fetching || hasPage;
  } else {
    return false;
  }
}

function hasError(pagination: PaginationEntityState) {
  return pagination && pagination.error;
}


