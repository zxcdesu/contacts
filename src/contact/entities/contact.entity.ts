import Prisma from '@prisma/client';
import { Exclude, Type } from 'class-transformer';
import { AssignedTo } from './assigned-to.entity';
import { Chat } from './chat.entity';
import { ContactTag } from './contact-tag.entity';
import { CustomField } from './custom-field.entity';

export class Contact implements Prisma.Contact {
  id: number;

  @Exclude()
  projectId: number;

  name: string;

  avatarUrl: string | null;

  notes: string;

  status: Prisma.ContactStatus;

  @Type(() => AssignedTo)
  assignedTo: AssignedTo | null;

  priority: number;

  resolved: boolean;

  @Type(() => ContactTag)
  tags: ContactTag[];

  @Type(() => CustomField)
  customFields: CustomField[];

  @Type(() => Chat)
  chats: Chat[];

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;
}
