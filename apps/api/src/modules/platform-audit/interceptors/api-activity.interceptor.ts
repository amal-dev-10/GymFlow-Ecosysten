import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DatabaseService } from '../../../core/database/database.service';

/**
 * PLT-010 API Activity: real, complete HTTP request telemetry, captured
 * once here instead of scattered across every controller. Registered as a
 * global APP_INTERCEPTOR (see PlatformAuditModule) so it observes every
 * request app-wide - tenant mobile/web traffic and platform admin traffic
 * alike - which is what makes the API Events KPI and API Activity tab
 * meaningful.
 *
 * Deliberately observe-only and fire-and-forget: it never awaits the
 * ApiActivityLog write on the response path, never throws, and never
 * touches the request/response bodies, so it cannot alter behavior or add
 * latency to any existing route.
 */
@Injectable()
export class ApiActivityInterceptor implements NestInterceptor {
  constructor(private prisma: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = Date.now();

    const record = () => {
      const responseTimeMs = Date.now() - startedAt;
      const actorUserId: string | undefined = request.user?.userId;
      this.write({
        method: request.method,
        path: request.route?.path || request.path || request.url,
        statusCode: response.statusCode,
        responseTimeMs,
        actorUserId,
        ipAddress: (request.headers?.['x-forwarded-for'] as string) || request.socket?.remoteAddress,
      });
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }

  private write(row: { method: string; path: string; statusCode: number; responseTimeMs: number; actorUserId?: string; ipAddress?: string }) {
    // Fire-and-forget - never awaited by the request path.
    (async () => {
      let actorName: string | undefined;
      if (row.actorUserId) {
        const user = await this.prisma.user.findUnique({ where: { id: row.actorUserId }, select: { fullName: true } }).catch(() => null);
        actorName = user?.fullName;
      }
      await this.prisma.apiActivityLog.create({
        data: {
          method: row.method,
          path: row.path,
          statusCode: row.statusCode,
          responseTimeMs: row.responseTimeMs,
          actorUserId: row.actorUserId || null,
          actorName: actorName || null,
          ipAddress: row.ipAddress || null,
        },
      });
    })().catch(() => {
      // Never let telemetry failures affect the app.
    });
  }
}
