import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Tadween analytics: the organisation's own published posts in the last `days`
// days, for one channel or (without `integration`) every channel.
export class GetPublishedPostsDto {
  @IsOptional()
  @IsString()
  integration?: string;

  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  days: number = 7;
}
