'use client';

import { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';

export interface AIProductResult {
  name: string | null;
  brand: string | null;
  category: string | null;
  type: string | null;
  specification: string | null;
  confidence: number;
}

interface AIProductEntryProps {
  onCancel: () => void;
  onApply?: (result: AIProductResult) => void;
}

export function AIProductEntry({
  onCancel,
  onApply,
}: AIProductEntryProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIProductResult | null>(null);

  function handleFile(file: File | undefined) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('File harus berupa gambar.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('Ukuran gambar maksimal 10 MB.');
    return;
  }

  if (image) {
    URL.revokeObjectURL(image);
  }

 const url = URL.createObjectURL(file);

setImage(url);
setImageFile(file);
setAiResult(null);
}

  function handleRemoveImage() {
  if (image) {
    URL.revokeObjectURL(image);
  }

  setImage(null);
  setImageFile(null);
  setAiResult(null);
}

  async function handleAnalyze() {
  if (!imageFile) return;

  setIsAnalyzing(true);

  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch('/api/ai/product-vision', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Gagal menganalisis foto barang.',
      );
    }

    setAiResult(result.data);
  } catch (error) {
    console.error('Vision AI error:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat menganalisis foto.',
    );
  } finally {
    setIsAnalyzing(false);
  }
}
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles
            size={21}
            className="text-accent-600"
          />

          <h2 className="text-xl font-semibold text-neutral-900">
            Tambah Barang dengan AI
          </h2>
        </div>

        <p className="mt-1 text-sm text-neutral-500">
          Ambil foto barang atau pilih foto dari perangkat.
          AI akan membantu mengidentifikasi informasi barang.
        </p>
      </div>

      {/* ================================================== */}
      {/* INPUT FOTO */}
      {/* ================================================== */}

      {!image && (
        <>
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <Camera
                size={30}
                className="text-neutral-400"
              />
            </div>

            <p className="text-sm font-semibold text-neutral-800">
              Foto barang untuk memulai
            </p>

            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              Pastikan nama atau label barang terlihat jelas
              agar AI dapat melakukan identifikasi dengan lebih
              baik.
            </p>
          </div>

          {/* Tombol Kamera & Galeri */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={18} />
              Ambil Foto
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImageIcon size={18} />
              Pilih Foto
            </Button>
          </div>

          {/* Input Kamera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);

              // Supaya foto yang sama tetap bisa dipilih lagi.
              event.target.value = '';
            }}
          />

          {/* Input Galeri */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);

              event.target.value = '';
            }}
          />
        </>
      )}

      {/* ================================================== */}
      {/* PREVIEW FOTO */}
      {/* ================================================== */}

      {image && (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            <img
              src={image}
              alt="Preview barang yang akan dianalisis"
              className="max-h-105 w-full object-contain"
            />

            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md transition hover:bg-neutral-100"
              aria-label="Hapus foto"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-sm font-medium text-neutral-800">
              Foto siap dianalisis
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Pastikan barang dan label terlihat cukup jelas.
            </p>
          </div>

          {/* Tombol Foto Ulang + Analisis */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRemoveImage}
              disabled={isAnalyzing}
            >
              <RotateCcw size={17} />
              Foto Ulang
            </Button>

            <Button
              type="button"
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={isAnalyzing}
            >
              {!isAnalyzing && <Sparkles size={17} />}

              {isAnalyzing
                ? 'Menganalisis...'
                : 'Analisis dengan AI'}
            </Button>
          </div>
        </div>
      )}

            {/* HASIL IDENTIFIKASI AI */}
      {aiResult && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={19} className="text-accent-600" />

            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Hasil Identifikasi AI
              </h3>

              <p className="text-xs text-neutral-500">
                Periksa kembali hasil identifikasi sebelum digunakan.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-neutral-600">
                Nama Barang
              </label>

              <input
                type="text"
                value={aiResult.name ?? ''}
                onChange={(event) =>
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: event.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-600">
                Merek
              </label>

              <input
                type="text"
                value={aiResult.brand ?? ''}
                onChange={(event) =>
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          brand: event.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-600">
                Kategori
              </label>

              <input
                type="text"
                value={aiResult.category ?? ''}
                onChange={(event) =>
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          category: event.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-600">
                Tipe
              </label>

              <input
                type="text"
                value={aiResult.type ?? ''}
                onChange={(event) =>
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          type: event.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-600">
                Spesifikasi
              </label>

              <input
                type="text"
                value={aiResult.specification ?? ''}
                onChange={(event) =>
                  setAiResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          specification: event.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-600">
                Tingkat Keyakinan AI
              </span>

              <span className="text-sm font-semibold text-neutral-900">
                {Math.round(aiResult.confidence * 100)}%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{
                  width: `${Math.min(
                    Math.max(aiResult.confidence * 100, 0),
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <strong>Perhatian:</strong> hasil AI merupakan bantuan
              identifikasi. Pastikan informasi barang sudah benar sebelum
              dilanjutkan ke proses pendataan.
            </p>
          </div>

          <div className="mt-4">
            <Button
              type="button"
              onClick={() => {
                if (aiResult) {
                  onApply?.(aiResult);
                }
              }}
            >
              Gunakan Data Ini
            </Button>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* INFO */}
      {/* ================================================== */}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex gap-2">
          <Upload
            size={16}
            className="mt-0.5 shrink-0 text-neutral-400"
          />

          <div>
            <p className="text-xs font-medium text-neutral-700">
              Tips foto
            </p>

            <ul className="mt-1 list-inside list-disc text-xs text-neutral-500">
              <li>Gunakan pencahayaan yang cukup.</li>
              <li>Pastikan tulisan pada kemasan terlihat.</li>
              <li>Usahakan barang tidak terlalu jauh.</li>
              <li>Hindari foto yang terlalu buram.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Kembali */}
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isAnalyzing}
      >
        Kembali ke Input Manual
      </Button>
    </div>
  );
}