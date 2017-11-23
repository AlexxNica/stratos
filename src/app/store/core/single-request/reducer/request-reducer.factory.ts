import { ApiActionTypes } from '../../actions/api.actions';
import { startRequest } from './start-request';
import { succeedRequest } from './succeed-request';
import { failRequest } from './fail-request';
import { RequestMethod } from '@angular/http';
import { IActionTypes } from '../common';

// NJ: Allow setting the update flag of arbitrary entity from any request.
// Currently we just using apiAction.guid the actions entity type and the http method
// to work out where and if we should set the creating flag.
// We should allow extra config that points to any entity type and doesn't rely on http method.

export function responseReducerFactory(types: IActionTypes, defaultState: any) {
  const [startType, successType, failedType] = types;
  return (state = defaultState, action) => {
    const actionType = action.apiType || action.type;
    switch (actionType) {
      case startType:
        return startRequest(state, action);
      case successType:
        return succeedRequest(state, action);
      case failedType:
        return failRequest(state, action);
      default:
        return state;
    }
  };
}

