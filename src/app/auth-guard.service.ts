import { AuthState } from './store/reducers/auth.reducer';
import { Observable } from 'rxjs/Rx';
import { VerifySession } from './store/actions/auth.actions';
import { Store } from '@ngrx/store';
import { AppState } from './store/app-state';
import { CanActivate, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/skipWhile';

@Injectable()
export class AuthGuardService implements CanActivate {

  constructor(
    private store: Store<AppState>,
    private router: Router
  ) { }

  canActivate(): Observable<boolean> {
      return this.store.select('auth')
        .map((state: AuthState) => {
          if (!state.verifying) {
            this.store.dispatch(new VerifySession());
          }
          return state;
        })
        .skipWhile((state: AuthState) => {
          return !state.sessionData;
        })
        .map(state => {
          if (state.sessionData.valid) {
            console.log('valid');
            return true;
          } else {
              this.router.navigateByUrl('/login');
              return false;
          }
      });
  }

}