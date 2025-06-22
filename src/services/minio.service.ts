import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class MinioService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET || 'shopping-images';
    this.s3Client = new S3Client({
      endpoint: process.env.MINIO_URL,
      credentials: {
        accessKeyId: process.env.MINIO_PUBLIC_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '',
      },
      region: 'us-east-1', // MinIO requer uma região
      forcePathStyle: true, // necessário para MinIO
    });
  }

  getPublicUrl(objectName: string): string {
    if (!objectName || objectName === 'undefined') {
      return '';
    }

    // Usar MINIO_PUBLIC_URL se disponível, ou MINIO_URL
    let baseUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL;

    // Sempre forçar HTTPS - remover qualquer protocolo existente e adicionar HTTPS
    if (baseUrl) {
      // Remover protocolo existente se houver
      baseUrl = baseUrl.replace(/^https?:\/\//, '');
      // Sempre usar HTTPS
      baseUrl = `https://${baseUrl}`;
    }

    // Se não temos URL base, usar URL padrão com HTTPS
    if (!baseUrl) {
      baseUrl = 'https://shop-shop.9kbfkm.easypanel.host';
    }

    const publicUrl = `${baseUrl}/${this.bucketName}/${objectName}`;
    console.log('URL pública gerada para objeto (SEMPRE HTTPS):', publicUrl);

    return publicUrl;
  }

  async uploadFile(
    folder: string,
    fileName: string,
    file: Buffer,
    contentType?: string
  ): Promise<string> {
    try {
      const key = `${folder}/${fileName}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      
      console.log(
        `Arquivo ${fileName} enviado com sucesso para a pasta ${folder} no bucket ${this.bucketName}`
      );

      // Construir URL sempre com HTTPS
      let baseUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL;
      if (baseUrl) {
        // Remover protocolo existente se houver
        baseUrl = baseUrl.replace(/^https?:\/\//, '');
        // Sempre usar HTTPS
        baseUrl = `https://${baseUrl}`;
      } else {
        baseUrl = 'https://shop-shop.9kbfkm.easypanel.host';
      }

      const fileUrl = `${baseUrl}/${this.bucketName}/${key}`;
      console.log('Upload fileUrl (SEMPRE HTTPS):', fileUrl);
      return fileUrl;
    } catch (error: unknown) {
      console.error(
        `Erro ao enviar arquivo ${fileName} para a pasta ${folder}`,
        error instanceof Error ? error.stack : 'Sem stack trace'
      );
      throw error;
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Arquivo não encontrado ou vazio');
      }

      // Converter stream para buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error(
        `Erro ao baixar arquivo ${fileName}`,
        error?.stack || 'Sem stack trace'
      );
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      console.log(
        `Arquivo ${fileName} removido com sucesso do bucket ${this.bucketName}`
      );
    } catch (error: any) {
      console.error(
        `Erro ao remover arquivo ${fileName}`,
        error?.stack || 'Sem stack trace'
      );
      throw error;
    }
  }

  async generateUploadUrl(
    objectName: string,
    expirySeconds = 3600,
    contentType = 'image/*'
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3Client, command, { 
        expiresIn: expirySeconds 
      });
    } catch (error: any) {
      console.error(
        `Erro ao gerar URL de upload: ${error?.message || 'Erro desconhecido'}`,
        error?.stack || 'Sem stack trace'
      );
      throw error;
    }
  }

  async listFiles(folder?: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folder ? `${folder}/` : undefined,
      });

      const result = await this.s3Client.send(command);
      return result.Contents?.map((obj: any) => obj.Key || '') || [];
    } catch (error: any) {
      console.error(
        `Erro ao listar arquivos${folder ? ` da pasta ${folder}` : ''}`,
        error?.stack || 'Sem stack trace'
      );
      throw error;
    }
  }
} 