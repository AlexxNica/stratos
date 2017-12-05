import { cleanUpControl } from '@angular/forms/src/directives/shared';
import { Injectable } from '@angular/core';
import { Actions, Effect } from '@ngrx/effects';
import { Store, Action } from '@ngrx/store';
import { AppState } from '../app-state';
import { GetAppStats } from '../actions/application.actions';
import { NonApiActionTypes } from '../actions/request.actions';
import { StartNoneCFAction, WrapperNoneCFActionSuccess, WrapperNoneCFActionFailed, GenericCFRequestAction } from '../types/request.types';
import { getActionFromString, createCFRequest, getCFErrors, createClearPaginationAction } from '../helpers/effects.helper';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { normalize } from 'normalizr';

@Injectable()
export class ApplicationEffects {

  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    private http: Http,
  ) { }

  @Effect() appSummary$ = this.actions$.ofType<GenericCFRequestAction>(NonApiActionTypes.REQUEST)
    .withLatestFrom(this.store)
    .mergeMap(([action, state]: [GenericCFRequestAction, AppState]) => {
      console.log('Effect - Starting request', action);

      this.store.dispatch(new StartNoneCFAction(action, action.requestType));
      this.store.dispatch(getActionFromString(action.actions[0]));

      const request = createCFRequest(state, action.cnis, action.options);

      return this.http.request(request)
        .mergeMap(response => {
          console.log('Effect - Received response', action);
          let resData;
          try {
            resData = response.json();
          } catch (e) {
            resData = null;
          }
          if (resData) {
            const cnsisErrors = getCFErrors(resData);
            if (cnsisErrors.length) {
              // We should consider not completely failing the whole if some cnsis return.
              throw Observable.throw(`Error from cnsis: ${cnsisErrors.map(res => `${res.guid}: ${res.error}.`).join(', ')}`);
            }
          }

          const mappedData = {
            entities: {
              [action.entityKey]: {}
            },
            result: []
          };
          Object.keys(resData).forEach(cnsiGuid => {
            // Assume this is not a collection of objects...
            const entity = {
              ...resData[cnsiGuid],
              guid: action.guid
            };
            mappedData.entities[action.entityKey][action.guid] = entity;
            mappedData.result.push(action.guid);
          });
          // TODO: RC Normalise entities collection

          const actions: Action[] = [
            new WrapperNoneCFActionSuccess(mappedData, action, action.requestType),
            getActionFromString(action.actions[1]),
          ];

          const clearAction = createClearPaginationAction(action);
          if (clearAction) {
            actions.unshift(clearAction);
          }
          console.log('Effect - Returning actions', action);
          return actions;
        })
        .catch(err => [
          new WrapperNoneCFActionFailed(err.message, action, action.requestType),
          getActionFromString(action.actions[2])
        ]);
    });

}
