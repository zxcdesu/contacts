import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AssigneeType,
  ContactStatus,
  HistoryEventType,
  PrismaPromise,
} from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateChatForContactDto } from './dto/create-chat-for-contact.dto';
import { CreateContactForChatDto } from './dto/create-contact-for-chat.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { FindAllContactsForUserDto } from './dto/find-all-contacts-for-user.dto';
import { FindAllContactsDto } from './dto/find-all-contacts.dto';
import { FindOneContactForChatDto } from './dto/find-one-contact-for-chat.dto';
import { ImportContactsDto } from './dto/import-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';
import { CountAllContacts } from './entities/count-all-contacts.entity';

@Injectable()
export class ContactService {
  constructor(private readonly prismaService: PrismaService) {}

  async import(
    projectId: number,
    importContactsDto: ImportContactsDto,
  ): Promise<boolean> {
    await this.prismaService.$transaction(
      importContactsDto.contacts.map((createContactDto) =>
        this.create(projectId, createContactDto),
      ),
    );

    return true;
  }

  create(
    projectId: number,
    createContactDto: CreateContactDto,
  ): PrismaPromise<Contact> {
    return this.prismaService.contact.create({
      data: {
        projectId,
        status: ContactStatus.Open,
        ...createContactDto,
        history: {
          create: {
            eventType: HistoryEventType.Create,
          },
        },
      },
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });
  }

