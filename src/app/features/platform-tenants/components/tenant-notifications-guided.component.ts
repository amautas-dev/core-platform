import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  SecurityContext,
  effect,
  inject,
  input,
  signal,
  computed,
  untracked,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type Quill from 'quill';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MessageBoxService } from 'ui-kit';
import { TranslateService } from '@ngx-translate/core';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { TenantService } from '../services/tenant.service';
import type {
  TenantNotificationImportSchemaRow,
  TenantNotificationMessageTypeRow,
  TenantNotificationTemplateRow,
} from '../services/tenant.service';

const IA_GENERATOR_GROUP = 'ia_generator';

/** Quill deja `<p><br></p>` en vacío; validamos texto visible. */
function htmlEmailBodyNotEmpty(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') return { required: true };
    const textOnly = String(raw)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textOnly ? null : { required: true };
  };
}

export type NotifInsertTarget = 'emailSubject' | 'emailBody' | `wa-${number}`;

@Component({
  selector: 'app-tenant-notifications-guided',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatExpansionModule,
    DragDropModule,
    QuillEditorComponent,
    PlatformTranslatePipe,
    HasPermissionDirective,
  ],
  templateUrl: './tenant-notifications-guided.component.html',
  styleUrls: ['./tenant-notifications-guided.component.scss'],
})
export class TenantNotificationsGuidedComponent {
  private readonly tenantService = inject(TenantService);
  private readonly fb = inject(FormBuilder);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly tenantId = input.required<number>();
  readonly readonlyMode = input<boolean>(true);

  readonly PERMISSIONS = PERMISSIONS;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly schemaReorderSaving = signal(false);
  readonly messageTypes = signal<TenantNotificationMessageTypeRow[]>([]);
  readonly selectedMessageType = signal<string>('cobranza');
  readonly schemaRows = signal<TenantNotificationImportSchemaRow[]>([]);
  /** Conteo de plantillas activas cargadas para el tipo seleccionado (validación UX). */
  readonly templateSummary = signal<{ email: number; whatsapp: number }>({ email: 0, whatsapp: 0 });
  readonly insertTarget = signal<NotifInsertTarget>('emailBody');

  /** Referencia al editor Quill del cuerpo de email (insertar variables en el cursor). */
  private emailQuill: Quill | null = null;

  readonly emailQuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  readonly emailQuillStyles = {
    'min-height': '220px',
  };

  readonly newFieldForm = this.fb.nonNullable.group({
    fieldLabel: ['', Validators.required],
    fieldType: this.fb.nonNullable.control<'string' | 'number' | 'date'>('string'),
    isRequired: [false],
    aliasesText: [''],
    fieldKeyOverride: [''],
  });

  readonly outputForm = this.fb.nonNullable.group({
    emailSubject: ['', Validators.required],
    emailBody: ['', htmlEmailBodyNotEmpty()],
    whatsapp: this.fb.array([
      this.fb.nonNullable.control('', Validators.required),
      this.fb.nonNullable.control('', Validators.required),
      this.fb.nonNullable.control('', Validators.required),
    ]),
  });

  readonly variableChips = computed(() => {
    const keys = this.schemaRows().map((r) => r.fieldKey);
    return ['{{tenantName}}', ...keys.map((k) => `{{${k}}}`)];
  });

  readonly mockPreviewMap = computed(() => {
    const m: Record<string, string> = { tenantName: 'Colegio Demo' };
    for (const r of this.schemaRows()) {
      if (r.fieldType === 'number') m[r.fieldKey] = '123';
      else if (r.fieldType === 'date') m[r.fieldKey] = '15/01/2026';
      else m[r.fieldKey] = r.fieldLabel || r.fieldKey;
    }
    return m;
  });

  readonly waPreviews = computed(() =>
    this.waArray.controls.map((c) => this.applyPreview(c.value ?? '', this.mockPreviewMap())),
  );

