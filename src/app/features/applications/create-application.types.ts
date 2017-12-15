import { AbstractControl } from '@angular/forms/src/model';

export interface CreateAppStep {
    stepControl: AbstractControl;
    onNext?: () => void;
}
