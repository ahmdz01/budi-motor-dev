import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const productSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: ['string', 'null'],
    },
    brand: {
      type: ['string', 'null'],
    },
    category: {
      type: ['string', 'null'],
    },
    type: {
      type: ['string', 'null'],
    },
    specification: {
      type: ['string', 'null'],
    },
    confidence: {
      type: 'number',
    },
  },
  required: [
    'name',
    'brand',
    'category',
    'type',
    'specification',
    'confidence',
  ],
};

export async function POST(request: Request) {
  try {
    // API key hanya dibutuhkan ketika endpoint benar-benar dipanggil.
    // Dengan cara ini, proses build Vercel tidak gagal jika
    // OPENAI_API_KEY belum tersedia pada saat build.
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY belum dikonfigurasi di server.',
        },
        { status: 503 }
      );
    }

    // OpenAI client dibuat saat runtime, bukan saat module di-load.
    const openai = new OpenAI({
      apiKey,
    });

    const formData = await request.formData();

    const file = formData.get('image');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'Foto barang tidak ditemukan.',
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          error: 'File harus berupa gambar.',
        },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'Ukuran gambar maksimal 10 MB.',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const imageDataUrl = `data:${file.type};base64,${base64}`;

    const response = await openai.responses.create({
      model: 'gpt-5',

      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: `
Kamu adalah Vision AI untuk sistem inventori Bengkel BM Motor.

Tugas kamu adalah mengidentifikasi informasi barang dari foto.

Identifikasi hanya informasi yang benar-benar dapat didukung oleh
tampilan visual atau tulisan yang terlihat pada foto.

Field yang harus diidentifikasi:
- name
- brand
- category
- type
- specification

ATURAN PENTING:
1. Jangan mengarang informasi.
2. Jangan menebak harga beli.
3. Jangan menebak harga jual.
4. Jangan menebak stok.
5. Jangan membuat barcode.
6. Jika informasi tidak terlihat atau tidak yakin, gunakan null.
7. Confidence adalah tingkat keyakinan terhadap keseluruhan identifikasi,
   antara 0 dan 1.
8. Tulisan pada kemasan menjadi sumber utama identifikasi.
9. Jika hanya sebagian informasi terlihat, isi hanya bagian yang dapat
   diidentifikasi.
10. Gunakan Bahasa Indonesia untuk hasil identifikasi.
              `,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Identifikasi barang pada foto ini untuk pendataan inventori BM Motor.',
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
              detail: 'high',
            },
          ],
        },
      ],

      text: {
        format: {
          type: 'json_schema',
          name: 'bm_motor_product_identification',
          strict: true,
          schema: productSchema,
        },
      },
    });

    const result = JSON.parse(response.output_text);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Vision AI error:', error);

    return NextResponse.json(
      {
        error: 'Gagal menganalisis foto barang.',
      },
      { status: 500 }
    );
  }
}