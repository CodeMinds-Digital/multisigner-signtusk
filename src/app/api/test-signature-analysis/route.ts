import { NextResponse } from 'next/server'
import { analyzeDocumentSignatureType } from '@/lib/signature-field-utils'

export async function GET() {
  try {
    // Test cases
    const testCases = [
      {
        name: 'No signature fields',
        templateData: {
          schemas: [
            { id: 'field1', type: 'text', name: 'name' },
            { id: 'field2', type: 'dateTime', name: 'date' }
          ]
        },
        expected: { signatureType: 'single', signatureFieldsCount: 0 }
      },
      {
        name: 'Single signature field',
        templateData: {
          schemas: [
            { id: 'field1', type: 'signature', name: 'signature1' },
            { id: 'field2', type: 'text', name: 'name' }
          ]
        },
        expected: { signatureType: 'single', signatureFieldsCount: 1 }
      },
      {
        name: 'Multiple signature fields',
        templateData: {
          schemas: [
            { id: 'field1', type: 'signature', name: 'signature1' },
            { id: 'field2', type: 'signature', name: 'signature2' },
            { id: 'field3', type: 'text', name: 'name' }
          ]
        },
        expected: { signatureType: 'multi', signatureFieldsCount: 2 }
      },
      {
        name: 'Three signature fields',
        templateData: {
          schemas: [
            { id: 'field1', type: 'signature', name: 'signature1' },
            { id: 'field2', type: 'signature', name: 'signature2' },
            { id: 'field3', type: 'signature', name: 'signature3' },
            { id: 'field4', type: 'text', name: 'name' }
          ]
        },
        expected: { signatureType: 'multi', signatureFieldsCount: 3 }
      }
    ]

    const results = testCases.map((testCase, index) => {
      try {
        const result = analyzeDocumentSignatureType(testCase.templateData)
        
        const signatureTypeMatch = result.signatureType === testCase.expected.signatureType
        const fieldCountMatch = result.signatureFieldsCount === testCase.expected.signatureFieldsCount
        
        return {
          testNumber: index + 1,
          name: testCase.name,
          passed: signatureTypeMatch && fieldCountMatch,
          expected: testCase.expected,
          actual: {
            signatureType: result.signatureType,
            signatureFieldsCount: result.signatureFieldsCount
          },
          analysis: result.analysis,
          uniqueSignersCount: result.uniqueSignersCount
        }
      } catch (error) {
        return {
          testNumber: index + 1,
          name: testCase.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    return NextResponse.json({
      summary: {
        total: results.length,
        passed,
        failed,
        allPassed: failed === 0
      },
      results
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
