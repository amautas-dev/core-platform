import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { LanguageService } from './core/i18n/language.service';
import { PlatformTranslateLoader } from './core/i18n/translate.loader';
import {
  CustomDateAdapter,
  CUSTOM_DATE_FORMATS,
  provideUiKitData,
  UI_KIT_USER_ID_PROVIDER,
  // PERMISSION_SERVICE_TOKEN, // TODO: Verificar si está exportado en ui-kit
} from 'ui-kit';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { getSpanishPaginatorIntl } from 'ui-kit';
import { SessionService } from './core/session/session.service';
import { LoggingService } from './core/services/logging.service';
import { PROJECT_CONFIG } from './core/config/project-config.token';
import { projectConfig } from './core/config/project.config';
import { PlatformSettingsService } from './features/platform-settings/services/platform-settings.service';
import { QuillModule } from 'ngx-quill';

export const appConfig: ApplicationConfig = {
  providers: [
    // --- HTTP + Interceptores
    // Orden importante: auth -> retry -> loading -> error
    provideHttpClient(
      withInterceptors([
        jwtInterceptor,        // 1. Agregar token JWT
        retryInterceptor,     // 2. Reintentar errores 5xx
        loadingInterceptor,   // 3. Gestionar loading
        errorInterceptor,     // 4. Manejar errores (último)
      ])
    ),

    // --- Core Angular
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    ...provideUiKitData({
      apiUrl: environment.apiUrl,
      timeZone: 'America/Argentina/Buenos_Aires',
      softDeleteFields: {
        active: 'esActivo',
        deactivatedAt: 'fechaBaja',
        deactivatedBy: 'idUsuarioBaja',
      },
      auditFields: {
        createdAt: 'fechaAlta',
        createdBy: 'idUsuarioAlta',
        updatedAt: 'fechaMod',
        updatedBy: 'idUsuarioMod',
      },
    }),
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
    { provide: MatPaginatorIntl, useFactory: getSpanishPaginatorIntl },
    {
      provide: UI_KIT_USER_ID_PROVIDER,
      useFactory: (session: SessionService) => {
        return () => session.user()?.id ?? null;
      },
      deps: [SessionService],
    },
    // TODO: Descomentar cuando PERMISSION_SERVICE_TOKEN esté exportado en ui-kit
    // {
    //   provide: PERMISSION_SERVICE_TOKEN,
    //   useExisting: PermissionService,
    // },
    // Configurar LoggingService (Platform Admin: sin dependencia de /api/error-log/save)
    {
      provide: LoggingService,
      useFactory: () => {
        const logger = new LoggingService();
        logger.configure({
          saveToDatabase: false, // Platform Admin no usa endpoint ALI error-log/save
          sendEmailOnCritical: false,
          errorNotificationEmail: environment.errorNotificationEmail,
          minLogLevel: environment.production ? 1 : 0, // INFO en prod, DEBUG en dev
          keepInMemory: 100,
        });
        return logger;
      },
    },
    // Configuración del proyecto
    {
      provide: PROJECT_CONFIG,
      useValue: projectConfig,
    },
    // ngx-translate: loader from existing TS translations, load saved language on startup
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'es',
        loader: {
          provide: TranslateLoader,
          useClass: PlatformTranslateLoader,
        },
      }),
      QuillModule.forRoot(),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const lang = inject(LanguageService);
        return () => lang.loadSavedLanguage();
      },
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const settings = inject(PlatformSettingsService);
        return () => settings.applyBrandingFromCache();
      },
      multi: true,
    },
  ],
};
