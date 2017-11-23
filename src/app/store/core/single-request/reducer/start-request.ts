import { APIAction } from '../../types/api.types';
import {
  getEntityRequestState,
  getRequestTypeFromMethod,
  mergeUpdatingState,
  modifyRequestWithRequestType,
  setEntityRequestState,
} from './common';
export const startRequest = (state, action) => {
  if (!action.apiAction.guid) {
    return state;
  }
  const apiAction = action.apiAction as APIAction;
  const requestTypeStart = getRequestTypeFromMethod(apiAction.options.method);
  let requestState = getEntityRequestState(state, apiAction);

  if (apiAction.updatingKey) {
    requestState.updating = mergeUpdatingState(
      apiAction,
      requestState.updating,
      {
        busy: true,
        error: false,
        message: '',
      }
    );
  } else {
    requestState = modifyRequestWithRequestType(
      requestState,
      requestTypeStart
    );
  }
  return setEntityRequestState(state, requestState, action.apiAction);
};

