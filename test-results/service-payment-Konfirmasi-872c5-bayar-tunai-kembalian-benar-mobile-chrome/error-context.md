# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: service-payment.spec.ts >> Konfirmasi Pembayaran Servis: bayar tunai, kembalian benar
- Location: e2e\service-payment.spec.ts:100:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/50\.000/)
Expected: visible
Error: strict mode violation: getByText(/50\.000/) resolved to 2 elements:
    1) <p class="text-sm text-neutral-500">Kembalian: Rp 50.000</p> aka getByText('Kembalian: Rp')
    2) <p class="text-xs text-neutral-500">2 x Rp 50.000</p> aka getByText('2 x Rp')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/50\.000/)

```

# Test source

```ts
  10  | const phoneNumber = process.env.E2E_OWNER_PHONE;
  11  | const pin = process.env.E2E_OWNER_PIN;
  12  | 
  13  | let mekanik: Awaited<ReturnType<typeof createTestUser>>;
  14  | let product: Awaited<ReturnType<typeof createTestProduct>>;
  15  | let customer: Awaited<ReturnType<typeof createTestCustomer>>;
  16  | let serviceId: string;
  17  | const itemsTotal = 2 * 50000; // 2 pcs x harga tier general default (50.000)
  18  | 
  19  | test.beforeAll(async () => {
  20  |   if (!phoneNumber || !pin) {
  21  |     throw new Error('E2E_OWNER_PHONE / E2E_OWNER_PIN belum diisi di .env.e2e.local.');
  22  |   }
  23  | 
  24  |   const ownerClient = createAnonClient();
  25  |   const { data: signInData, error: signInError } = await ownerClient.auth.signInWithPassword({
  26  |     email: phoneToInternalEmail(phoneNumber),
  27  |     password: padPin(pin),
  28  |   });
  29  |   if (signInError || !signInData.user) {
  30  |     throw new Error(`Gagal login sebagai Owner untuk seed data E2E: ${signInError?.message}`);
  31  |   }
  32  | 
  33  |   mekanik = await createTestUser({ roleCode: 'mekanik', name: 'E2E Test Mekanik' });
  34  |   customer = await createTestCustomer();
  35  |   product = await createTestProduct({ createdBy: signInData.user.id });
  36  |   await seedStock(ownerClient, product.productId, 10, 30000);
  37  | 
  38  |   const { data: created, error: createError } = await ownerClient.rpc('sp_create_service', {
  39  |     p_client_uuid: crypto.randomUUID(),
  40  |     p_customer_id: customer.customerId,
  41  |     p_vehicle_id: null,
  42  |     p_complaint: 'E2E test — ganti oli',
  43  |     p_customer_type_used: 'general',
  44  |     p_is_warranty_claim: false,
  45  |   });
  46  |   if (createError) throw new Error(`sp_create_service gagal: ${createError.message}`);
  47  |   serviceId = created![0].service_id;
  48  | 
  49  |   const assign = await ownerClient.rpc('sp_change_service_status', {
  50  |     p_service_id: serviceId,
  51  |     p_new_status: 'in_progress',
  52  |     p_mechanic_id: mekanik.userId,
  53  |   });
  54  |   if (assign.error) throw new Error(`Assign mekanik gagal: ${assign.error.message}`);
  55  | 
  56  |   const addItem = await ownerClient.rpc('sp_add_service_item', {
  57  |     p_service_id: serviceId,
  58  |     p_item_type: 'product',
  59  |     p_product_id: product.productId,
  60  |     p_qty: 2,
  61  |   });
  62  |   if (addItem.error) throw new Error(`Tambah item gagal: ${addItem.error.message}`);
  63  | 
  64  |   const complete = await ownerClient.rpc('sp_change_service_status', {
  65  |     p_service_id: serviceId,
  66  |     p_new_status: 'completed',
  67  |   });
  68  |   if (complete.error) throw new Error(`Tandai selesai gagal: ${complete.error.message}`);
  69  | });
  70  | 
  71  | test.afterAll(async () => {
  72  |   const { supabaseAdmin } = await import('../tests/helpers/supabaseTestClients');
  73  | 
  74  |   const { data: txs } = await supabaseAdmin.from('transactions').select('id').eq('service_id', serviceId);
  75  |   const txIds = (txs ?? []).map((t) => t.id);
  76  | 
  77  |   if (txIds.length > 0) {
  78  |     await supabaseAdmin.from('financial_ledger').delete().in('reference_id', txIds);
  79  |     await supabaseAdmin.from('transaction_items').delete().in('transaction_id', txIds);
  80  |     await supabaseAdmin.from('transactions').delete().in('id', txIds);
  81  |   }
  82  | 
  83  |   await supabaseAdmin.from('service_status_history').delete().eq('service_id', serviceId);
  84  |   await supabaseAdmin.from('service_items').delete().eq('service_id', serviceId);
  85  |   await supabaseAdmin.from('services').delete().eq('id', serviceId);
  86  | 
  87  |   await customer.cleanup();
  88  |   await product.cleanup();
  89  |   await mekanik.cleanup();
  90  | });
  91  | 
  92  | async function login(page: Page) {
  93  |   await page.goto('/login');
  94  |   await page.getByLabel('Nomor HP').fill(phoneNumber!);
  95  |   await page.getByLabel('PIN').fill(pin!);
  96  |   await page.getByRole('button', { name: 'Masuk' }).click();
  97  |   await expect(page).toHaveURL('/dashboard', { timeout: 30000 });
  98  | }
  99  | 
  100 | test('Konfirmasi Pembayaran Servis: bayar tunai, kembalian benar', async ({ page }) => {
  101 |   await login(page);
  102 |   await page.goto(`/service/${serviceId}`);
  103 | 
  104 |   await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();
  105 |   await page.getByLabel('Uang Diterima').fill('150000');
  106 |   await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();
  107 | 
  108 |   await expect(page.getByText('Pembayaran Berhasil')).toBeVisible({ timeout: 10000 });
  109 |   // 150.000 dibayar - 100.000 (2x50.000) = 50.000 kembalian.
> 110 |   await expect(page.getByText(/50\.000/)).toBeVisible();
      |                                           ^ Error: expect(locator).toBeVisible() failed
  111 | });
```