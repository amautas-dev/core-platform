import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  TranslationsApiService,
  type I18nLabelWithTranslationsDto,
} from '../services/translations-api.service';
import {
  TranslationEditDialogComponent,
  type TranslationEditDialogSaveResult,
} from '../components/translation-edit-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, TimeoutError, catchError, finalize, throwError, timeout } from 'rxjs';

@Component({
  selector: 'app-translations-list-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatPaginatorModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './translations-list.page.html',
  styleUrls: ['./translations-list.page.scss'],
})
export class TranslationsListPage implements OnInit {
  private readonly api = inject(TranslationsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly syncing = signal(false);
  readonly error = signal<string | null>(null);
  readonly dataSource = new MatTableDataSource<I18nLabelWithTranslationsDto>([]);

  readonly pageSize = 15;
  readonly pageSizeOptions: number[] = [15, 30, 50];

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  /** Idiomas activos (orden para columnas) */
  readonly languages = signal<{ code: string; name: string }[]>([]);

  /** Columnas de la tabla: clave + una por idioma + faltantes + acciones */
  readonly displayedColumns = signal<string[]>(['label_key', 'missing', 'actions']);

  /** Lista completa (sin filtrar) */
  private readonly allLabels = signal<I18nLabelWithTranslationsDto[]>([]);

  readonly showOnlyMissing = signal(false);
  readonly showOnlyPending = signal(false);

  /** Filtro solo sobre `label_key` (columna Clave). */
  readonly searchKeyQuery = signal('');
  /** Filtro solo sobre textos de traducción (no incluye la clave). */
  readonly searchTextQuery = signal('');
  /** `all` = cualquier columna de idioma; si no, solo esa columna (código ISO). */
  readonly searchTextLangScope = signal<'all' | string>('all');

  ngOnInit(): void {
    this.loadLabels();
  }

  private loadLabels(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getLabelsWithTranslations().subscribe({
      next: (res) => {
        this.languages.set(res.languages);
        const codes = new Set(res.languages.map((l) => l.code));
        const scope = this.searchTextLangScope();
        if (scope !== 'all' && !codes.has(scope)) {
          this.searchTextLangScope.set('all');
        }
        this.allLabels.set(res.labels);
        this.dataSource.data = res.labels;
        this.displayedColumns.set([
          'label_key',
          ...res.languages.map((l) => `lang_${l.code}`),
          'missing',
          'actions',
        ]);
        this.applyFilter(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar etiquetas');
        this.loading.set(false);
      },
    });
  }

  getTranslation(row: I18nLabelWithTranslationsDto, langCode: string): string {
    return row.translations?.[langCode] ?? '';
  }

  getMissingLangs(row: I18nLabelWithTranslationsDto): string[] {
    const langs = this.languages();
    return langs.filter((l) => !(row.translations?.[l.code]?.trim())).map((l) => l.code);
  }

  hasMissing(row: I18nLabelWithTranslationsDto): boolean {
    return this.getMissingLangs(row).length > 0;
  }

  getMissingTooltip(row: I18nLabelWithTranslationsDto): string {
    const langs = this.getMissingLangs(row).join(', ');
    return this.translate.instant('translations.missingForLangs', { langs }) || `Missing: ${langs}`;
  }

  toggleShowOnlyMissing(checked: boolean): void {
    this.showOnlyMissing.set(checked);
    this.applyFilter(true);
  }

  toggleShowOnlyPending(checked: boolean): void {
    this.showOnlyPending.set(checked);
    this.applyFilter(true);
  }

  onSearchKeyInput(value: string): void {
    this.searchKeyQuery.set(value);
    this.applyFilter(true);
  }

  onSearchTextInput(value: string): void {
    this.searchTextQuery.set(value);
    this.applyFilter(true);
  }

  onSearchTextLangScope(value: string): void {
    this.searchTextLangScope.set(value === 'all' ? 'all' : value);
    this.applyFilter(true);
  }

  hasActiveSearchFilters(): boolean {
    return this.searchKeyQuery().trim().length > 0 || this.searchTextQuery().trim().length > 0;
  }

  private rowMatchesFilters(row: I18nLabelWithTranslationsDto): boolean {
    const keyQ = this.searchKeyQuery().trim().toLowerCase();
    if (keyQ && !row.label_key.toLowerCase().includes(keyQ)) {
      return false;
    }
    const textQ = this.searchTextQuery().trim().toLowerCase();
    if (textQ) {
      const scope = this.searchTextLangScope();
      if (scope !== 'all') {
        const t = row.translations?.[scope] ?? '';
        if (!t.toLowerCase().includes(textQ)) return false;
      } else {
        const langs = this.languages();
        let anyMatch = false;
        for (const lang of langs) {
          const t = row.translations?.[lang.code] ?? '';
          if (t.toLowerCase().includes(textQ)) {
            anyMatch = true;
            break;
          }
        }
        if (!anyMatch) return false;
      }
    }
    return true;
  }

  /** @param resetPage ir a la página 1 (búsqueda/filtros o carga inicial); false al corregir una fila tras guardar. */
  private applyFilter(resetPage = true): void {
    const list = this.allLabels();
    const onlyMissing = this.showOnlyMissing();
    const onlyPending = this.showOnlyPending();
    let filtered = list.filter((row) => this.rowMatchesFilters(row));
    if (onlyMissing) {
      filtered = filtered.filter((row) => this.getMissingLangs(row).length > 0);
    }
    if (onlyPending) {
      filtered = filtered.filter((row) => row.pending_translation === true);
    }
    this.dataSource.data = filtered;
    if (resetPage) {
      this.dataSource.paginator?.firstPage();
    }
  }

  /** Actualiza la fila en memoria sin GET completo ni reset del paginador. */
  private patchRowAfterSave(result: TranslationEditDialogSaveResult): void {
    const all = this.allLabels();
    const idx = all.findIndex((r) => r.label_key === result.labelKey);
    if (idx === -1) return;
    const prev = all[idx];
    const mergedTranslations = { ...prev.translations, ...result.translations };
    const updated: I18nLabelWithTranslationsDto = {
      ...prev,
      translations: mergedTranslations,
      pending_translation: false,
    };
    const next = [...all];
    next[idx] = updated;
    this.allLabels.set(next);
    this.applyFilter(false);
  }

  openEdit(row: I18nLabelWithTranslationsDto): void {
    const ref = this.dialog.open(TranslationEditDialogComponent, {
      width: '560px',
      data: { labelKey: row.label_key },
    });
    ref.afterClosed().subscribe((closed: TranslationEditDialogSaveResult | false) => {
      if (closed && typeof closed === 'object' && closed.saved) {
        this.patchRowAfterSave(closed);
      }
    });
  }

  /** Sync puede tardar mucho (BD); si el request cuelga, el spinner no debe quedar para siempre. */
  private static readonly SYNC_TIMEOUT_MS = 300_000;

  syncFromDictionaries(): void {
    if (this.loading() || this.syncing()) return;
    this.syncing.set(true);
    this.api
      .syncFromDictionaries()
      .pipe(
        timeout(TranslationsListPage.SYNC_TIMEOUT_MS),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            const msg = this.translate.instant('translations.syncTimeout');
            this.snackBar.open(msg, undefined, { duration: 10_000 });
            return EMPTY;
          }
          return throwError(() => err);
        }),
        finalize(() => this.syncing.set(false))
      )
      .subscribe({
        next: (res) => {
          const sourceLabel = this.translate.instant(
            res.dictionarySource === 'api-dictionaries-js'
              ? 'translations.syncSourceApiJs'
              : 'translations.syncSourceAdminTs'
          );
          const msg = this.translate.instant('translations.syncSuccess', {
            keysScanned: res.keysScanned ?? 0,
            source: sourceLabel,
            newLabels: res.newLabels,
            newTranslations: res.newTranslations,
            auto: res.autoGeneratedCount ?? 0,
          });
          this.snackBar.open(msg, undefined, { duration: 8000 });
          this.loadLabels();
        },
        error: (err: { error?: { error?: string }; message?: string }) => {
          const detail = err?.error?.error ?? err?.message;
          const base = this.translate.instant('translations.syncError');
          this.snackBar.open(detail ? `${base} ${detail}` : base, undefined, { duration: 8000 });
        },
      });
  }
}
