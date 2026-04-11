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

    console.log('File received:', file?.name, file?.type, file?.size);

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

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Uploading to Supabase storage...');

    // Upload to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents01')
      .upload(fileName, buffer, { contentType: file.type });

    console.log('Storage result:', storageData, storageError);

    if (storageError) {
      return NextResponse.json({ error: 'Failed to upload file.', details: storageError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents01')
      .getPublicUrl(fileName);

    const file_url = urlData.publicUrl;
    console.log('File URL:', file_url);

    // Save to documents table
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert([{ patient_id, file_url }])
      .select()
      .single();

    console.log('DB result:', docData, docError);

    if (docError) {
      return NextResponse.json({ error: 'Failed to save record.', details: docError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully!',
      file_url,
      document_id: docData.id,
    });

  } catch (error) {
    console.log('Catch error:', error.message);
    return NextResponse.json({ error: 'Unexpected error.', details: error.message }, { status: 500 });
  }
}