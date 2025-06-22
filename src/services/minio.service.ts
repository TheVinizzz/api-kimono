import * as AWS from 'aws-sdk';

export class MinioService {
  private readonly s3: AWS.S3;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET || 'shopping-images';
    this.s3 = new AWS.S3({
      endpoint: process.env.MINIO_URL,
      accessKeyId: process.env.MINIO_PUBLIC_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
      s3ForcePathStyle: true, // necessário para MinIO
      signatureVersion: 'v4',
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
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: file,
      };

      if (contentType) {
        params.ContentType = contentType;
      }

      await this.s3.putObject(params).promise();
      
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
      const data = await this.s3
        .getObject({
          Bucket: this.bucketName,
          Key: fileName,
        })
        .promise();
      return data.Body as Buffer;
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
      await this.s3
        .deleteObject({
          Bucket: this.bucketName,
          Key: fileName,
        })
        .promise();
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
      const params = {
        Bucket: this.bucketName,
        Key: objectName,
        Expires: expirySeconds,
        ContentType: contentType,
      };

      return await this.s3.getSignedUrlPromise('putObject', params);
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
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucketName,
        Prefix: folder ? `${folder}/` : undefined,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents?.map(obj => obj.Key || '') || [];
    } catch (error: any) {
      console.error(
        `Erro ao listar arquivos${folder ? ` da pasta ${folder}` : ''}`,
        error?.stack || 'Sem stack trace'
      );
      throw error;
    }
  }
} 