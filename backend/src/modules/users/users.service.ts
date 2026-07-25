import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../common/entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
  GetUsersQueryDto,
  PaginatedUsersResponseDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, fullName, role } = createUserDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const bcryptRounds = this.configService.get('security.bcryptRounds');
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Create user
    const user = this.usersRepository.create({
      email,
      passwordHash,
      fullName,
      role: role || 'viewer',
      isActive: true,
    });

    await this.usersRepository.save(user);

    return this.transformToResponseDto(user);
  }

  async findAll(query: GetUsersQueryDto): Promise<PaginatedUsersResponseDto> {
    const { page = 1, limit = 20, role, isActive, search } = query;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Apply filters
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sort by created date (newest first)
    queryBuilder.orderBy('user.createdAt', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [users, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTO
    const data = users.map((user) => this.transformToResponseDto(user));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.transformToResponseDto(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if new email already exists (if being updated)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      user.email = updateUserDto.email;
    }

    if (updateUserDto.fullName) {
      user.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    await this.usersRepository.save(user);

    return this.transformToResponseDto(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new email already exists (if being updated)
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      user.email = updateProfileDto.email;
    }

    if (updateProfileDto.fullName) {
      user.fullName = updateProfileDto.fullName;
    }

    await this.usersRepository.save(user);

    return this.transformToResponseDto(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const bcryptRounds = this.configService.get('security.bcryptRounds');
    user.passwordHash = await bcrypt.hash(newPassword, bcryptRounds);

    await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.usersRepository.remove(user);
  }

  async toggleActive(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.isActive = !user.isActive;
    await this.usersRepository.save(user);

    return this.transformToResponseDto(user);
  }

  private transformToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
