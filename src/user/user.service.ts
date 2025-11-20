import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserWithoutPassword } from 'src/types';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(params: {
    where: Prisma.UserWhereUniqueInput;
    data: UpdateUserDto;
  }): Promise<UserWithoutPassword> {
    const { where, data } = params;
    return this.prisma.user.update({
      where,
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
