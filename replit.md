# KADO - Flower & Gift Delivery App

## Overview

KADO is a React Native / Expo mobile application for flower, gift, cake, and cosmetics delivery targeting Palestinians (Arab 48) in Israel. It supports both customer and merchant user roles with separate tab navigations. The app is built with Expo Router and runs as a web application. All mock/seed data has been cleared — the app starts with a completely empty state ready for real data.

## Brand Identity (KADO)

- **Primary KADO Pink**: `#D91568`
- **Primary Dark**: `#B0145A`
- **Background**: `#FFFFFF` (white)
- **Dark Background**: `#0D0D0D`
- **Text**: `#1A1A1A` (near black)
- **Logo**: `components/PetaliaLogo.tsx` — renders `assets/images/kado-logo.jpeg`
- **Currency**: ₪ (Israeli Shekel / NIS)
- **Language**: Palestinian Arabic (Arab 48 dialect) + Hebrew

## Project Structure

- `app/` - Expo Router pages (file-based routing)
  - `auth/` - Authentication screens (login [phone→OTP], email-login [email+password], register, OTP, forgot password, reset)
  - `(customer-tabs)/` - Customer-facing tab screens (home, messages, my-list, profile)
  - `(merchant-tabs)/` - Merchant-facing tab screens (dashboard, messages, orders, products, store)
  - `product/` - Product detail screen with image gallery carousel
  - `store/` - Store detail screen
  - `chat/` - Chat screen
  - `search.tsx` - Product/store search with toggle and similar results
  - `city-browse.tsx` - City browse with products/stores tabs and category filters
- `components/` - Reusable UI components
  - `PetaliaLogo.tsx` - SVG flower/petal brand logo component
- `constants/` - Colors, i18n translations, Saudi banks list (banks.ts)
- `contexts/` - React context providers (AppContext)
- `mocks/` - Data layer (empty arrays/defaults — ready for backend integration)
- `scripts/` - Utility scripts (patch-inspector.js for RN 0.83 compatibility)
- `types/` - TypeScript type definitions (Product, Order, GiftCardData, CartItem, etc.)
- `utils/` - Utility functions (location)
- `assets/` - Images and icons

## Data Persistence

All data is persisted via AsyncStorage with the following keys:
- `seed_data_version` - Seed data version (current: '5')
- `app_products` - Merchant products (CRUD via addProduct/updateProduct/deleteProduct)
- `cart_items` - Shopping cart
- `placed_orders` - Order history
- `saved_addresses` - Delivery addresses
- `user_data` - User profile
- `store_info` - Store configuration
- `wallet_balance` / `wallet_transactions` / `wallet_pending` - Merchant wallet
- `favorites` / `favorite_stores` - Favorites
- `occasions` - Occasions/reminders
- `app_notifications` - Notifications

## Location & Maps System

