import { APIAction, WrapperAPIActionSuccess } from '../../types/api.types';
import {
  createRequestStateFromResponse,
  getEntityRequestState,
  getRequestTypeFromMethod,
  mergeUpdatingState,
  setEntityRequestState,
} from './common';
import { mergeState } from '../../helpers/reducer.helper';

export const succeedRequest = (state, action) => {
  if (action.apiAction.guid) {
    const apiAction = action.apiAction as APIAction;
    const requestTypeSuccess = getRequestTypeFromMethod(apiAction.options.method);
    const successAction = action as WrapperAPIActionSuccess;

    const requestSuccessState = getEntityRequestState(state, apiAction);
    if (apiAction.updatingKey) {
      requestSuccessState.updating = mergeUpdatingState(
        apiAction,
        requestSuccessState.updating,
        {
          busy: false,
          error: false,
          message: '',
        }
      );
    } else if (requestTypeSuccess === 'delete') {
      requestSuccessState.deleting.busy = false;
      requestSuccessState.deleting.deleted = true;
    } else {
      requestSuccessState.fetching = false;
      requestSuccessState.error = false;
      requestSuccessState.creating = false;
      requestSuccessState.response = successAction.response;
    }

    const newState = mergeState(
      createRequestStateFromResponse(successAction.response.entities, state),
      setEntityRequestState(state, requestSuccessState, action.apiAction)
    );

    return newState;
  } else if (action.response && action.response.entities) {
    const { entities } = action.response;
    return createRequestStateFromResponse(entities, state);
  }
  return state;
};
