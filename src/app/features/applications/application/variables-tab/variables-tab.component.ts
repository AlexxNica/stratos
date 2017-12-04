import {
  TableHeaderSelectComponent,
} from '../../../../shared/components/table/table-header-select/table-header-select.component';
import { TableCellSelectComponent } from '../../../../shared/components/table/table-cell-select/table-cell-select.component';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy, EventEmitter } from '@angular/core';
import { ApplicationService } from '../../application.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs/Rx';
import { DataSource } from '@angular/cdk/table';
import { MdPaginator, PageEvent, MdSort, Sort, MdInput } from '@angular/material';

import { UpdateApplication, ApplicationSchema } from '../../../../store/actions/application.actions';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/app-state';
import { NgModel } from '@angular/forms';
import { EntityInfo } from '../../../../store/types/api.types';
import { CfAppEvnVarsDataSource, AppEnvVar } from '../../../../shared/data-sources/cf-app-variables-data-source';
import { TableCellEditComponent } from '../../../../shared/components/table/table-cell-edit/table-cell-edit.component';
import {
  TableCellEditVariableComponent
} from '../../../../shared/components/table/custom-cells/table-cell-edit-variable/table-cell-edit-variable.component';
import { CardAppVariableComponent } from '../../../../shared/components/cards/custom-cards/card-app-variable/card-app-variable.component';
import { ITableColumn } from '../../../../shared/components/table/table.types';


@Component({
  selector: 'app-variables-tab',
  templateUrl: './variables-tab.component.html',
  styleUrls: ['./variables-tab.component.scss']
})
export class VariablesTabComponent implements OnInit, OnDestroy {

  constructor(private store: Store<AppState>, private appService: ApplicationService) { }

  envVarsDataSource: CfAppEvnVarsDataSource;
  envVars$: Observable<any>;
  columns: Array<ITableColumn<AppEnvVar>> = [
    {
      columnId: 'select', headerCellComponent: TableHeaderSelectComponent, cellComponent: TableCellSelectComponent,
      class: 'table-column-select', cellFlex: '1'
    },
    {
      columnId: 'name', headerCell: () => 'Name', cell: (row: AppEnvVar) => `${row.name}`, sort: true, cellFlex: '3'
    },
    {
      columnId: 'value', headerCell: () => 'Value', cellComponent: TableCellEditVariableComponent, sort: true, cellFlex: '4'
    },
    {
      columnId: 'edit', headerCell: () => '', cellComponent: TableCellEditComponent, class: 'table-column-edit', cellFlex: '1'
    },
  ];
  cardComponent = CardAppVariableComponent;

  ngOnInit() {
    this.envVarsDataSource = new CfAppEvnVarsDataSource(this.store, this.appService);
    this.envVars$ = this.appService.appEnvVars$;
  }

  ngOnDestroy() {
    this.envVarsDataSource.destroy();
  }

}