  /** Avisos de configuración incompleta o variables obligatorias (clave i18n). */
  readonly notificationUiWarningKeys = computed(() => {
    const keys: string[] = [];
    const mtc = this.selectedMessageType();
    if (!this.typeEnabled(mtc)) return keys;
    if (this.schemaRows().length < 1) keys.push('tenants.guidedNotifWarnNoSchema');
    const s = this.templateSummary();
    if (s.email < 1) keys.push('tenants.guidedNotifWarnNoEmail');
    if (s.whatsapp < 3) keys.push('tenants.guidedNotifWarnWaCount');
    const subj = this.outputForm.controls.emailSubject.value ?? '';
    const body = this.outputForm.controls.emailBody.value ?? '';
    const emailBlock = `${subj}\n${body}`;
    if (!emailBlock.includes('{{tenantName}}')) keys.push('tenants.guidedNotifWarnTenantNameEmail');
    const rows = this.schemaRows();
    if (rows.length > 0) {
      const lowerKeys = rows.map((r) => r.fieldKey.toLowerCase());
      const hasInEmail = lowerKeys.some((k) => emailBlock.toLowerCase().includes(`{{${k}}}`));
      if (!hasInEmail) keys.push('tenants.guidedNotifWarnSchemaVarEmail');
      const waBlocks = this.waArray.controls.map((c) => String(c.value ?? '').toLowerCase()).join('\n');
      const hasInWa = lowerKeys.some((k) => waBlocks.includes(`{{${k}}}`));
      if (!hasInWa) keys.push('tenants.guidedNotifWarnSchemaVarWa');
      if (!waBlocks.includes('{{tenantname}}')) keys.push('tenants.guidedNotifWarnTenantNameWa');
    }
    return keys;
  });

  constructor() {
    effect(() => {
      const ro = this.readonlyMode();
      untracked(() => {
        if (ro) {
          this.newFieldForm.disable({ emitEvent: false });
          this.outputForm.disable({ emitEvent: false });
        } else {
          this.newFieldForm.enable({ emitEvent: false });
          this.outputForm.enable({ emitEvent: false });
        }
      });
    });
    effect(() => {
      const id = this.tenantId();
      untracked(() => this.bootstrap(id));
    });
  }

  get waArray(): FormArray {
    return this.outputForm.controls.whatsapp;
  }

  private bootstrap(tenantId: number): void {
    this.loading.set(true);
    this.tenantService.listNotificationMessageTypes(tenantId).subscribe({
      next: (types) => {
        this.messageTypes.set(types);
        const sel = this.selectedMessageType();
        const still = types.some((t) => t.messageTypeCode === sel && t.enabled);
        if (!still) {
          const first = types.find((t) => t.enabled);
          this.selectedMessageType.set(first?.messageTypeCode ?? 'cobranza');
        }
        this.reloadForType(tenantId, this.selectedMessageType());
      },
      error: () => {
        this.messageTypes.set([]);
        this.loading.set(false);
      },
    });
  }

  onMessageTypeSelect(code: string): void {
    this.selectedMessageType.set(code);
    this.reloadForType(this.tenantId(), code);
  }

  reloadForType(tenantId: number, messageTypeCode: string): void {
    this.loading.set(true);
    forkJoin({
      schema: this.tenantService.listNotificationImportSchema(tenantId, messageTypeCode),
      templates: this.tenantService.listNotificationTemplates(tenantId, messageTypeCode),
    }).subscribe({
      next: ({ schema, templates }) => {
        this.schemaRows.set(schema);
        const email = templates.filter((t) => t.channel === 'email' && t.isActive).length;
        const whatsapp = templates.filter((t) => t.channel === 'whatsapp' && t.isActive).length;
        this.templateSummary.set({ email, whatsapp });
        this.patchOutputFromTemplates(templates, messageTypeCode);
        this.loading.set(false);
      },
      error: () => {
        this.schemaRows.set([]);
        this.templateSummary.set({ email: 0, whatsapp: 0 });
        this.patchOutputFromTemplates([], messageTypeCode);
        this.loading.set(false);
      },
    });
  }

  typeEnabled(code: string): boolean {
    return this.messageTypes().find((t) => t.messageTypeCode === code)?.enabled ?? false;
  }

