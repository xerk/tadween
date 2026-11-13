import { IsDefined, IsString } from 'class-validator';

// The Checkout Session (setup mode) a trialing workspace confirmed its card
// and plan with
export class BillingTrialPlanDto {
  @IsDefined()
  @IsString()
  session: string;
}
