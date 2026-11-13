import { IsString, Matches } from 'class-validator';

// Tadween: the app language ("en", "ar", "pt-BR"…), kept on the user so
// emails speak it
export class UserLanguageDto {
  @IsString()
  @Matches(/^[a-z]{2}([-_][A-Za-z]{2,4})?$/)
  language: string;
}
