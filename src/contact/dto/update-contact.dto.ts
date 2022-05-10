import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ContactStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['chatId', 'avatarUrl']),
) {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsInt()
  assignedTo?: number;
}
