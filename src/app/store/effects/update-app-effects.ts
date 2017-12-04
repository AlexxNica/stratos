import { WrapperCFActionSuccess } from '../types/request.types';
import { Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';
import { Actions, Effect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Rx';

import { environment } from '../../../environments/environment';
import {
  AppNameFree,
  AppNameTaken,
  CHECK_NAME,
  IsNewAppNameFree
} from '../actions/create-applications-page.actions';
import { AppState } from './../app-state';
import { UpdateExistingApplication, UPDATE_SUCCESS, GetApplication, UPDATE, GetAppEnvVars } from '../actions/application.actions';
import { ApiActionTypes } from '../actions/request.actions';


@Injectable()
export class UpdateAppEffects {

  constructor(
    private http: Http,
    private actions$: Actions,
    private store: Store<AppState>
  ) {
  }

  @Effect() UpdateAppInStore$ = this.actions$.ofType<WrapperCFActionSuccess>(UPDATE_SUCCESS)
    .mergeMap((action: WrapperCFActionSuccess) => {

      const actions = [
        // This is done so the app metadata env vars environment_json matches that of the app. Is this needed anymore?
        new GetAppEnvVars(action.apiAction.guid, action.apiAction.cnis)
      ];
      return actions;
    });

}
