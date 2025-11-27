import { storageService, STORES } from './storageService'
import type { Document, DocumentType, ProductType } from '@/types'

class DocumentService {
  private async validatePDF(file: File): Promise<{ valid: boolean; error?: string }> {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF document' }
    }

    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 50MB limit' }
    }

    if (file.size < 1024) {
      return { valid: false, error: 'File is too small to be a valid PDF' }
    }

    try {
      const arrayBuffer = await file.slice(0, 5).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const signature = String.fromCharCode(...bytes)

      if (!signature.startsWith('%PDF')) {
        return { valid: false, error: 'File does not appear to be a valid PDF' }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Failed to read file' }
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const documents = await storageService.getAll<Document>(STORES.DOCUMENTS)
      return documents.sort((a, b) => {
        const aTime = (a as any).created_at || 0
        const bTime = (b as any).created_at || 0
        return bTime - aTime
      })
    } catch (error) {
      console.error('Error fetching documents:', error)
      return []
    }
  }

  async getDocumentsByProductType(productType: ProductType): Promise<Document[]> {
    try {
      const allDocs = await this.getAllDocuments()
      return allDocs.filter(doc => doc.productType === productType)
    } catch (error) {
      console.error('Error fetching documents by product type:', error)
      return []
    }
  }

  async getDocument(id: string): Promise<Document | null> {
    try {
      return await storageService.get<Document>(STORES.DOCUMENTS, id)
    } catch (error) {
      console.error('Error fetching document:', error)
      return null
    }
  }

  async uploadDocument(
    file: File,
    productType: ProductType,
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    const validation = await this.validatePDF(file)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid PDF file')
    }

    try {
      if (onProgress) onProgress(25)

      const fileBuffer = await file.arrayBuffer()

      if (onProgress) onProgress(50)

      const type = this.detectDocumentType(file.name)
      const name = this.extractDocumentName(file.name, type)

      const timestamp = new Date().getTime()
      const document: Document & { file_data: Uint8Array; created_at: number } = {
        id: this.generateId(),
        name,
        description: type + ' Document',
        filename: file.name,
        url: '',
        size: file.size,
        type,
        required: false,
        products: [],
        productType,
        file_data: new Uint8Array(fileBuffer),
        created_at: timestamp
      }

      await storageService.set(STORES.DOCUMENTS, document)

      if (onProgress) onProgress(100)

      const returnDoc: Document = {
        id: document.id,
        name: document.name,
        description: document.description,
        filename: document.filename,
        url: document.url,
        size: document.size,
        type: document.type,
        required: document.required,
        products: document.products,
        productType: document.productType
      }
      return returnDoc
    } catch (error) {
      console.error('Error in uploadDocument:', error)
      throw error instanceof Error ? error : new Error('Failed to upload document')
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    try {
      const existing = await this.getDocument(id)
      if (!existing) {
        throw new Error('Document not found')
      }

      const updated = { ...existing, ...updates }
      await storageService.set(STORES.DOCUMENTS, updated)
    } catch (error) {
      console.error('Error updating document:', error)
      throw error instanceof Error ? error : new Error('Failed to update document')
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await storageService.delete(STORES.DOCUMENTS, id)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error instanceof Error ? error : new Error('Failed to delete document')
    }
  }

  async exportDocumentAsBase64(id: string): Promise<string | null> {
    try {
      const doc = await storageService.get<Document & { file_data: Uint8Array }>(STORES.DOCUMENTS, id)
      if (!doc?.file_data) return null

      const uint8Array = new Uint8Array(doc.file_data)
      let base64String = ''
      for (let i = 0; i < uint8Array.length; i++) {
        base64String += String.fromCharCode(uint8Array[i])
      }
      return btoa(base64String)
    } catch (error) {
      console.error('Error exporting document:', error)
      return null
    }
  }

  async getAllDocumentsWithData(): Promise<Array<Document & { fileData: string }>> {
    try {
      const documents = await this.getAllDocuments()
      const results = []

      for (const doc of documents) {
        const fileData = await this.exportDocumentAsBase64(doc.id)
        if (fileData) {
          results.push({ ...doc, fileData })
        }
      }

      return results
    } catch (error) {
      console.error('Error fetching all documents with data:', error)
      return []
    }
  }

  private detectDocumentType(filename: string): DocumentType {
    const lower = filename.toLowerCase()

    if (lower.includes('tds') || lower.includes('technical data')) return 'TDS'
    if (lower.includes('esr') || lower.includes('evaluation report')) return 'ESR'
    if (lower.includes('msds') || lower.includes('safety data')) return 'MSDS'
    if (lower.includes('leed')) return 'LEED'
    if (lower.includes('installation') || lower.includes('install')) return 'Installation'
    if (lower.includes('warranty')) return 'warranty'
    if (lower.includes('acoustic') || lower.includes('esl')) return 'Acoustic'
    if (lower.includes('spec') || lower.includes('3-part')) return 'PartSpec'

    return 'TDS'
  }

  private extractDocumentName(filename: string, type: DocumentType): string {
    let name = filename.replace(/\.pdf$/i, '')

    const typeMap: Record<DocumentType, string> = {
      TDS: 'Technical Data Sheet',
      ESR: 'Evaluation Report',
      MSDS: 'Material Safety Data Sheet',
      LEED: 'LEED Credit Guide',
      Installation: 'Installation Guide',
      warranty: 'Limited Warranty',
      Acoustic: 'Acoustical Performance',
      PartSpec: '3-Part Specifications',
    }

    return typeMap[type] || name
  }

  private generateId(): string {
    const timestamp = new Date().getTime()
    const random = Math.random().toString(36).substr(2, 9)
    return timestamp + '-' + random
  }
}

export const documentService = new DocumentService()
