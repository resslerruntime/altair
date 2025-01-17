import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { empty as observableEmpty } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { TranslateModule } from '@ngx-translate/core';

import { SettingsDialogComponent } from './settings-dialog.component';
import { NotifyService, KeybinderService, WindowService, DbService, ElectronAppService, StorageService, GqlService } from 'app/services';
import { ToastrModule } from 'ngx-toastr';
import { Store } from '@ngrx/store';
import { ElectronService } from 'ngx-electron';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'app/shared/shared.module';
import { SchemaFormModule } from '../schema-form/schema-form.module';
import { HttpClientModule } from '@angular/common/http';
import { AltairConfig } from 'app/config';

describe('SettingsDialogComponent', () => {
  let component: SettingsDialogComponent;
  let fixture: ComponentFixture<SettingsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SettingsDialogComponent ],
      imports: [
        HttpClientModule,
        BrowserAnimationsModule,
        FormsModule,
        CodemirrorModule,
        SharedModule,
        ToastrModule.forRoot(),
        TranslateModule.forRoot(),
        SchemaFormModule,
      ],
      providers: [
        NotifyService,
        KeybinderService,
        WindowService,
        DbService,
        ElectronAppService,
        ElectronService,
        StorageService,
        GqlService,
        {
          provide: Store, useValue: {
            subscribe: () => { },
            select: () => [],
            map: () => observableEmpty(),
            dispatch: () => { }
          }
        },
        {
          provide: AltairConfig,
          useValue: new AltairConfig(),
        },
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
