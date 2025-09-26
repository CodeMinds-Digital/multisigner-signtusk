import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { QRPDFService } from '@/lib/qr-pdf-service'

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 Starting PDF generation for request:', requestId)

    // Get signing request with all signers and document info
    const { data: signingRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        signers:signing_request_signers(*),
        document:documents!document_template_id(*)
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !signingRequest) {
      console.error('❌ Error fetching signing request:', requestError)
      return new Response(
        JSON.stringify({ error: 'Signing request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if all signers have completed
    const allSigners = signingRequest.signers || []
    const signedSigners = allSigners.filter((s: any) => s.status === 'signed' || s.signer_status === 'signed')

    if (signedSigners.length !== allSigners.length) {
      return new Response(
        JSON.stringify({ error: 'Not all signers have completed signing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the original document URL
    const document = signingRequest.document
    if (!document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the template/schema for the document
    const templateUrl = document.template_url
    if (!templateUrl) {
      return new Response(
        JSON.stringify({ error: 'Document template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📋 Loading template from:', templateUrl)

    // Templates are stored in the 'files' bucket, not 'templates' bucket
    // Use Supabase admin client to download the template
    const { data: templateBlob, error: downloadError } = await supabaseAdmin.storage
      .from('files')
      .download(templateUrl)

    if (downloadError || !templateBlob) {
      console.error('❌ Error downloading template:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Convert blob to text and parse JSON
    const templateText = await templateBlob.text()
    const templateData = JSON.parse(templateText)

    console.log('📋 Template data loaded:', templateData)

    // Extract template and schemas from the loaded data
    const { basePdf: basePdfUrl, schemas } = templateData

    if (!schemas || !Array.isArray(schemas) || schemas.length === 0) {
      console.error('❌ No document schema found')
      return new Response(
        JSON.stringify({ error: 'No document schema found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 Loading base PDF from URL:', basePdfUrl)

    // Fetch the base PDF content
    const pdfResponse = await fetch(basePdfUrl)
    if (!pdfResponse.ok) {
      console.error('❌ Failed to fetch base PDF:', pdfResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch base PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const basePdfBytes = await pdfResponse.arrayBuffer()

    console.log('📝 Template loaded, processing signatures...')
    console.log('📋 Found', schemas.length, 'schema(s)')
    console.log('📋 First schema fields:', schemas[0]?.length || 0)

    // Populate schema with signature data
    const populatedInputs = await populateSchemaWithSignatures(schemas[0], allSigners)

    console.log('🎨 Generating PDF with pdfme-complete...')

    // Import pdfme-complete (server-side compatible)
    const { generate, text, image, barcodes } = await import('@codeminds-digital/pdfme-complete')

    // Convert signature fields to image fields for server-side generation
    const serverSchemas = schemas.map((schema: any[]) =>
      schema.map((field: any) => ({
        ...field,
        type: field.type === 'signature' ? 'image' : field.type
      }))
    )

    console.log('📋 Server-compatible schemas:', serverSchemas)

    // Create plugins object with signature support
    const plugins = {
      text,
      image,
      ...barcodes
    }

    // Generate the final PDF
    let pdfBytes = await generate({
      template: { basePdf: basePdfBytes, schemas: serverSchemas },
      inputs: [populatedInputs],
      plugins
    })

    console.log('🔄 Adding QR code to generated PDF...')

    // Add QR code to PDF (non-breaking enhancement)
    const qrResult = await QRPDFService.addQRCodeToPDF(pdfBytes, requestId)
    if (qrResult.success && qrResult.pdfBytes) {
      pdfBytes = qrResult.pdfBytes
      console.log('✅ QR code successfully added to PDF')
    } else {
      console.log('⚠️ QR code addition failed, continuing with original PDF:', qrResult.error)
    }

    console.log('📤 Uploading signed PDF to storage...')

    // Upload to Supabase storage
    const timestamp = new Date().getTime()
    const fileName = `signed-${requestId}-${timestamp}.pdf`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('signed')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Error uploading signed PDF:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload signed PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('signed')
      .getPublicUrl(uploadData.path)

    const finalPdfUrl = urlData.publicUrl
    console.log('✅ Signed PDF created and uploaded:', finalPdfUrl)

    // Update signing request with final PDF URL
    const { error: updateError } = await supabaseAdmin
      .from('signing_requests')
      .update({
        final_pdf_url: finalPdfUrl,
        document_status: 'completed',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('❌ Error updating signing request with PDF URL:', updateError)
    }

    console.log('🎉 PDF generation completed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        finalPdfUrl,
        message: 'PDF generated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in PDF generation:', error)
    return new Response(
      JSON.stringify({ error: 'PDF generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function populateSchemaWithSignatures(schema: any[], signers: any[]) {
  const inputs: Record<string, any> = {}

  console.log(`📋 Processing ${schema.length} fields for ${signers.length} signers`)
  console.log(`👥 Available signers:`, signers.map(s => ({
    email: s.signer_email,
    order: s.signing_order,
    schema_id: s.schema_signer_id,
    status: s.status || s.signer_status
  })))

  // Create a field counter for distributing unassigned fields among signers
  let unassignedFieldCounter = 0

  for (const field of schema) {
    const fieldName = field.name
    if (!fieldName) continue

    console.log(`🔍 Processing field: ${fieldName}`, {
      signerId: field.signerId,
      signer_email: field.signer_email,
      signer_id: field.signer_id,
      signing_order: field.signing_order,
      properties: field.properties
    })

    // Find the appropriate signer for this field
    // Priority: schema signerId > signer_email > signer_id > signing_order > smart fallback
    let targetSigner = null

    // First, try to match by schema signerId (NEW: Primary method)
    const fieldSignerId = field.signerId || field.properties?._originalConfig?.signerId
    if (fieldSignerId) {
      targetSigner = signers.find(s => s.schema_signer_id === fieldSignerId)
      console.log(`🎯 Field ${fieldName} assigned to schema signerId: ${fieldSignerId}`)
    }

    // Fallback methods if schema signerId doesn't work
    if (!targetSigner && field.signer_email) {
      // Field is assigned to specific signer by email
      targetSigner = signers.find(s => s.signer_email === field.signer_email)
      console.log(`🎯 Field ${fieldName} assigned to signer: ${field.signer_email}`)
    } else if (!targetSigner && field.signer_id) {
      // Field is assigned to specific signer by ID
      targetSigner = signers.find(s => s.id === field.signer_id)
      console.log(`🎯 Field ${fieldName} assigned to signer ID: ${field.signer_id}`)
    } else if (!targetSigner && field.signing_order !== undefined) {
      // Field is assigned by signing order
      targetSigner = signers.find(s => s.signing_order === field.signing_order)
      console.log(`🎯 Field ${fieldName} assigned to signing order: ${field.signing_order}`)
    } else if (!targetSigner) {
      // Smart fallback: distribute unassigned fields among signers by order
      const signedSigners = signers.filter(s => s.status === 'signed' || s.signer_status === 'signed')
        .sort((a, b) => (a.signing_order || 0) - (b.signing_order || 0))

      if (signedSigners.length > 0) {
        const signerIndex = unassignedFieldCounter % signedSigners.length
        targetSigner = signedSigners[signerIndex]
        unassignedFieldCounter++
        console.log(`🎯 Field ${fieldName} distributed to signer ${signerIndex + 1}/${signedSigners.length}: ${targetSigner.signer_email}`)
      }
    }

    if (!targetSigner) {
      console.log(`⚠️ No signer found for field: ${fieldName}`)
      continue
    }

    console.log(`✅ Selected signer for field ${fieldName}:`, {
      email: targetSigner.signer_email,
      name: targetSigner.signer_name,
      order: targetSigner.signing_order,
      status: targetSigner.status || targetSigner.signer_status
    })

    if (!targetSigner.signature_data) {
      console.log(`⚠️ No signature data found for field: ${fieldName}, signer: ${targetSigner.signer_email}`)
      continue
    }

    let signatureData
    try {
      signatureData = typeof targetSigner.signature_data === 'string'
        ? JSON.parse(targetSigner.signature_data)
        : targetSigner.signature_data
    } catch (error) {
      console.error(`❌ Error parsing signature data for ${fieldName}:`, error)
      continue
    }

    // Populate field based on type
    const fieldValue = getFieldValue(field, signatureData, targetSigner)
    if (fieldValue !== null && fieldValue !== undefined) {
      inputs[fieldName] = fieldValue
      console.log(`✅ Populated field ${fieldName} with:`, fieldValue.substring ? fieldValue.substring(0, 50) + '...' : fieldValue)
      console.log(`📝 Field details: type=${field.type}, signer=${targetSigner.signer_email}, value_type=${typeof fieldValue}`)
    }
  }

  console.log(`📊 Successfully populated ${Object.keys(inputs).length} fields`)
  return inputs
}

function getFieldValue(field: any, signatureData: any, signer: any): any {
  const fieldType = field.type

  switch (fieldType) {
    case 'signature':
      return signatureData.signature_image || signatureData.signature || ''

    case 'text':
      // For text fields, use signer_name as the content
      return signatureData.signer_name || signer.signer_name || ''

    case 'name':
    case 'full_name':
      return signatureData.signer_name || signer.signer_name || ''

    case 'date':
    case 'datetime':
      // Use current timestamp for datetime fields
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

    case 'location':
      if (signatureData.profile_location) {
        const loc = signatureData.profile_location
        return `${loc.district || ''}, ${loc.state || ''}`.trim().replace(/^,\s*/, '')
      }
      return 'Location not available'

    case 'state':
      return signatureData.profile_location?.state || ''

    case 'district':
      return signatureData.profile_location?.district || ''

    case 'email':
      return signer.signer_email || ''

    default:
      return field.name || ''
  }
}
