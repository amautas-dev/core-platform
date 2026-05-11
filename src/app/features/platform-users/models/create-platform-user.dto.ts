/**
 * DTO for creating a platform user.
 */

export interface CreatePlatformUserDto {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly roleCode: string;
  /** If true, send an invitation email to the user with login link / temporary password. */
  readonly sendInvitationEmail?: boolean;
}
