import { NormalizedResponse } from '../types/api.types';
import { Observable } from 'rxjs/Rx';
import {
  CONNECT_CNSIS,
  ConnectCnis,
  GET_CNSIS,
  GetAllCNSIS,
  GetAllCNSISFailed,
  GetAllCNSISSuccess,
  GetAllCNSIEntities,
} from './../actions/cnsis.actions';
import { AppState } from './../app-state';
import { Injectable } from '@angular/core';
import { Headers, Http, URLSearchParams } from '@angular/http';
import { Action, Store } from '@ngrx/store';
import { Actions, Effect } from '@ngrx/effects';
import { CNSISModel, cnsisStoreNames } from '../types/cnsis.types';
import {
  IAPIAction, NoneCFSuccessAction, StartNoneCFAction, WrapperNoneCFActionFailed, WrapperNoneCFActionSuccess, ICFAction
} from '../types/request.types';
import { ApiActionTypes } from '../actions/request.actions';


@Injectable()
export class CNSISEffect {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) { }

  @Effect() getAllCNSIS$ = this.actions$.ofType<GetAllCNSIS>(GET_CNSIS)
    .flatMap(action => {
      const actionType = 'fetch';
      // const apiAction = {
      //   entityKey: cnsisStoreNames.type,
      // } as ICFAction;
      const apiAction = {
        entityKey: cnsisStoreNames.type,
      } as ICFAction;
      this.store.dispatch(new StartNoneCFAction(apiAction, actionType));
      // this.store.dispatch(new GetAllCNSIEntities());

      return Observable.zip(
        this.http.get('/pp/v1/cnsis'),
        this.http.get('/pp/v1/cnsis/registered'),
        (all, registered) => {
          const allCnsis: CNSISModel[] = all.json();
          const registeredCnsis: CNSISModel[] = registered.json();

          return allCnsis.map(c => {
            c.registered = !!registeredCnsis.find(r => r.guid === c.guid);
            return c;
          });
        }
      )
        .mergeMap(data => {
          const mappedData = {
            entities: {
              cnsis: {}
            },
            result: []
          };
          data.forEach(cnsi => {
            mappedData.entities.cnsis[cnsi.guid] = cnsi;
            mappedData.result.push(cnsi.guid);
          });
          // Order is important. Need to ensure data is written (the non-cf success action) before we notify everything is loaded
          // (the cnsi success action)
          return [
            new WrapperNoneCFActionSuccess(mappedData, apiAction, actionType),
            new GetAllCNSISSuccess(data, action.login),
          ];
        })
        .catch((err, caught) => [
          new WrapperNoneCFActionFailed(err.message, apiAction, actionType),
          new GetAllCNSISFailed(err.message, action.login),
        ]);

    });

  @Effect() connectCnis$ = this.actions$.ofType<ConnectCnis>(CONNECT_CNSIS)
    .flatMap(action => {
      const actionType = 'update';
      const apiAction = {
        entityKey: cnsisStoreNames.type,
        guid: action.cnsiGuid,
        updatingKey: 'connecting',
        type: ApiActionTypes.API_REQUEST,
      } as ICFAction;
      this.store.dispatch(new StartNoneCFAction(apiAction, actionType));
      return this.http.post('/pp/v1/auth/login/cnsi', {}, {
        params: {
          cnsi_guid: action.cnsiGuid,
          username: action.username,
          password: action.password
        }
      }).do(() => {
        // return this.store.dispatch(new WrapperNoneCFActionFailed('Could not connect', apiAction));
      })
        .catch(e => {
          return [new WrapperNoneCFActionFailed('Could not connect', apiAction, actionType)];
        });
    });
}
