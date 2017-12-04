import { RequestState } from '../store/reducers/api-request-reducer/types';
import { ApplicationService, ApplicationData } from '../features/applications/application.service';
import { Observable } from 'rxjs/Observable';
import { EntityInfo } from '../store/types/api.types';

export class ApplicationServiceMock {
  cfGuid = 'mockCfGuid';
  appGuid = 'mockAppGuid';
  application$: Observable<ApplicationData> = Observable.of(({
    app: {
      metadata: {},
      entity: {
      },
      entityRequestInfo: {} as RequestState
    } as EntityInfo,
    stack: {
      entity: {
      },
    },
    organisation: {
      entity: {
      },
    },
    space: {
      entity: {

      }
    },
    fetching: false
  } as ApplicationData));
  // TODO: RC
  appSummary$: Observable<any> = Observable.of(({ metadataRequestState: { fetching: {} } } as any));
  isFetchingApp$: Observable<boolean> = Observable.of(false);
  isFetchingEnvVars$: Observable<boolean> = Observable.of(false);
  isUpdatingEnvVars$: Observable<boolean> = Observable.of(false);
  waitForAppEntity$: Observable<EntityInfo> = Observable.of({
    entity: {
      entity: {

      }
    }
  } as EntityInfo);
  setApplication() { }
}
