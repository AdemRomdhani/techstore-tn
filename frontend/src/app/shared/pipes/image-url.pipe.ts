import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

const BACKEND_BASE = environment.production
  ? environment.apiUrl.replace(/\/api\/?$/, '')
  : '';

function resolveImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  return BACKEND_BASE + value;
}

@Pipe({ name: 'imageUrl', standalone: true })
export class ImageUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return resolveImageUrl(value);
  }
}

export { resolveImageUrl };
