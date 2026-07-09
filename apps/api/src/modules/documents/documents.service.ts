import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { GeneratePresignedUrlDto, ConfirmDocumentUploadDto, DocumentTargetType } from './dto/document.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client;
  private bucketName = process.env.AWS_S3_BUCKET || 'gym-saas-documents';

  constructor(private prisma: DatabaseService) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
      },
    });
  }

  async generatePresignedUrl(organizationId: string, dto: GeneratePresignedUrlDto) {
    // Validate target exists in this org
    if (dto.targetType === DocumentTargetType.MEMBER) {
      const member = await this.prisma.member.findFirst({
        where: { id: dto.targetId, organizationId },
      });
      if (!member) throw new BadRequestException('Member not found');
    } else {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.targetId, organizationId },
      });
      if (!employee) throw new BadRequestException('Employee not found');
    }

    const key = `orgs/${organizationId}/${dto.targetType.toLowerCase()}s/${dto.targetId}/${uuidv4()}-${dto.fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    return {
      presignedUrl: url,
      key,
      finalUrl: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
    };
  }

  async confirmUpload(organizationId: string, dto: ConfirmDocumentUploadDto) {
    if (dto.targetType === DocumentTargetType.MEMBER) {
      return this.prisma.memberDocument.create({
        data: {
          memberId: dto.targetId,
          documentType: dto.documentType,
          url: dto.url,
        },
      });
    } else {
      return this.prisma.employeeDocument.create({
        data: {
          employeeId: dto.targetId,
          documentType: dto.documentType,
          url: dto.url,
        },
      });
    }
  }
}
