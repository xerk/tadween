import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

// Tadween super-admin console guard: only instance owners (User.isSuperAdmin)
// pass. AuthMiddleware re-reads the user from the database on every request, and
// while impersonating it only keeps isSuperAdmin when the real login is a super
// admin, so this flag can't be forged from the token body.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request?.user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin only');
    }
    return true;
  }
}
