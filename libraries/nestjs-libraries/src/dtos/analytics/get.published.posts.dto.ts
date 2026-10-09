import { IsDateString, IsOptional, IsString } from 'class-validator';

// Tadween analytics: the organisation's own published posts between two dates
// (the client sends its local day boundaries), for one channel or, without
// `integration`, every channel.
export class GetPublishedPostsDto {
  @IsOptional()
  @IsString()
  integration?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