- **Google Maps API**: Interactive Google Maps on web via `components/GoogleMapWeb.tsx` (uses Maps JavaScript API with iframe + postMessage communication)
- **75km Radius Filtering**: When user selects a location, stores and products within 75km radius are shown (Haversine distance)
- **City Selection**: Supports all Saudi cities and governorates (60+ locations in `mocks/cities.ts`)
- **Map Styling**: Modern white/light themed Google Maps with clean silver styles, purple pin-drop marker (#7C3AED)
- **Saved Addresses**: Full CRUD system in AppContext with AsyncStorage persistence
- **MapPickerModal**: Reusable full-screen map picker with search, GPS location, reverse geocoding
- **Environment Variables**: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (web), `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`

## Merchant Features

- **Add Product**: Card-based sections (product info, price & quantity, category, gift card, images) with validation (name required, price > 0, category required). Persists via addProduct in AppContext. Includes discount toggle: original price + discounted price with percentage display.
- **Edit Product**: Same layout + hidden product banner, hide/show toggle, delete with confirmation. Uses updateProduct/deleteProduct — changes persist. Discount state initialized from existing product data (originalPrice > price).
- **Product Discount System**: `originalPrice` field on Product type (optional). When set and > price, shows strikethrough original price on product detail, cart items, payment summary, and order details. Merchant can toggle discount on/off in add/edit forms.
- **Products List**: Grid view with stat cards, search, category filters. Visibility toggle and delete use context functions (persisted).
- **Dashboard**: Live stats computed from real placedOrders + products data.
- **Store Settings**: Edit store name/logo/banner/social links, delivery zones, branches, wallet/withdrawals.
- **Store Documents**: Editable in edit-store page, locked behind 4-digit OTP verification (sent to phone). Individual: national ID + freelance doc (image upload). Company/Institution: commercial reg number (text) + reg document (image upload). Fields: `nationalIdUri`, `freelanceDocUri`, `commercialRegNumber`, `commercialRegUri` on StoreInfo. `entityType`: 'individual' | 'institution' | 'company'.
- **Delivery Options**: Per-city delivery with specific work days and time periods (صباحي/ظهري/مسائي or custom name). Period presets + custom text input. Add/remove periods, delete delivery options.

## Order System

- Orders managed through `placedOrders` state in AppContext
- `placeOrder()` creates orders from cart items, grouped by store, with all customer data
- **Order Statuses**: `pending` (قيد الانتظار), `confirmed` (قيد التجهيز), `delivered` (تم التسليم), `completed` (مكتمل), `cancelled` (ملغي), `notReceived` (لم يستلم)
- **Merchant Orders Tabs**: "الجديدة" (pending/confirmed/delivered/notReceived), "المكتملة" (completed), "الملغية" (cancelled)
- **Wallet on cancel**: If order was completed/delivered and then cancelled, amount is deducted from merchant wallet
- Delivered and completed orders credit the merchant wallet automatically
- **Gift Card Fee**: Products with `hasGiftCard: true` and `giftCardFee` allow customers to add a gift card; fee is shown separately in invoice and added to order total (`grandTotal = cartTotal + cartGiftCardTotal + deliveryFee`)
- Cart supports city-conflict detection with GlassAlert popup (clear cart & add, or cancel)

## Input Validation & Security

- **Phone**: Saudi format `^(05|5)\d{8}$` — validated in login and register
- **Email**: Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` — validated in register and email-login
- **IBAN**: Saudi format `^SA\d{22}$` — validated in merchant-register and edit-store
- **Password**: Minimum 8 characters, must include letters + numbers
- **PostMessage**: GoogleMapWeb uses specific origin instead of wildcard `'*'`, with incoming message origin validation
- **Note**: AsyncStorage is unencrypted — for production, use expo-secure-store for sensitive data (auth tokens, user data)

## RTL/LTR Direction Support

Full bidirectional layout support:
- **Root wrapper**: `DirectionWrapper` in `app/_layout.tsx` sets `direction: isRTL ? 'rtl' : 'ltr'` on the root view and `document.documentElement.dir` for web
- **Arabic**: Full RTL layout — flex rows render right-to-left, text aligns right, back buttons use ArrowRight
- **English**: Full LTR layout — flex rows render left-to-right, text aligns left, back buttons use ArrowLeft
- **Dynamic switching**: Language toggle in display settings instantly flips the entire UI direction
- **Pattern**: All `flexDirection: 'row'` children are in logical order (leading → trailing); the `direction` property handles visual positioning
- **Arrow icons**: Back buttons use `isRTL ? ArrowRight : ArrowLeft`; forward/see-all arrows use the opposite
- **TextInputs**: Use `textAlign: isRTL ? 'right' : 'left'` for proper cursor direction

## Tech Stack

- **Framework**: Expo SDK 55 + React Native 0.83
- **Language**: TypeScript
- **Router**: Expo Router (file-based)
- **State Management**: React Context + TanStack React Query v5
- **Icons**: lucide-react-native
- **Maps**: react-native-maps (native) + Google Maps JavaScript API (web)
- **Location**: Google Maps Geocoding/Places API
- **Package Manager**: Bun
- **Runtime**: Node.js

## Running the App

```bash
npx expo start --web --port 5000
```

The workflow serves on port 5000.

## Production TODO Markers

Search for `// TODO: PRODUCTION` across the codebase to find all integration points:

1. **OTP Verification** (`app/auth/otp.tsx`, `app/auth/forgot-otp.tsx`) — Replace simulated OTP with real SMS service (Twilio/Vonage)
2. **Payment Gateway** (`app/cart.tsx`) — Integrate Stripe/Moyasar/HyperPay, Apple Pay, STC Pay, Tabby/Tamara
3. **Backend API** (`contexts/AppContext.tsx`) — Replace AsyncStorage with real backend (JWT auth, real-time updates)
4. **Google Maps API Key** (`utils/location.ts`) — Restrict API key (referrer/app restrictions, billing alerts)
5. **File Storage** — Replace local image URIs with cloud storage (Supabase Storage, Firebase Storage, AWS S3)
6. **Push Notifications** — Replace in-app notifications with real push (Firebase Cloud Messaging, Expo Push)

## Jana Character (جنى)

- **Component**: `components/JanaCharacter.tsx` — reusable mascot character with multiple poses/moods
- **Images**: `assets/images/jana-welcome.png`, `jana-search.png`, `jana-excited.png` (AI-generated character with purple hijab, gold trim, navy outfit)
- **Proportions**: Taller and slimmer figure (120×210 popup, 48×80 product bubble, 60×100 floating CTA)
- **Animations**: All use `useNativeDriver: false` for web compatibility; gentle bounce loops (700ms cycle)
- **Integration Points**: Search page (JanaSearchHero), Cart page (JanaAssistant), Order Success page (JanaAssistant)
- **Moods**: `welcome` (waving), `search` (magnifying glass), `excited` (amazed)

## Dependencies

Key dependencies:
- `expo` ~55.0.4
- `expo-router` ~55.0.3
- `react-native` 0.83.2
- `react` 19.2.0
- `@tanstack/react-query` ^5.83.0
- `@rork-ai/toolkit-sdk` ^0.2.51 (provides metro config + web polyfills)
- `react-native-maps` 1.26.20
