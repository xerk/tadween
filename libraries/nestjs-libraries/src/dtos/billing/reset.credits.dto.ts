import { IsIn, IsString } from 'class-validator';

export class ResetCreditsDto {
  @IsString()
  // ai_credits is Tadween's AI credits ledger; ai_images / ai_videos are the older per-type rows
  @IsIn(['ai_credits', 'ai_images', 'ai_videos'])
  type: string;
}
