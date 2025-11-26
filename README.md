# InventoryBot

A barcode scanner-based inventory management system built for Home Assistant. Track items in/out with real-time quantity management, transaction history, and a clean web interface.

## Features

### Scanner Interface (`/`)
- **Barcode Scanning** - Real-time QR/barcode scanning with duplicate detection
- **Transaction Types** - IN (incoming), OUT (consumed), CHECK (verification)
- **Audio Feedback** - Distinctive beep patterns for each transaction type:
  - IN: Ascending beep (400Hz → 600Hz → 800Hz)
  - OUT: Descending beep (800Hz → 600Hz → 400Hz)
  - CHECK: Single beep (600Hz)
  - NOT_FOUND: Double beep (600Hz × 2)
- **Manual Entry** - Enter barcodes manually with Enter key
- **Quick Create** - Create new items on-the-fly when scanning unmapped barcodes
- **Quantity Control** - Adjust quantity per transaction
- **Transaction Receipt** - Live feed of recent transactions with item names and locations
- **Toast Notifications** - Real-time feedback for all actions

### Management Interface (`/manage`)
- **Inventory Table** - View all items with current quantities
- **Inline Editing** - Edit item details directly in the table:
  - Name, Type, Location, Notes
  - Quantity Per Unit and Unit
  - Current Quantity (creates ADJUST transaction)
- **Filtering** - Filter by:
  - Location (dropdown)
  - Type (dropdown)
  - Search term (name or barcode)
- **Sorting** - Sort by Name, Type, or Location (ascending/descending)
- **Notes Management** - Long notes display as hover tooltips (ℹ️ icon)
- **Bulk Operations** - Edit multiple fields and save as one update
- **Delete Items** - Remove items with confirmation

### Transaction System
- **Full Audit Trail** - Every change tracked with timestamp and delta
- **Transaction Types**:
  - `IN`: Incoming stock (+qty)
  - `OUT`: Consumed stock (-qty)
  - `CHECK`: Verification only (no qty change)
  - `ADJUST`: Manual inventory corrections
- **Transaction History** - View all transactions with filtering

### Database
- **SQLite** - Local database at `/data/inventorybot.db`
- **Prisma ORM** - Type-safe database operations
- **Automatic Migrations** - Run on startup

## Home Assistant Installation

### Prerequisites
- Home Assistant OS or Home Assistant Container
- Raspberry Pi 4+ or similar (aarch64 architecture)
- Network access for web interface

### Installation Steps

1. Add repository to Home Assistant:
   - Settings → Devices & Services → Integrations
   - Click "Create Automation" → "Create Integration"
   - (Or manually add via `configuration.yaml`)

2. Install InventoryBot add-on from the repository

3. Configure options (optional):
   - **Port**: Default 3001
   - **Database URL**: Leave blank to use default `/share/inventorybot.db`

4. Start the add-on

5. Access at: `http://homeassistant.local:3001`

## Development

### Local Setup

```bash
# Install dependencies
npm install

# Set up environment
echo 'DATABASE_URL="file:./data/inventory.db"' > .env

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite 3
- **Scanner**: html5-qrcode library
- **Deployment**: Docker (Alpine Linux base)

### Project Structure
```
app/
├── page.tsx                 # Scanner interface
├── manage/page.tsx          # Management interface
├── layout.tsx               # Root layout
├── components/
│   ├── navbar.tsx          # Navigation bar
│   └── audioBeep.ts        # Audio feedback utility
├── api/inventory/
│   ├── find/route.ts       # Find item by barcode
│   ├── add/route.ts        # Create IN transaction
│   ├── consume/route.ts    # Create OUT transaction
│   ├── adjust/route.ts     # Create ADJUST transaction
│   ├── list/route.ts       # List all items
│   ├── update/route.ts     # Update item details
│   ├── delete/route.ts     # Delete item
│   ├── types/route.ts      # Item types CRUD
│   ├── locations/route.ts  # Locations CRUD
│   └── transactions/route.ts # Transaction history
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Migration history
```

## API Endpoints

### Items
- `GET /api/inventory/find?barcode=<barcode>` - Find item
- `GET /api/inventory/list` - List all items
- `POST /api/inventory/update` - Update item
- `POST /api/inventory/delete` - Delete item

### Transactions
- `POST /api/inventory/add` - IN transaction
- `POST /api/inventory/consume` - OUT transaction
- `POST /api/inventory/adjust` - ADJUST transaction
- `GET /api/inventory/transactions` - Transaction history

### Dropdowns
- `GET /api/inventory/types` - Item types
- `POST /api/inventory/types` - Create type
- `GET /api/inventory/locations` - Locations
- `POST /api/inventory/locations` - Create location

## Usage Tips

### Barcode Scanning
1. Select transaction type (IN/OUT/CHECK)
2. Allow camera access
3. Point camera at barcode
4. Audio feedback confirms transaction
5. Item details auto-populate

### Creating New Items
When scanning an unknown barcode in IN mode:
1. Fill in item details
2. Set quantity per unit (e.g., 12 for dozen)
3. Select unit (pieces, boxes, kg, etc.)
4. Click "Create & IN"

### Managing Inventory
1. Go to Manage page
2. Search/filter items
3. Click Edit to modify
4. Change quantity to create ADJUST transaction
5. Click Save

### Transaction History
- Visible in Scanner page receipt
- Shows all IN/OUT/CHECK/ADJUST transactions
- Includes item names and locations
- Timestamps in local timezone

## Docker Deployment

Built-in Dockerfile for Home Assistant add-ons:
- Base: `node:18-alpine`
- Port: 3001
- Database: `/share/inventorybot.db` (persistent)
- Startup: Automatic migrations + app start

## Updates

Updates are handled via GitHub Container Registry:
1. Changes pushed to GitHub trigger auto-build
2. New image pushed to registry
3. Update `config.yaml` version to pull latest
4. Home Assistant restarts add-on with new image

## Troubleshooting

### Camera/Barcode Not Working
- Allow camera permissions in browser
- Check browser supports WebRTC
- Try manual entry as fallback

### Database Not Persisting
- Verify `/data` directory exists on Home Assistant
- Check `start.sh` sets `DATABASE_URL` correctly
- Restart add-on to apply migrations

### Transactions Not Showing
- Refresh page to reload data
- Check browser console for errors
- Verify database has data

## License

Personal use only
