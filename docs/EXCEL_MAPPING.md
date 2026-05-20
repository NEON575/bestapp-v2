# BestApp Excel Mapping

Bu sənəd `BestApp.xlsm` faylındakı mövcud iş axınının proqram daxilində hansı cədvəllərə və hansı backend hesablamalara düşdüyünü göstərir.

## Məqsəd

- Mövcud Excel prosesini sistemə təhlükəsiz şəkildə yaxınlaşdırmaq
- Gələcək import üçün sabit xəritə hazırlamaq
- Hansı formulun backend-də avtomatik hesablandığını sənədləşdirmək

## 1. `Satış` vərəqi

Əsas jurnal artıq proqramda `sales_entries` üzərindən modellənir və lazım olduqda `orders` ilə bağlanır.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `sales_entries` |
| Müştəri | `customerId` | `sales_entries` -> `customers` |
| Menecer | `managerId` | `sales_entries` -> `users` |
| Kateqoriya | `category` | `sales_entries` |
| Məhsul | `productName` | `sales_entries` |
| Say | `quantity` | `sales_entries` |
| Satış qiy. | `saleUnitPrice` | `sales_entries` |
| Satış məb. | `saleAmount` | `sales_entries` |
| Ödəniş | `paymentAmount` | `sales_entries` |
| Ödəniş növü | `paymentType` | `sales_entries` |
| Bonus | `bonus` | `sales_entries` |
| Bonus Müştəri | `customerBonus` | `sales_entries` |
| Qalıq | `remainingDebt` | `sales_entries` |
| Son qalıq | `finalRemainingDebt` | `sales_entries` |
| İstehsal | `productionStage` | `sales_entries` |
| Status | `deliveryStatus` | `sales_entries` |
| Təhvil tarixi | `deliveryDate` | `sales_entries` |
| Ödəniş statusu | `paymentStatus` | `sales_entries` |
| Qaimə | `qaimaStatus` | `sales_entries` |
| Qaimə tarix | `qaimaDate` | `sales_entries` |
| Qaimə nömrə | `qaimaNumber` | `sales_entries` |
| Kağız | `paperCost` | `sales_entries` |
| Forma | `plateCost` | `sales_entries` |
| Çap | `printCost` | `sales_entries` |
| Xüsusi kəsim | `specialCutCost` | `sales_entries` |
| Bıçaq | `knifeCost` | `sales_entries` |
| Əl işi | `manualWorkCost` | `sales_entries` |
| Spiral | `spiralCost` | `sales_entries` |
| Poni | `poniCost` | `sales_entries` |
| Digər | `otherCost` | `sales_entries` |
| Laminasiya | `laminationCost` | `sales_entries` |
| Xeyir | `profit` | `sales_entries` |
| Ümumi xərc | `totalCost` | `sales_entries` |
| Xeyir faiz | `profitPercent` | `sales_entries` |

## `Satış` formulaları

Bu formulalar backend-də `recalculateSalesEntry()` içində hesablanır.

| Excel formulu | Backend sahəsi |
|---|---|
| `Satış qiy. = Satış məbləği / Say` | `saleUnitPrice` |
| `Qalıq = Satış məbləği - Ödəniş - Bonus Müştəri` | `remainingDebt` |
| `Son qalıq = Satış məbləği - Ödəniş - Bonus Müştəri - Bonus` | `finalRemainingDebt` |
| `Ümumi xərc = Kağız + Forma + Çap + Xüsusi kəsim + Bıçaq + Əl işi + Spiral + Poni + Digər + Laminasiya` | `totalCost` |
| `Xeyir = Satış məbləği - Bonus - Bonus Müştəri - Ümumi xərc` | `profit` |
| `Xeyir faiz = Xeyir / Ümumi xərc * 100` | `profitPercent` |

## 2. `Adlar` vərəqi

Bu vərəq proqramda enum və reference data kimi istifadə olunur.

### Status

| Excel | Sistem dəyəri |
|---|---|
| Sifariş | `sifaris` |
| Hazır | `hazir` |
| Təhvil | `tehvil` |
| Ləğv | `legv` |

### İstehsal

| Excel | Sistem dəyəri |
|---|---|
| Dizayn | `dizayn` |
| Forma | `forma` |
| Çap | `cap` |
| Laminasiya | `laminasiya` |
| Kəsim | `kesim` |
| Əl işi | `el_isi` |
| Bitib | `bitib` |
| Ödəniş | `odenis` |
| Poni | `poni` |
| Ozel kesim | `ozel_kesim` |

### Qaimə

| Excel | Sistem dəyəri |
|---|---|
| Yazılıb | `yazilib` |
| Yazılmayıb | `yazilmayib` |
| Nəğd | `negd` |

### Ödəniş növü

| Excel | Sistem dəyəri |
|---|---|
| Hesab | `hesab` |
| Kart | `kart` |
| Nəğd | `negd` |
| Kassa | `kassa` |

