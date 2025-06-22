// Tipos para o serviço MinIO

export interface UploadResult {
  success: boolean;
  fileUrl: string;
  fileName: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export interface MultipleUploadResult {
  success: boolean;
  files: UploadResult[];
}

export interface FileInfo {
  fileName: string;
  url: string;
}

export interface ListFilesResult {
  success: boolean;
  files: FileInfo[];
}

export interface GenerateUrlResult {
  success: boolean;
  uploadUrl: string;
  publicUrl: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
}

export interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface UploadOptions {
  folder: string;
  fileName?: string;
  contentType?: string;
  generateUniqueFileName?: boolean;
} 