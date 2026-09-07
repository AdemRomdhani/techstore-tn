import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

function resolveImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  const base = environment.apiUrl.replace(/\/api\/?$/, '');
  return base + value;
}

@Pipe({ name: 'imageUrl', standalone: true })
export class ImageUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return resolveImageUrl(value);
  }
}

export { resolveImageUrl };
