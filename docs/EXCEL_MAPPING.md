# BestApp Excel Mapping

Bu sənəd `BestApp.xlsm` faylındakı real iş prosesinin proqram daxilində hansı cədvəllərə və hansı hesablamalara uyğun gəldiyini göstərir.

## Məqsəd

- Excel-dəki mövcud axını təhlükəsiz şəkildə sistemə yaxınlaşdırmaq
- gələcək import üçün mapping planı saxlamaq
- hansı formulun backend-də hesablandığını sənədləşdirmək

## 1. `Satış` vərəqi

Əsas jurnal proqramda `sales_entries` üzərindən saxlanılır və lazım olduqda `orders` ilə bağlanır.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `sales_entries` |
| Müştəri | `customerId` | `sales_entries -> customers` |
| Menecer | `managerId` | `sales_entries -> users` |
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
| Ümumi xərc | `totalCost` | `sales_entries` |
| Xeyir | `profit` | `sales_entries` |
| Xeyir faiz | `profitPercent` | `sales_entries` |

## 2. `Satış` formulaları

Bu formulalar backend-də `recalculateSalesEntry()` içində hesablanır.

| Excel formulu | Backend sahəsi |
|---|---|
| `Satış qiy. = Satış məbləği / Say` | `saleUnitPrice` |
| `Qalıq = Satış məbləği - Ödəniş - Bonus Müştəri` | `remainingDebt` |
| `Son qalıq = Satış məbləği - Ödəniş - Bonus Müştəri - Bonus` | `finalRemainingDebt` |
| `Ümumi xərc = Kağız + Forma + Çap + Xüsusi kəsim + Bıçaq + Əl işi + Spiral + Poni + Digər + Laminasiya` | `totalCost` |
| `Xeyir = Satış məbləği - Bonus - Bonus Müştəri - Ümumi xərc` | `profit` |
| `Xeyir faiz = Xeyir / Ümumi xərc * 100` | `profitPercent` |

## 3. `Adlar` vərəqi

Bu vərəq sistemdə enum və reference data kimi istifadə olunur.

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

## 4. `Alış` vərəqi

`purchase_entries` və `payables` birlikdə alış və təchizatçı borcu axınını əvəz edir.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `purchase_entries` |
| Təchizatçı | `supplierId` | `purchase_entries -> suppliers` |
| Alış Məbləğ | `amount` | `purchase_entries` |
| Ödəniş | `paymentAmount` | `purchase_entries` |
| Qalıq borc | `remainingDebt` | `purchase_entries` və `payables` |

## 5. `Müştəri borcu`

Bu vərəq artıq əl ilə saxlanmır. Hesablama mənbəyi:

- `sales_entries.saleAmount`
- `sales_entries.paymentAmount`
- `sales_entries.bonus`
- `sales_entries.customerBonus`
- `sales_entries.remainingDebt`
- `sales_entries.finalRemainingDebt`

Frontend ekranı:

- `Müştəri borcu`

Backend endpoint:

- `GET /api/v1/sales/customer-debts`

## 6. `Maaş`

`salary_entries` və `employees` bu vərəqin proqramdakı qarşılığıdır.

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| Tarix | `date` | `salary_entries` |
| Ad | `employeeId` | `salary_entries -> employees` |
| Maaş | `salaryAmount` | `salary_entries` |
| Bonus | `bonusAmount` | `salary_entries` |
| Ödəniş | `paymentAmount` | `salary_entries` |
| Qalıq | `remainingDebt` | `salary_entries` |

Backend hesablaması:

- `remainingDebt = salaryAmount + bonusAmount - paymentAmount`

## 7. `Maliyyə`

Maliyyə ekranı aşağıdakı mənbələrdən toplanır:

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

## 8. `Kağız`

`Kağız` artıq UI-da ayrıca əsas modul deyil.

Yeni yanaşma:

- `Kağız` = `Materiallar` kataloqunda bir kateqoriya
- əsas saxlanma modeli = `materials`
- kateqoriya = `material_categories`
- kağıza aid spesifik sahələr `materials` cədvəlinə əlavə olunur

| Excel sütunu | Proqram sahəsi | Cədvəl |
|---|---|---|
| kod | `sku` | `materials` |
| ad | `name` | `materials` |
| qram | `gram` | `materials` |
| razmer | `size` | `materials` |
| qiymət | `packPrice` | `materials` |
| ƏDV | `vatIncluded` | `materials` |
| supplier | `supplierId` | `materials -> suppliers` |
| pack/sheet count | `quantityInPack` | `materials` |
| unit cost | `unitCost` | `materials` |
| minimum qalıq | `minStockLevel` | `materials` |
| qeyd | `notes` | `materials` |

Backend hesablaması:

- `unitCost = packPrice / quantityInPack`, əgər ayrıca `unitCost` verilməyibsə

### Mövcud `papers` cədvəli ilə uyğunlaşma

`papers` cədvəli hələ saxlanılır, çünki:

- köhnə `Satış` və `Hesablama` məntiqində `paperId` istifadə olunur
- tarixi kağız datalarını təhlükəsiz saxlamaq lazımdır

Gələcək təhlükəsiz plan:

1. `papers` məlumatını `materials` cədvəlinə `category = Kağız` ilə köçürmək
2. `sales_entries.paperId` üçün `materialId` alternativi əlavə etmək
3. frontend seçimlərini tam `materials` üzərinə keçirmək
4. yalnız bütün axınlar stabilləşəndən sonra `papers` cədvəlini legacy statusuna salmaq

## 9. `Məhsul`

`Məhsul` vərəqi gələcək import zamanı da `Materiallar` kataloquna düşməlidir.

| Excel hissəsi | Proqram |
|---|---|
| Təchizatçı adı | `suppliers.name` |
| Material / məhsul | `materials.name` |
| Kateqoriya | `material_categories.name` |
| Qiymət | `materials.unitCost` |
| Vahid | `materials.unit` |
| Aktiv | `materials.isActive` |

## 10. `hesablama`

Bu vərəq sifariş kartındakı `Hesablama` bölməsinə uyğundur.

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
- `orders` ilə `orderId` üzərindən bağlı

Qeyd:

- xərc sütunları hələ eyni qalır
- amma material seçimi mərhələli şəkildə ümumi `Materiallar` bazasından gəlməlidir

## 11. `Spiral`

Hazır sahələr:

- `spiralType`
- `spiralQuantity`
- `spiralUnitCost`
- `spiralTotalCost`
- `spiralCost`

Bu, gələcəkdə ayrıca spiral kalkulyatoru və ya import axını üçün hazır bazadır.

## Gələcək import prinsipi

`BestApp.xlsm` üçün sonrakı mərhələdə bu ardıcıllıq saxlanmalıdır:

1. reference data və müştərilər
2. təchizatçılar və materiallar
3. satış jurnalı
4. alış jurnalı
5. maaş jurnalı
6. maliyyə reconcile

## Qeyd

Bu mərhələdə məqsəd bütün tarixi Excel məlumatını bir dəfəyə yükləmək deyil. Məqsəd struktur və hesablamaları real iş modelinə yaxınlaşdırmaqdır ki, sonrakı import təhlükəsiz və idarəolunan olsun.
