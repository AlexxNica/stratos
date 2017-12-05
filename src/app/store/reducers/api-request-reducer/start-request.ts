import { IStartRequestAction, RequestAction } from '../../types/request.types';
import {
  getEntityRequestState,
  getRequestTypeFromMethod,
  mergeUpdatingState,
  modifyRequestWithRequestType,
  setEntityRequestState,
} from './request-helpers';

export function startRequest(state, action: IStartRequestAction) {
  console.log('startRequest: ', action.apiAction); // TODO: RC REMOVE
  if (!action.apiAction.guid) {
    return state;
  }
  const apiAction = action.apiAction as RequestAction;
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
      action.requestType
    );
  }
  return setEntityRequestState(state, requestState, action.apiAction);
}
