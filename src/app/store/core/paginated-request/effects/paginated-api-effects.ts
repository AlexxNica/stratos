import { makeApiRequest, getPaginationParams } from '../../common';
import { environment } from '../../../../environments/environment';
import { AppState } from '../../app-state';
import { Store } from '@ngrx/store';
import { Http, URLSearchParams, RequestMethod } from '@angular/http';
import { IActionTypes } from '../common';
import { Actions, Effect } from '@ngrx/effects';
import { APIAction } from '../request/types';
import { PaginatedAction } from '../../types/pagination.types';
import { selectPaginationState } from '../../selectors/pagination.selectors';
import { ClearPaginationOfType } from '../../../actions/pagination.actions';

const { proxyAPIVersion, cfAPIVersion } = environment;

export class PaginatedAPIEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>,
    private apiActions: IActionTypes
  ) {
    this.startAction = apiActions[0];
    this.successAction = apiActions[1];
    this.errorAction = apiActions[2];
  }

  private startAction;
  private successAction;
  private errorAction;

  // @Effect() apiRequestStart$ = this.actions$.ofType<APIAction>(ApiActionTypes.API_REQUEST)
  //   .map(apiAction => {
  //     return new StartAPIAction(apiAction);
  //   });

  @Effect() apiRequest$ = this.actions$.ofType<PaginatedAction>(this.startAction)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]) => {

      const paramsObject = {};
      const options = { ...action.options };

      options.params = new URLSearchParams();
      // TODO: q params may also come from a standard api request
      const paginationParams = getPaginationParams(selectPaginationState(action.entityKey, action.paginationKey)(state));
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

      options.url = `/pp/${proxyAPIVersion}/proxy/${cfAPIVersion}/${options.url}`;
      options.headers = addBaseHeaders(action.cnis || state.cnsis.entities, options.headers);

      return makeApiRequest(this.http, options, action).map(actions => {
        if (
          action.options.method === 'post' || action.options.method === RequestMethod.Post ||
          action.options.method === 'delete' || action.options.method === RequestMethod.Delete
        ) {
          actions.unshift(new ClearPaginationOfType(action.entityKey));
        }
        return actions;
      });

    });


}
