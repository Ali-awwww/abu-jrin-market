# سوق أبو جرين

Build an Arabic RTL web app called "سوق قرية أبو جرين" (Abu Jrin Village Market) — a local village marketplace. Language: Arabic only, RTL, large clear buttons, simple design for villagers.

HOME SCREEN (top to bottom): App name "سوق قرية أبو جرين" with login button, then a LARGE search bar first at the top: "ابحث عن منتج، مثل بطاطا...", then category buttons with icons: خضار، فواكه، بقالة، خبز، لحوم، منظفات، أخرى. Then a section "الأرخص اليوم" with products and cheapest price in the village. Then "الدكاكين القريبة منك" with open/closed status and working hours. Then a small map section for the village only. Bottom navigation: الرئيسية، البحث، الخريطة، دكاني، حسابي.

CORE FEATURE: Buyer searches a product (e.g. potatoes). Show ALL village shops that sell it, each with: price in BOTH Syrian pound AND US dollar, stock, shop name, location/neighbourhood, phone, open/closed now and working hours, and optional product photo. Sort by cheapest price or nearest distance, highlight cheapest and nearest. Each product has two buttons: "اتصل بالدكان" (tel link) and "احجز عبر واتساب" (WhatsApp link with a ready message like "أريد 2 كغ بطاطا، سآتي بعد قليل"). No delivery at all — pickup only, buyer goes to the shop himself, cash on pickup.

SHOP OWNER: Dashboard to add/edit products, price (SYP and USD), stock, show/hide product, add optional product photo from camera or gallery. Shop registration is simple: shop name, owner name, phone, location pin on map OR descriptive village address (e.g. main street, near the mosque). A new shop stays PENDING until the admin (Ali) approves it once, then it appears and can add products.

BUYER: registers by phone number.

ADMIN: Ali approves new shops only (no full delete role in v1).

MAP: Use OpenStreetMap / Google Maps base map centred on Abu Jrin village, shop pins from stored lat/lng, small map and Google Maps directions link. Map view is LOCKED / bounded to the village only, with zoom limits, no panning to other towns, only village shops shown.

DATA: Use demo data first: 3 small village shops (dukakin) e.g. دكان أبو أحمد، دكان أبو خالد، دكان أبو محمد, with demo products: بطاطا، طماطم، بصل، خبز، سكر، زيت, with different prices per shop so comparison is visible. Enable the database (Supabase) for shops/products/prices/stock/locations and product photos in Storage.

Do NOT build delivery, do NOT require buyer login to search, keep adding a product easy for a small shopkeeper.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05b1d69e-6986-4548-8d0b-12e008b4082f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
