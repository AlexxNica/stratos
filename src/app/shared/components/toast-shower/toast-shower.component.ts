import { Subscription } from 'rxjs/Subscription';
import { EntityMonitor } from './../../../core/entity-monitor';
import { Observable } from 'rxjs/Observable';
import { selectEntity, selectRequestInfo } from '../../../store/selectors/api.selectors';
import { Store } from '@ngrx/store';
import { AppState } from './../../../store/app-state';
import { ToastShowerConfig } from './toast-shower.types';
import { Component, OnInit, Input } from '@angular/core';
import { map, withLatestFrom } from 'rxjs/operators';
import { pairwise } from 'rxjs/operators/pairwise';
import { ShowSnackBar } from '../../../store/actions/snackBar.actions';

interface InternalToastShowerConfig extends ToastShowerConfig {
  isPaginated: boolean;
  isUpdate: boolean;
}

@Component({
  selector: 'app-toast-shower',
  templateUrl: './toast-shower.component.html',
  styleUrls: ['./toast-shower.component.scss']
})
export class ToastShowerComponent implements OnInit {

  private showSub: Subscription;
  private message$: Observable<string>;

  @Input('config') config: ToastShowerConfig;

  constructor(private store: Store<AppState>) { }

  ngOnInit() {
    const fullConfig = this.getFullConfig(this.config);
    this.init(fullConfig);

  }

  private getFullConfig(ToastShowerConfig): InternalToastShowerConfig {
    const { paginationKey, updateKey } = this.config;
    const isPaginated = !!paginationKey;
    const isUpdate = !!updateKey;
    return {
      ...this.config,
      isPaginated,
      isUpdate
    };
  }

  private init(config: InternalToastShowerConfig) {
    const singleEntityMonitor = new EntityMonitor(this.store, this.config.entityKey, this.config.entityId);
    const entityRequestSelect$ = this.store.select(selectRequestInfo(config.entityKey, config.entityId));

    this.showSub = singleEntityMonitor
      .errored$.pipe(
      withLatestFrom(singleEntityMonitor.message$)
      ).subscribe(([error, message]) => {
        if (error) {
          this.store.dispatch(new ShowSnackBar(message));
        }
      });
  }

}
