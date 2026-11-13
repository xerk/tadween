import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

// Tadween: the mobile app's FCM token for this phone
export class DeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  token: string;

  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}

export class DeviceTokenDto {
  @IsString()
  @MaxLength(4096)
  token: string;
}
