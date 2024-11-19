import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL'); // Get auth-service URL from .env

    return this.httpService
      .post(`${authServiceUrl}/is-admin`, {}, {  // Empty body, headers are what matter here
        headers: {
          Authorization: `Bearer ${token}`, // Pass the token in the Authorization header
        },
      })
      .pipe(
        map((response) => {
          if (response.data.isAdmin) {
            return true;
          } else {
            throw new ForbiddenException('Insufficient permissions');
          }
        }),
        catchError(() => {
          throw new ForbiddenException('Insufficient permissions');
        }),
      );
  }
}