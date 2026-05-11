import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Password must be at least 8 chars and include uppercase, lowercase, and number. */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') return null;
    const s = String(value);
    const minLength = s.length >= 8;
    const hasUpper = /[A-Z]/.test(s);
    const hasLower = /[a-z]/.test(s);
    const hasNumber = /\d/.test(s);
    if (minLength && hasUpper && hasLower && hasNumber) return null;
    const errors: ValidationErrors = {};
    if (!minLength) errors['minlength'] = { requiredLength: 8 };
    if (!hasUpper) errors['passwordUppercase'] = true;
    if (!hasLower) errors['passwordLowercase'] = true;
    if (!hasNumber) errors['passwordNumber'] = true;
    return errors;
  };
}
