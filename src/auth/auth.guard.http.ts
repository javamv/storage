import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL'); // Get auth-service URL from .env

    return this.httpService
      .post(`${authServiceUrl}/verify-token`, {}, {  // Empty body, headers are what matter here
        headers: {
          Authorization: `Bearer ${token}`, // Pass the token in the Authorization header
        },
      })
      .pipe(
        map((response) => {
          request.user = response.data; // Attach user information to the request
          return true;
        }),
        catchError((error) => {
          throw new UnauthorizedException('Invalid or expired token');
        }),
      );
  }
}