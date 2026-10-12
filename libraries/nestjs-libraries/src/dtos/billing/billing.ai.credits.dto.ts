import { IsDefined, IsIn, IsString } from 'class-validator';
import { aiCreditPacks } from '@gitroom/nestjs-libraries/openai/ai.config';

export class BillingAiCreditsDto {
  @IsDefined()
  @IsString()
  @IsIn(aiCreditPacks.map((p) => p.id))
  pack: string;
}
