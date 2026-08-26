import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  console.log('Upload route hit!');
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const patient_id = formData.get('patient_id') || 'PAT-0001';

    console.log('File received:', file?.name, file?.type, file?.size, 'for patient:', patient_id);

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, PNG allowed.' }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Uploading to Supabase storage...');

    // Upload to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents01')
      .upload(fileName, buffer, { contentType: file.type });

    if (storageError) {
      return NextResponse.json({ error: 'Failed to upload file.', details: storageError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents01')
      .getPublicUrl(fileName);

    const file_url = urlData.publicUrl;
    console.log('File URL:', file_url);

    // Initial insert into documents table
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert([{ patient_id, file_url }])
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: 'Failed to save record.', details: docError.message }, { status: 500 });
    }

    // Trigger OCR automatically if it is an image
    let extractedText = null;
    if (file.type.startsWith('image/')) {
      try {
        const base64Image = buffer.toString('base64');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        const ocrRes = await fetch(`${apiUrl}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Image, patient_id })
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          extractedText = ocrData.extracted_text;

          if (extractedText) {
            // 1. Update documents table with ocr_text
            await supabase
              .from('documents')
              .update({ ocr_text: extractedText })
              .eq('id', docData.id);

            // 2. Fetch current patient record_text and append the new document info
            const { data: pt } = await supabase
              .from('patients')
              .select('record_text')
              .eq('id', patient_id)
              .single();

            const existingRecord = pt?.record_text || '';
            const updatedRecord = `${existingRecord}\n\n=== Medical Document (${new Date().toLocaleDateString()}) ===\n${extractedText}`.trim();

            await supabase
              .from('patients')
              .update({ record_text: updatedRecord })
              .eq('id', patient_id);
            
            console.log('✅ OCR text automatically appended to patient record_text!');
          }
        }
      } catch (ocrErr) {
        console.error('Automatic OCR background error:', ocrErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded and processed successfully!',
      file_url,
      document_id: docData.id,
      extracted_text: extractedText
    });

  } catch (error) {
    console.log('Catch error:', error.message);
    return NextResponse.json({ error: 'Unexpected error.', details: error.message }, { status: 500 });
  }
}