  async createForChat(
    projectId: number,
    { chatId, ...createContactDto }: CreateContactForChatDto,
  ): Promise<Contact> {
    const { contact, ...chat } = await this.prismaService.chat.upsert({
      where: {
        id: chatId,
      },
      create: {
        id: chatId,
        contact: {
          create: {
            projectId,
            status: ContactStatus.Open,
            ...createContactDto,
            history: {
              create: {
                eventType: HistoryEventType.Create,
              },
            },
          },
        },
      },
      update: {
        contact: {
          update: {
            ...createContactDto,
            status: ContactStatus.Open,
            deletedAt: null,
            updatedAt: new Date(),
          },
        },
      },
      include: {
        contact: {
          include: {
            assignedTo: true,
            customFields: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    return {
      ...contact,
      chats: [chat],
    };
  }

  async createChatFor(
    projectId: number,
    createChatForContactDto: CreateChatForContactDto,
  ): Promise<boolean> {
    await this.prismaService.contact.update({
      where: {
        projectId_id: {
          projectId,
          id: createChatForContactDto.id,
        },
      },
      data: {
        chats: {
          create: {
            id: createChatForContactDto.chatId,
          },
        },
      },
    });

    return true;
  }

  findAll(
    projectId: number,
    findAllContactsDto: FindAllContactsDto,
  ): Promise<Contact[]> {
    return this.prismaService.contact.findMany({
      where: {
        projectId,
        deletedAt: null,
        OR:
          findAllContactsDto.query == null
            ? undefined
            : [
                {
                  telegramId: {
                    contains: findAllContactsDto.query,
                    mode: 'insensitive',
                  },
                },
                {
                  webchatId: {
                    contains: findAllContactsDto.query,
                    mode: 'insensitive',
                  },
                },
                {
                  whatsappId: {
                    contains: findAllContactsDto.query,
                    mode: 'insensitive',
                  },
                },
                {
                  name: {
                    contains: findAllContactsDto.query,
                    mode: 'insensitive',
                  },
                },
              ],
      },
      orderBy: {
        id: 'desc',
      },
      cursor:
        findAllContactsDto.cursor == null
          ? undefined
          : {
              id: findAllContactsDto.cursor,
            },
      skip: findAllContactsDto.cursor == null ? undefined : 1,
      take: findAllContactsDto.take ?? undefined,
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });
  }

  findAllForUser(
    projectId: number,
    userId: number,
    findAllContactsForUserDto: FindAllContactsForUserDto,
  ): Promise<Contact[]> {
    return this.prismaService.contact.findMany({
      where: {
        projectId,
        assignedTo:
          findAllContactsForUserDto.assignedTo === userId
            ? {
                id: findAllContactsForUserDto.assignedTo,
                type: AssigneeType.User,
              }
            : {
                is: null,
              },
        status: findAllContactsForUserDto.status,
        deletedAt: null,
      },
      orderBy: {
        id: 'desc',
      },
      cursor:
        findAllContactsForUserDto.cursor == null
          ? undefined
          : {
              id: findAllContactsForUserDto.cursor,
            },
      skip: findAllContactsForUserDto.cursor == null ? undefined : 1,
      take: findAllContactsForUserDto.take ?? undefined,
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });
  }

  findOneForChat(
    projectId: number,
    findOneContactForChatDto: FindOneContactForChatDto,
  ): Promise<Contact[]> {
    return this.prismaService.contact.findMany({
      where: {
        projectId,
        chats: {
          some: {
            id: {
              in: findOneContactForChatDto.ids,
            },
          },
        },
        deletedAt: null,
      },
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });
  }

  async findOne(projectId: number, id: number): Promise<Contact> {
    const contact = await this.prismaService.contact.findUniqueOrThrow({
      where: {
        projectId_id: {
          projectId,
          id,
        },
      },
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });

    if (contact.deletedAt) {
      throw new NotFoundException();
    }

    return contact;
  }

  async update(
    projectId: number,
    { id, tags, assignedTo, ...updateContactDto }: UpdateContactDto,
  ): Promise<Contact> {
    const history = Object.keys(updateContactDto);
    const contact = await this.prismaService.contact.update({
      where: {
        projectId_id: {
          projectId,
          id,
        },
      },
      data: {
        ...updateContactDto,
        assignedTo:
          assignedTo === undefined
            ? undefined
            : assignedTo === null
            ? {
                delete: true,
              }
            : {
                upsert: {
                  create: assignedTo,
                  update: assignedTo,
                },
              },
        history: history.length
          ? undefined
          : {
              createMany: {
                data: history.map((key) => ({
                  eventType: HistoryEventType.Update,
                  payload: {
                    [key]: updateContactDto[key],
                  },
                })),
              },
            },
      },
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });

    if (tags) {
      const ids = contact.tags.map(({ tagId }) => tagId);
      await this.prismaService.$transaction([
        this.prismaService.contactTag.createMany({
          data: tags
            .filter((id) => !ids.includes(id))
            .map((tagId) => ({
              tagId,
              contactId: id,
            })),
        }),
        this.prismaService.contactTag.deleteMany({
          where: {
            tagId: {
              in: ids.filter((id) => !tags.includes(id)),
            },
          },
        }),
      ]);

      contact.tags = await this.prismaService.contactTag.findMany({
        where: {
          contactId: contact.id,
        },
        include: {
          tag: true,
        },
      });
    }

    return contact;
  }

  remove(projectId: number, id: number): Promise<Contact> {
    return this.prismaService.contact.update({
      where: {
        projectId_id: {
          projectId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
        history: {
          create: {
            eventType: HistoryEventType.Remove,
          },
        },
      },
      include: {
        assignedTo: true,
        customFields: true,
        tags: {
          include: {
            tag: true,
          },
        },
        chats: true,
      },
    });
  }

  async countAllForUser(
    projectId: number,
    userId: number,
  ): Promise<CountAllContacts> {
    const [assigned, unassigned] = await this.prismaService.$transaction([
      this.prismaService.contact.count({
        where: {
          projectId,
          assignedTo: {
            id: userId,
          },
          status: ContactStatus.Open,
          deletedAt: null,
        },
      }),
      this.prismaService.contact.count({
        where: {
          projectId,
          assignedTo: null,
          status: ContactStatus.Open,
          deletedAt: null,
        },
      }),
    ]);

    return {
      assigned,
      unassigned,
    };
  }
}