## 3. `Alış` vərəqi

`purchase_entries` və `payables` birlikdə Excel-dəki alış və təchizatçı borcu axınını əvəz edir.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `purchase_entries` |
| Müştəri / Təchizatçı | `supplierId` | `purchase_entries` -> `suppliers` |
| Alış Məbləğ | `amount` | `purchase_entries` |
| Ödəniş | `paymentAmount` | `purchase_entries` |
| Qalıq borc | `remainingDebt` | `purchase_entries` və `payables` |

## 4. `Müştəri borc`

Bu vərəq artıq ayrıca əl ilə saxlanmır.

Mənbə:

- `sales_entries.saleAmount`
- `sales_entries.paymentAmount`
- `sales_entries.bonus`
- `sales_entries.customerBonus`
- `sales_entries.remainingDebt`
- `sales_entries.finalRemainingDebt`

Göstəriş:

- frontend ekranı: `Müştəri borcu`
- backend endpoint: `GET /api/v1/sales/customer-debts`

## 5. `Maaş`

`salary_entries` və `employees` bu vərəqin proqramdakı qarşılığıdır.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `salary_entries` |
| Ad | `employeeId` | `salary_entries` -> `employees` |
| Maaş | `salaryAmount` | `salary_entries` |
| Bonus | `bonusAmount` | `salary_entries` |
| Ödəniş | `paymentAmount` | `salary_entries` |
| Qalıq | `remainingDebt` | `salary_entries` |

Backend hesablaması:

- `remainingDebt = salaryAmount + bonusAmount - paymentAmount`

## 6. `Maliyyə`

Maliyyə ekranı artıq aşağıdakı mənbələrdən yığılır:

- `payments`
- `cashboxes`
- `cashbox_transactions`
- `invoices`
- `receivables`
- `payables`
- `sales_entries`
- `purchase_entries`
- `salary_entries`

Pul kanalları:

- `hesab`
- `kart`
- `negd`
- `kassa`

Valyuta:

- default `AZN`
- simvol `₼`

## 7. `Kağız`

Kağız artıq ayrıca katalog kimi saxlanır və ümumi material siyahısından ayrılır.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| kod | `code` | `papers` |
| ad | `name` | `papers` |
| qram | `gram` | `papers` |
| razmer | `size` | `papers` |
| qiymət | `packPrice` | `papers` |
| ƏDV | `vatIncluded` | `papers` |
| supplier | `supplierId` | `papers` -> `suppliers` |
| pack/sheet count | `sheetsInPack` | `papers` |
| unit cost | `pricePerSheet` | `papers` |

Backend hesablaması:

- `pricePerSheet = packPrice / sheetsInPack`

## 8. `Məhsul`

Bu vərəqin strukturu hazırda iki istiqamətə ayrılıb:

- `suppliers`
- `materials`

Gələcək import zamanı hər sətir aşağıdakılara düşəcək:

| Excel hissəsi | Proqram |
|---|---|
| Təchizatçı adı | `suppliers.name` |
| Material / məhsul | `materials.name` |
| Kateqoriya | `material_categories` |
| Qiymət | `materials.costPrice` |
| Vahid | `materials.unit` |
| Aktiv | `materials.isActive` |

## 9. `hesablama`

Bu vərəq indi sifariş kartındakı `Hesablama` bölməsinə uyğundur.

İdarə olunan sətirlər:

- Kağız
- Forma
- Çap
- Laminasiya
- Əl işi
- Bıçaq
- Spiral
- Poni
- Digər

Saxlanma yeri:

- `sales_entries`
- `orders` ilə `orderId` üzərindən bağlıdır

## 10. `Spiral`

Spiral üçün ayrıca import hələ açılmayıb, amma model hazırdır.

Hazır sahələr:

- `spiralType`
- `spiralQuantity`
- `spiralUnitCost`
- `spiralTotalCost`
- `spiralCost`

Bu o deməkdir ki, sonrakı mərhələdə `Spiral` vərəqi ayrıca kalkulyator və ya import axını kimi problemsiz əlavə edilə bilər.

## Gələcək import prinsipi

`BestApp.xlsm` üçün sonrakı addımda ayrıca import servisi yazılanda bu ardıcıllıq saxlanmalıdır:

1. əvvəl reference data və müştərilər
2. sonra təchizatçılar və kağız/material kataloqu
3. sonra satış jurnalı
4. sonra alış jurnalı
5. sonra maaş jurnalı
6. sonda maliyyə reconcile

## Qeyd

Bu mərhələdə məqsəd bütün tarixi Excel məlumatını birdən yükləmək deyil. Məqsəd strukturun və hesablamaların sizin real iş modelinizə yaxınlaşdırılmasıdır ki, sonrakı import addımı təhlükəsiz və idarəolunan olsun.
