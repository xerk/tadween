import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateOAuthAppDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  pictureId?: string;

  @IsString()
  @IsOptional()
  // the consent screen sends the browser here: web addresses only
  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    require_tld: false,
  })
  redirectUrl?: string;
}