  toggleType(code: string, enabled: boolean): void {
    if (this.readonlyMode()) return;
    this.saving.set(true);
    this.tenantService
      .setNotificationMessageType(this.tenantId(), { message_type_code: code, enabled })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.bootstrap(this.tenantId());
        },
        error: (err) => {
          this.saving.set(false);
          void this.msgBox.show({
            title: this.translate.instant('common.error'),
            html: err?.error?.error || err?.message || '',
            confirm: false,
          });
        },
      });
  }

  slugifyFieldKey(label: string, override: string): string {
    const o = String(override || '').trim().toLowerCase();
    if (o && /^[a-z][a-z0-9_]*$/.test(o)) return o.slice(0, 80);
    const s = String(label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    return s && /^[a-z]/.test(s) ? s : `campo_${Date.now() % 100000}`;
  }

  addSchemaField(): void {
    if (this.readonlyMode() || this.newFieldForm.invalid) return;
    const id = this.tenantId();
    const mtc = this.selectedMessageType();
    const raw = this.newFieldForm.getRawValue();
    const field_key = this.slugifyFieldKey(String(raw.fieldLabel), String(raw.fieldKeyOverride ?? ''));
    const aliases = String(raw.aliasesText ?? '')
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    this.saving.set(true);
    this.tenantService
      .createNotificationImportSchema(id, {
        message_type_code: mtc,
        field_key,
        field_label: String(raw.fieldLabel).trim(),
        field_type: raw.fieldType,
        is_required: !!raw.isRequired,
        aliases: aliases.length ? aliases : undefined,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.newFieldForm.reset({
            fieldLabel: '',
            fieldType: 'string',
            isRequired: false,
            aliasesText: '',
            fieldKeyOverride: '',
          });
          this.reloadForType(id, mtc);
        },
        error: (err) => {
          this.saving.set(false);
          void this.msgBox.show({
            title: this.translate.instant('common.error'),
            html: err?.error?.error || err?.message || '',
            confirm: false,
          });
        },
      });
  }

  onSchemaDrop(event: CdkDragDrop<TenantNotificationImportSchemaRow[]>): void {
    if (this.readonlyMode()) return;
    const prev = event.previousIndex;
    const cur = event.currentIndex;
    if (prev === cur) return;
    const data = [...this.schemaRows()];
    moveItemInArray(data, prev, cur);
    this.schemaRows.set(data);
    const id = this.tenantId();
    const mtc = this.selectedMessageType();
    const payload = data.map((r, i) => ({ id: r.id, position: i }));
    this.schemaReorderSaving.set(true);
    this.tenantService
      .reorderNotificationImportSchema(id, mtc, payload)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.schemaReorderSaving.set(false);
          this.schemaRows.set(rows);
        },
        error: (err) => {
          this.schemaReorderSaving.set(false);
          this.reloadForType(id, mtc);
          void this.msgBox.show({
            title: this.translate.instant('common.error'),
            html: err?.error?.error || err?.message || '',
            confirm: false,
          });
        },
      });
  }

  deleteSchemaRow(row: TenantNotificationImportSchemaRow): void {
    if (this.readonlyMode()) return;
    const id = this.tenantId();
    const mtc = this.selectedMessageType();
    this.saving.set(true);
    this.tenantService
      .deleteNotificationImportSchema(id, row.id)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reloadForType(id, mtc);
        },
        error: (err) => {
          this.saving.set(false);
          void this.msgBox.show({
            title: this.translate.instant('common.error'),
            html: err?.error?.error || err?.message || '',
            confirm: false,
          });
        },
      });
  }

  downloadSampleCsv(): void {
    const id = this.tenantId();
    const mtc = this.selectedMessageType();
    this.tenantService.downloadNotificationImportSampleCsv(id, mtc).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ejemplo-${mtc}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        void this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: err?.error?.error || err?.message || '',
          confirm: false,
        });
      },
    });
  }

  setInsertTarget(t: NotifInsertTarget): void {
    this.insertTarget.set(t);
  }

  setWaInsertTarget(i: number): void {
    this.insertTarget.set(`wa-${i}` as NotifInsertTarget);
  }

  onEmailQuillCreated(editor: Quill): void {
    this.emailQuill = editor;
  }

  insertVariable(chip: string): void {
    const t = this.insertTarget();
    if (t === 'emailSubject') {
      const c = this.outputForm.controls.emailSubject;
      c.setValue(`${c.value ?? ''}${chip}`);
    } else if (t === 'emailBody') {
      const q = this.emailQuill;
      if (q) {
        q.focus();
        const range = q.getSelection(true);
        const len = q.getLength();
        const idx = range ? range.index : Math.max(0, len - 1);
        q.insertText(idx, chip, 'user');
        q.setSelection(idx + chip.length, 0, 'silent');
      } else {
        const c = this.outputForm.controls.emailBody;
        c.setValue(`${c.value ?? ''}${chip}`);
      }
    } else if (t.startsWith('wa-')) {
      const i = parseInt(t.slice(3), 10);
      const ctrl = this.waArray.at(i);
      if (ctrl) ctrl.setValue(`${ctrl.value ?? ''}${chip}`);
    }
  }

  /** Rellena el formulario con plantillas activas del lote Platform (variationGroup = tipo o legado IA). */
  private patchOutputFromTemplates(rows: TenantNotificationTemplateRow[], messageTypeCode: string): void {
    const mtc = String(messageTypeCode || '').trim().toLowerCase();
    const groupMatches = (r: TenantNotificationTemplateRow) => {
      const g = String(r.variationGroup ?? '').trim();
      return g === '' || g === IA_GENERATOR_GROUP || g === mtc;
    };
    const emailRow =
      rows.find((r) => r.channel === 'email' && r.isActive && groupMatches(r)) ??
      rows.find((r) => r.channel === 'email' && r.isActive);
    let waRows = rows
      .filter((r) => r.channel === 'whatsapp' && r.isActive && groupMatches(r))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!emailRow && waRows.length === 0) {
      waRows = rows
        .filter((r) => r.channel === 'whatsapp' && r.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }
    const subject = emailRow ? String(emailRow.subject ?? '') : '';
    const body = emailRow ? String(emailRow.body ?? '') : '';
    while (this.waArray.length) this.waArray.removeAt(0);
    const bodies = waRows.map((r) => String(r.body ?? ''));
    while (bodies.length < 3) bodies.push('');
    for (const b of bodies) {
      this.waArray.push(this.fb.nonNullable.control(b, Validators.required));
    }
    this.outputForm.patchValue({ emailSubject: subject, emailBody: body }, { emitEvent: false });
  }

  saveTemplates(): void {
    if (this.readonlyMode() || this.outputForm.invalid) return;
    const id = this.tenantId();
    const mtc = this.selectedMessageType();
    const v = this.outputForm.getRawValue();
    const whatsapp = v.whatsapp.map((body) => ({ body: String(body) }));
    this.saving.set(true);
    this.tenantService
      .saveAiGeneratedNotificationTemplates(id, {
        message_type_code: mtc,
        email: { subject: String(v.emailSubject), body: String(v.emailBody) },
        whatsapp,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          void this.msgBox.show({
            title: this.translate.instant('tenants.guidedNotifSaveOk'),
            confirm: false,
          });
        },
        error: (err) => {
          this.saving.set(false);
          void this.msgBox.show({
            title: this.translate.instant('common.error'),
            html: err?.error?.error || err?.message || '',
            confirm: false,
          });
        },
      });
  }

  private applyPreview(text: string, mock: Record<string, string>): string {
    let out = String(text || '');
    for (const [k, val] of Object.entries(mock)) {
      const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
      out = out.replace(re, val);
    }
    return out;
  }

  /** Vista previa del cuerpo de email (HTML o texto convertido) con variables sustituidas. */
  emailPreviewHtml(): SafeHtml {
    const raw = this.outputForm.controls.emailBody.value ?? '';
    const withVars = this.applyPreview(raw, this.mockPreviewMap());
    const cleaned = this.sanitizer.sanitize(SecurityContext.HTML, withVars) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  messageTypeLabel(code: string): string {
    const k = `tenants.messageType.${code}`;
    const t = this.translate.instant(k);
    return t !== k ? t : code;
  }

  schemaFieldTypeLabel(t: string): string {
    const k = `tenants.importSchemaFieldTypeValue.${t}`;
    const x = this.translate.instant(k);
    return x !== k ? x : t;
  }
}
