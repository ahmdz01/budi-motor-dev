'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Minus, Plus, Printer } from 'lucide-react';
import { Button } from '@/shared/components/Button';

type BarcodePrintProps = {
  barcode: string;
  name: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function BarcodePrint({
  barcode,
  name,
}: BarcodePrintProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  const [quantity, setQuantity] = useState(1);

  /*
   * Generate barcode menggunakan JsBarcode.
   */
  useEffect(() => {
    if (!barcodeRef.current || !barcode) return;

    try {
      JsBarcode(barcodeRef.current, barcode, {
        format: 'CODE128',
        width: 1.8,
        height: 38,
        displayValue: true,
        fontSize: 10,
        margin: 0,
        textMargin: 2,
      });
    } catch (error) {
      console.error('Gagal membuat barcode:', error);
    }
  }, [barcode]);

  /*
   * Cetak barcode.
   */
  function handlePrint() {
    if (!barcodeRef.current || !barcode) return;

    const svgHtml = barcodeRef.current.outerHTML;

    /*
     * Hapus iframe print sebelumnya jika masih ada.
     */
    const existingIframe = document.getElementById(
      'barcode-print-iframe'
    );

    if (existingIframe) {
      existingIframe.remove();
    }

    /*
     * Buat iframe khusus untuk proses print.
     *
     * Halaman inventory utama TIDAK ikut dicetak.
     */
    const iframe = document.createElement('iframe');

    iframe.id = 'barcode-print-iframe';

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;

    if (!iframeDoc) {
      iframe.remove();
      return;
    }

    /*
     * Buat HTML untuk setiap label.
     *
     * Contoh quantity = 3:
     *
     * Label 1
     * Label 2
     * Label 3
     */
    const labels = Array.from(
      { length: quantity },
      (_, index) => `
        <div class="barcode-label">
          <div class="barcode-brand">
            BM MOTOR
          </div>

          <div class="barcode-product-name">
            ${escapeHtml(name)}
          </div>

          ${svgHtml}
        </div>
      `
    ).join('');

    iframeDoc.open();

    iframeDoc.write(`
      <!DOCTYPE html>

      <html lang="id">

        <head>

          <meta charset="utf-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >

          <title>
            Cetak Barcode - ${escapeHtml(name)}
          </title>

          <style>

            /*
             * Ukuran kertas/label.
             *
             * 1 label = 50mm x 30mm
             */
            @page {
              size: 50mm 30mm;
              margin: 0;
            }

            /*
             * Reset browser.
             */
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html,
            body {
              width: 50mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              overflow: visible;
            }

            /*
             * Setiap barcode adalah satu halaman/label.
             */
            .barcode-label {
              width: 50mm;
              height: 30mm;

              padding:
                2mm
                2.5mm
                1.5mm
                2.5mm;

              display: flex;

              flex-direction: column;

              align-items: center;

              justify-content: center;

              overflow: hidden;

              page-break-after: always;
              page-break-inside: avoid;

              break-after: page;
              break-inside: avoid;

              background: #ffffff;
            }

            /*
             * Jangan membuat halaman kosong
             * setelah label terakhir.
             */
            .barcode-label:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            /*
             * Nama BM MOTOR.
             */
            .barcode-brand {
              width: 100%;

              font-size: 10px;

              font-weight: 800;

              line-height: 1.2;

              letter-spacing: 0.5px;

              text-align: center;

              margin-bottom: 0.5mm;

              color: #000000;
            }

            /*
             * Nama produk.
             */
            .barcode-product-name {
              width: 100%;

              font-size: 8px;

              font-weight: 600;

              line-height: 1.2;

              text-align: center;

              white-space: nowrap;

              overflow: hidden;

              text-overflow: ellipsis;

              margin-bottom: 1mm;

              color: #000000;
            }

            /*
             * Barcode Code 128.
             */
            .barcode-label svg {
              display: block;

              width: 45mm;

              max-width: 45mm;

              height: auto;

              max-height: 15mm;

              margin: 0 auto;
            }

            /*
             * Hindari elemen tambahan
             * dari browser.
             */
            @media print {

              html,
              body {
                width: 50mm;
                margin: 0;
                padding: 0;
              }

              .barcode-label {
                width: 50mm;
                height: 30mm;

                page-break-inside: avoid;
                break-inside: avoid;
              }

            }

          </style>

        </head>

        <body>

          ${labels}

          <script>

            /*
             * Tunggu sebentar agar SVG barcode
             * selesai dirender sebelum print.
             */
            window.onload = function () {

              setTimeout(function () {

                window.focus();

                window.print();

              }, 300);

            };

            /*
             * Setelah print selesai,
             * iframe akan dihapus dari halaman utama.
             */
            window.onafterprint = function () {

              window.parent.postMessage(
                'barcode-print-finished',
                '*'
              );

            };

          </script>

        </body>

      </html>
    `);

    iframeDoc.close();

    /*
     * Dengarkan event setelah proses print selesai.
     */
    const handlePrintFinished = (event: MessageEvent) => {
      if (event.data === 'barcode-print-finished') {
        iframe.remove();

        window.removeEventListener(
          'message',
          handlePrintFinished
        );
      }
    };

    window.addEventListener(
      'message',
      handlePrintFinished
    );
  }

  return (
    <div className="flex items-center gap-2">

      {/* Tombol cetak */}
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={handlePrint}
        disabled={!barcode}
        title={
          !barcode
            ? 'Barcode tidak tersedia'
            : 'Cetak label barcode'
        }
      >
        <Printer size={16} />

        Cetak Barcode
      </Button>

      {/* Pengaturan jumlah */}
      <div className="flex items-center gap-1">

        <button
          type="button"
          onClick={() =>
            setQuantity((current) =>
              Math.max(1, current - 1)
            )
          }
          disabled={quantity <= 1}
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-md
            border
            border-gray-300
            bg-white
            text-gray-700
            transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          title="Kurangi jumlah"
        >
          <Minus size={16} />
        </button>

        <div
          className="
            flex
            h-9
            min-w-[42px]
            items-center
            justify-center
            rounded-md
            border
            border-gray-300
            bg-white
            px-2
            text-sm
            font-medium
          "
        >
          {quantity}
        </div>

        <button
          type="button"
          onClick={() =>
            setQuantity((current) =>
              Math.min(100, current + 1)
            )
          }
          disabled={quantity >= 100}
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-md
            border
            border-gray-300
            bg-white
            text-gray-700
            transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          title="Tambah jumlah"
        >
          <Plus size={16} />
        </button>

      </div>

      {/* SVG tersembunyi untuk generator barcode */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <svg ref={barcodeRef} />
      </div>

    </div>
  );
}