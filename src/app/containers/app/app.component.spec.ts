import { TestBed, async } from '@angular/core/testing';

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { StoreModule, Store } from '@ngrx/store';
import * as services from './../../services';
import { empty as observableEmpty } from 'rxjs';

import { TranslateModule } from '@ngx-translate/core';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { ClarityModule } from '@clr/angular';

import { DocViewerModule } from './../../components/doc-viewer/doc-viewer.module';
import { ComponentModule } from './../../components';

import { AppComponent } from './app.component';
import { WindowComponent } from '../window/window.component';
import { DirectivesModule } from 'app/directives';
import { ToastrModule } from 'ngx-toastr';
import { SharedModule } from 'app/shared/shared.module';
import { SmartInputModule } from 'app/components/smart-input/smart-input.module';
import { AltairConfig } from 'app/config';

describe('AppComponent', () => {
  beforeEach(async(() => {
    const providers = [
      services.ApiService,
      services.GqlService,
      services.DbService,
      services.WindowService,
      services.DonationService,
      services.ElectronAppService,
      services.KeybinderService,
      services.NotifyService,
      services.StorageService,
      services.PluginRegistryService,
      services.QueryCollectionService,
      { provide: services.QueryService, useValue: {
        loadQuery: () => {},
        loadUrl: () => {},
        loadIntrospection: () => {},
      } },
      { provide: Store, useValue: {
        subscribe: () => observableEmpty(),
        select: () => observableEmpty(),
        map: () => observableEmpty(),
        first: () => observableEmpty(),
        pipe: () => observableEmpty(),
        dispatch: () => {}
      } },
      {
        provide: AltairConfig,
        useValue: new AltairConfig(),
      },
  ];

    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        WindowComponent
      ],
      imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        StoreModule,
        CodemirrorModule,
        ClarityModule,
        DirectivesModule,
        ToastrModule.forRoot(),
        ComponentModule,
        DocViewerModule,
        SmartInputModule,
        TranslateModule.forRoot(),
        SharedModule.forRoot(),
      ],
      providers: providers
    }).compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
