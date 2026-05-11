import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PlatformUserService } from '../services/platform-user.service';
import { CreatePlatformUserDto } from '../models/create-platform-user.dto';
import { UpdatePlatformUserDto } from '../models/update-platform-user.dto';
import { strongPasswordValidator } from '../validators/password.validators';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { RoleService } from '../../platform-roles/services/role.service';
import type { Role } from '../../platform-roles/models/role.interface';

function confirmPasswordValidator(getPassword: () => AbstractControl | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = getPassword();
    if (!password) return null;
    const match = control.value === password.value;
    return match ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-user-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatSelectModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './user-form.page.html',
  styleUrls: ['./user-form.page.scss'],
})
export class UserFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly platformUserService = inject(PlatformUserService);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly userId = signal<number | null>(null);
  readonly roles = signal<Role[]>([]);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(8), strongPasswordValidator()]],
    confirmPassword: [''],
    roleCode: ['', Validators.required],
    sendInvitationEmail: [false],
  });

  ngOnInit(): void {
    this.loadRoles();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.userId.set(numId);
        this.isEdit.set(true);
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
        this.form.get('confirmPassword')?.clearValidators();
        this.form.get('confirmPassword')?.updateValueAndValidity();
        this.loadUser(numId);
      }
    } else {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8), strongPasswordValidator()]);
      this.form.get('password')?.updateValueAndValidity();
      this.form.get('confirmPassword')?.setValidators([
        Validators.required,
        confirmPasswordValidator(() => this.form.get('password')),
      ]);
      this.form.get('confirmPassword')?.updateValueAndValidity();
      // Update confirmPassword validity when password changes
      this.form.get('password')?.valueChanges.subscribe(() => {
        this.form.get('confirmPassword')?.updateValueAndValidity();
      });
    }
  }

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles ?? []);
      },
      error: () => {
        this.roles.set([]);
      },
    });
  }

  private loadUser(id: number): void {
    this.loading.set(true);
    this.platformUserService.getUser(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          username: user.username,
          email: user.email,
          roleCode: user.roleCode,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar usuario');
        this.loading.set(false);
      },
    });
  }

  generatePassword(): void {
    const length = 12;
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const number = '23456789';
    const all = upper + lower + number;
    let p = '';
    p += upper[Math.floor(Math.random() * upper.length)];
    p += lower[Math.floor(Math.random() * lower.length)];
    p += number[Math.floor(Math.random() * number.length)];
    for (let i = p.length; i < length; i++) {
      p += all[Math.floor(Math.random() * all.length)];
    }
    // Shuffle
    p = p.split('').sort(() => Math.random() - 0.5).join('');
    this.form.patchValue({ password: p, confirmPassword: p });
    this.form.get('password')?.markAsTouched();
    this.form.get('confirmPassword')?.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const id = this.userId();

    if (id !== null) {
      const data: UpdatePlatformUserDto = {
        username: this.form.getRawValue().username,
        email: this.form.getRawValue().email,
        roleCode: this.form.getRawValue().roleCode,
      };
      this.platformUserService.updateUser(id, data).subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate([this.paths.users()]);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al actualizar usuario');
          this.loading.set(false);
        },
      });
    } else {
      const raw = this.form.getRawValue();
      const data: CreatePlatformUserDto = {
        username: raw.username,
        email: raw.email,
        password: raw.password || '',
        roleCode: raw.roleCode,
        ...(raw.sendInvitationEmail === true && { sendInvitationEmail: true }),
      };
      this.platformUserService.createUser(data).subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate([this.paths.users()]);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al crear usuario');
          this.loading.set(false);
        },
      });
    }
  }
}
