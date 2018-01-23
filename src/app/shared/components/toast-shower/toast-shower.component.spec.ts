import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastShowerComponent } from './toast-shower.component';

describe('ToastShowerComponent', () => {
  let component: ToastShowerComponent;
  let fixture: ComponentFixture<ToastShowerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ToastShowerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ToastShowerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
