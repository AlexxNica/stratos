import { selectEntity, selectRequestInfo, selectUpdateInfo } from '../store/selectors/api.selectors';
import { APIResource } from './../store/types/api.types';
import { Observable } from 'rxjs/Rx';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app-state';
import { RequestInfoState } from '../store/reducers/api-request-reducer/types';
import { map, distinctUntilChanged, shareReplay, filter } from 'rxjs/operators';
import { combineLatest } from 'rxjs/observable/combineLatest';

export class EntityMonitor<T = APIResource> {

  get$: Observable<T>;
  monitorRequest$: Observable<RequestInfoState>;

  creating$: Observable<boolean>;
  fetching$: Observable<boolean>;
  deleting$: Observable<boolean>;
  errored$: Observable<boolean>;
  message$: Observable<string>;

  constructor(
    private store: Store<AppState>,
    public entityId: string,
    public entityKey: string
  ) {
    this.init(this.store, entityId, entityKey);
  }

  init(store, id, entityKey) {
    this.get$ = store.select(selectEntity(entityKey, id)).pipe(
      filter(ent => !!ent),
      shareReplay(1)
    );
    this.monitorRequest$ = store.select(selectRequestInfo(entityKey, id)).pipe(
      filter(monitor => {
        debugger;
        return !!monitor;
      }),
      shareReplay(1)
    );
    this.fetching$ = this.monitorRequest$.pipe(
      map(req => req.fetching),
      distinctUntilChanged(),
      shareReplay(1)
    );
    this.creating$ = this.monitorRequest$.pipe(
      map(req => req.creating),
      distinctUntilChanged(),
      shareReplay(1)
    );
    this.deleting$ = this.monitorRequest$.pipe(
      map(req => req.deleting.busy),
      distinctUntilChanged(),
      shareReplay(1)
    );
    this.errored$ = this.monitorRequest$.pipe(
      map(monitor => {
        return monitor.error && monitor.deleting.busy && !monitor.creating && !monitor.fetching;
      }),
      shareReplay(1)
    );
    this.message$ = this.monitorRequest$.pipe(
      map(monitor => {
        return monitor.message;
      })
    );
  }

  updating(updatingKey: string) {
    return this.store.select(selectUpdateInfo(this.entityKey, this.entityId, updatingKey));
  }

}
