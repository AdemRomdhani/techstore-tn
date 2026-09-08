import { Pipe, PipeTransform } from '@angular/core';

const BACKEND_BASE = '';

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
