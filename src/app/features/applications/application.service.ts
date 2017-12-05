import { EntityService } from '../../core/entity-service';
import { cnsisEntitiesSelector } from '../../store/selectors/cnsis.selectors';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';

import { ApplicationSchema } from '../../store/actions/application.actions';
import {
  GetApplication,
  UpdateApplication,
  UpdateExistingApplication,
  GetAppStats,
  GetAppSummary,
  GetAppEnvVars,
} from '../../store/actions/application.actions';
import { AppState } from '../../store/app-state';

import { ApplicationEnvVarsService, EnvVarStratosProject } from './application/build-tab/application-env-vars.service';
import {
  ApplicationStateData,
  ApplicationStateService,
} from './application/build-tab/application-state/application-state.service';
import { EntityInfo } from '../../store/types/api.types';
import { EntityServiceFactory } from '../../core/entity-service-factory.service';
import {
  AppSummarySchema, AppSummaryStoreNames, AppStatsSchema, AppStatsStoreNames, AppEnvVarsSchema, AppEnvVarsStoreNames
} from '../../store/types/application.types';

export interface ApplicationData {
  fetching: boolean;
  app: EntityInfo;
  space: EntityInfo;
  organisation: EntityInfo;
  stack: EntityInfo;
  cf: any;
}

@Injectable()
export class ApplicationService {

  constructor(
    private store: Store<AppState>,
    private entityServiceFactory: EntityServiceFactory,
    private appEntityService: EntityService,
    private appStateService: ApplicationStateService,
    private appEnvVarsService: ApplicationEnvVarsService) {
  }

  // NJ: This needs to be cleaned up. So much going on!
  isFetchingApp$: Observable<boolean>;
  isUpdatingApp$: Observable<boolean>;

  isDeletingApp$: Observable<boolean>;

  isFetchingEnvVars$: Observable<boolean>;
  isUpdatingEnvVars$: Observable<boolean>;
  isFetchingStats$: Observable<boolean>;

  app$: Observable<EntityInfo>;
  waitForAppEntity$: Observable<EntityInfo>;

  appSummary$: Observable<any>; // TODO: RC
  appStatsGated$: Observable<null | any>; // TODO: RC
  appEnvVars$: Observable<any>; // TODO: RC

  application$: Observable<ApplicationData>;
  applicationStratProject$: Observable<EnvVarStratosProject>;
  applicationState$: Observable<ApplicationStateData>;

  appGuid: string;
  cfGuid: string;

  isEntityComplete(value, requestInfo: { fetching: boolean }): boolean {
    if (requestInfo) {
      return !requestInfo.fetching;
    } else {
      return !!value;
    }
  }

  setApplication(cfGuid, appGuid) {
    this.appGuid = appGuid;
    this.cfGuid = cfGuid;

    // First set up all the base observables
    this.app$ = this.appEntityService.entityObs$;

    const appSummaryService = this.entityServiceFactory.create(
      AppSummarySchema.key,
      AppSummarySchema,
      appGuid,
      new GetAppSummary(appGuid, cfGuid),
      AppSummaryStoreNames.section
    );

    const appStatsService = this.entityServiceFactory.create(
      AppStatsSchema.key,
      AppStatsSchema,
      appGuid,
      new GetAppStats(appGuid, cfGuid),
      AppStatsStoreNames.section
    );

    const appEnvVarsService = this.entityServiceFactory.create(
      AppEnvVarsSchema.key,
      AppEnvVarsSchema,
      appGuid,
      new GetAppEnvVars(appGuid, cfGuid),
      AppEnvVarsStoreNames.section
    );

    this.isDeletingApp$ = this.appEntityService.isDeletingEntity$;

    this.waitForAppEntity$ = this.appEntityService.waitForEntity$;

    this.appSummary$ = this.waitForAppEntity$.mergeMap(() => appSummaryService.entityObs$);

    // Subscribing to this will make the stats call. It's better to subscribe to appStatsGated$
    const appStats$ = this.waitForAppEntity$.take(1).mergeMap(() => appStatsService.entityObs$);

    this.appEnvVars$ = this.waitForAppEntity$.take(1).mergeMap(() => appEnvVarsService.entityObs$);

    // Assign/Amalgamate them to public properties (with mangling if required)

    this.appStatsGated$ = this.waitForAppEntity$
      .filter(ai => ai && ai.entity && ai.entity.entity)
      .mergeMap(ai => {
        if (ai.entity.entity.state === 'STARTED') {
          return appStats$;
        } else {
          return Observable.of(null);
        }
      });

    this.application$ = this.waitForAppEntity$
      .combineLatest(
      this.store.select(cnsisEntitiesSelector),
    )
      .filter(([{ entity, entityRequestInfo }, cnsis]: [EntityInfo, any]) => {
        return entity && entity.entity && entity.entity.cfGuid && entity.entity.space && entity.entity.space.entity.organization;
      })
      .map(([{ entity, entityRequestInfo }, cnsis]: [EntityInfo, any]): ApplicationData => {
        return {
          fetching: entityRequestInfo.fetching,
          app: entity,
          space: entity.entity.space,
          organisation: entity.entity.space.entity.organization,
          stack: entity.entity.stack,
          cf: cnsis[entity.entity.cfGuid],
        };
      });

    this.applicationState$ = this.waitForAppEntity$
      .combineLatest(this.appStatsGated$)
      .map(([appInfo, appStats]: [EntityInfo, any]) => {
        // TODO: RC any?
        return this.appStateService.get(appInfo.entity.entity, appStats ? appStats.metadata : null);
      });

    this.applicationStratProject$ = this.appEnvVars$.map(applicationEnvVars => {
      return this.appEnvVarsService.ExtractStratosProject(applicationEnvVars.metadata);
    });


    /**
     * An observable based on the core application entity
    */
    this.isFetchingApp$ = Observable.combineLatest(
      this.app$.map(ei => ei.entityRequestInfo.fetching),
      this.appSummary$.map(as => as.entityRequestInfo.fetching)
    )
      .map((fetching) => fetching[0] || fetching[1]);

    this.isUpdatingApp$ =
      this.app$.map(a => {
        const updatingSection = a.entityRequestInfo.updating[UpdateExistingApplication.updateKey] || {
          busy: false
        };
        return updatingSection.busy || false;
      });

    this.isFetchingEnvVars$ = this.appEnvVars$.map(ev => ev.entityRequestInfo.fetching).startWith(false);

    this.isUpdatingEnvVars$ = this.appEnvVars$.map(ev => ev.entityRequestInfo.updating.busy).startWith(false);

    this.isFetchingStats$ =
      this.appStatsGated$.map(appStats => appStats ? appStats.entityRequestInfo.updating.busy : false).startWith(false);

  }

  updateApplication(updatedApplication: UpdateApplication) {
    this.store.dispatch(new UpdateExistingApplication(
      this.appGuid,
      this.cfGuid,
      { ...updatedApplication }
    ));
  }

}
