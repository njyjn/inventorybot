"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import Navbar from "./components/navbar";
import { playBeep } from "./components/audioBeep";

interface ItemDetails {
  name: string;
  barcode: string;
  quantity_per_unit: string;
  unit: string;
  type_name: string;
  location_name: string;
  notes: string;
  current_qty: number;
}

export default function Home() {
  const [barcode, setBarcode] = useState("");
  const [transactionKind, setTransactionKind] = useState<"in" | "out" | "check">("in");
  const [itemDetails, setItemDetails] = useState<Partial<ItemDetails> | undefined | null>(undefined);
  const [itemDetailsToAdd, setItemDetailsToAdd] = useState<{ name?: string; type?: string; location?: string; notes?: string; quantity_per_unit?: string; unit?: string } | null>(null);
  const [types, setTypes] = useState<Array<{id:number,name:string}>>([]);
  const [locations, setLocations] = useState<Array<{id:number,name:string}>>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [showQuantity, setShowQuantity] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  // debug helper: last raw scan text seen by onUpdate
  const [debugLastScan, setDebugLastScan] = useState<string | null>(null);
  const [debugLastError, setDebugLastError] = useState<string | null>(null);
  // last raw scan seen and timestamp to suppress noisy duplicate events
  const lastRawScan = useRef<{ code: string; ts: number } | null>(null);
  const COOLDOWN_MS = 3000;
  const scannerRef = useRef<any>(null);
  const currentTransactionKind = useRef<"in" | "out" | "check">("in");
  const [transactions, setTransactions] = useState<any[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load dropdown options on component mount
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const [tRes, lRes] = await Promise.all([
          fetch('/api/inventory/types'),
          fetch('/api/inventory/locations')
        ]);
        const [tJson, lJson] = await Promise.all([tRes.json(), lRes.json()]);
        if (tJson.success) setTypes(tJson.types || []);
        if (lJson.success) setLocations(lJson.locations || []);
      } catch (e) {
        console.error('Failed to load dropdown options:', e);
      }
    };
    fetchDropdownOptions();
  }, []);

  // Hook that runs when transactionKind changes
  useEffect(() => {
    console.debug("[transactionKind changed]", transactionKind);
    currentTransactionKind.current = transactionKind;
    // Reset all states
    setQuantity(1);
    setBarcode("");
    setItemDetails(undefined);
    // Focus the input box
    barcodeInputRef.current?.focus();
  }, [transactionKind]);

  useEffect( () => {
    const fetchTransactions = async () => {
      const transactions = await (await fetch(`/api/inventory/transactions?limit=5`)).json();
      console.debug("Fetched transactions:", transactions);
      setTransactions(transactions.transactions);
    };
    fetchTransactions();
  }, [itemDetails]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (message || saving) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, saving]);

  async function findItemFromBarcode(barcodeValue?: string) {
    let clearBarcode = true;
    const searchBarcode = barcodeValue || barcode;
    setSaving(true);
    setDebugLastScan(searchBarcode);
    if (searchBarcode) {
      const item = (await (await fetch(`/api/inventory/find?barcode=${encodeURIComponent(searchBarcode)}`)).json()).item;
      if (item) {
        console.debug("Found item for barcode", searchBarcode, item);
        setItemDetails(item);
        if (currentTransactionKind.current === "in") {
          // Add an IN transaction
          const result = await (await fetch('/api/inventory/add', { method: 'POST', body: JSON.stringify({ barcode: searchBarcode, quantity })})).json();
          console.debug("Added IN transaction for barcode", searchBarcode, result);
          await playBeep("in");
          setMessage("Added " + quantity + " qty of " + (item?.name || searchBarcode));
          setItemDetails({...item, current_qty: result.currentQty})
        } else if (currentTransactionKind.current === "out") {
          // Add an OUT transaction
          const result = await (await fetch('/api/inventory/consume', { method: 'POST', body: JSON.stringify({ barcode: searchBarcode, quantity: quantity })})).json();
          console.debug("Added OUT transaction for barcode", searchBarcode, result);
          await playBeep("out");
          setMessage("Consumed " + quantity + " qty of " + (item?.name || searchBarcode));
          setItemDetails({...item, current_qty: result.currentQty});
        } else if (currentTransactionKind.current === "check") {
          // CHECK transaction
          await playBeep("check");
          setMessage("Checked: " + (item?.name || searchBarcode) + " (Qty: " + item?.current_qty + ")");
        }
      } else {
        setItemDetails(null);
        await playBeep("not_found");
        if (currentTransactionKind.current === "in") {
          clearBarcode = false; // prevent barcode from being cleared
        }
      }
    } else {
      setItemDetails(undefined);
    }
    setSaving(false);
    setQuantity(1);
    if (clearBarcode) setBarcode("");
    // If barcode was provided (from scanner), set it so UI updates
    else if (barcodeValue) setBarcode(barcodeValue);
  }

  // Initialize scanner on component mount
  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qrcode-scanner",
      { fps: 10, qrbox: {width: 250, height: 250} },
      /* verbose= */ false);
    
    html5QrcodeScanner.render(
      async (decodedText: string, result: any) => {
        // Guard: skip if same barcode scanned within 3s
        if (lastRawScan.current?.code === decodedText && Date.now() - lastRawScan.current.ts < COOLDOWN_MS) {
          return;
        }
        
        lastRawScan.current = { code: decodedText, ts: Date.now() };
        console.debug(`Barcode scanned: ${decodedText}`);
        await findItemFromBarcode(decodedText);
      },
      () => {}
    );
    scannerRef.current = html5QrcodeScanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err: any) => console.log('Scanner clear error:', err));
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      <Navbar />
      {/* Toast Messages - Fixed Overlay */}
      {(message || saving) && (
        <div className="fixed bottom-4 right-4 max-w-sm z-50 animate-fade-in">
          <div className={`p-4 rounded-lg shadow-lg text-sm font-medium ${
            saving ? 'bg-blue-500 text-white' :
            message?.includes('Failed') || message?.includes('Cannot') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            {saving ? '⏳ Processing...' : message}
          </div>
        </div>
      )}

      {/* Scrollable Details Area */}
      <div className="overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* Details Panel */}
          <div className="rounded-lg shadow-sm p-4 lg:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Item Details</h2>
            {itemDetails === undefined ? (
              <div className="text-sm text-gray-400 py-8 text-center">Scan a barcode to see details</div>
            ) : itemDetails === null ? (
              transactionKind === "in" ? (
                <div className="w-full">
                  <div className="text-sm mb-3 font-medium">Create New Item:</div>
                  <div className="space-y-3">
                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Type</div>
                      <div className="flex gap-2">
                        <select 
                          value={itemDetailsToAdd?.type || ""}
                          onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, type: e.target.value})}
                          className="flex-1 px-2 py-2 rounded border text-sm">
                          <option value="">-- select --</option>
                          {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const newType = prompt("New type name:");
                            if (newType) {
                              try {
                                const res = await fetch('/api/inventory/types', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newType }),
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  setTypes([...types, { id: data.id, name: newType }]);
                                  setItemDetailsToAdd({...itemDetailsToAdd, type: newType});
                                }
                              } catch (e) {
                                alert('Failed to create type');
                              }
                            }
                          }}
                          className="px-3 py-2 bg-gray-200 rounded text-sm font-medium"
                        >
                          +
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Name</div>
                      <input value={itemDetailsToAdd?.name || ""} onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, name: e.target.value})} className="w-full px-2 py-2 rounded border text-sm" />
                    </label>

                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Location</div>
                      <div className="flex gap-2">
                        <select value={itemDetailsToAdd?.location || ""} onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, location: e.target.value})} className="flex-1 px-2 py-2 rounded border text-sm">
                          <option value="">-- select --</option>
                          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const newLocation = prompt("New location name:");
                            if (newLocation) {
                              try {
                                const res = await fetch('/api/inventory/locations', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newLocation }),
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  setLocations([...locations, { id: data.id, name: newLocation }]);
                                  setItemDetailsToAdd({...itemDetailsToAdd, location: newLocation});
                                }
                              } catch (e) {
                                alert('Failed to create location');
                              }
                            }
                          }}
                          className="px-3 py-2 bg-gray-200 rounded text-sm font-medium"
                        >
                          +
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Notes</div>
                      <textarea value={itemDetailsToAdd?.notes || ""} onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, notes: e.target.value})} className="w-full px-2 py-2 rounded border text-sm" rows={2} />
                    </label>

                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Quantity Per Unit</div>
                      <input value={itemDetailsToAdd?.quantity_per_unit || ""} onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, quantity_per_unit: e.target.value})} className="w-full px-2 py-2 rounded border text-sm" placeholder="e.g., 12" />
                    </label>

                    <label className="block">
                      <div className="text-xs text-gray-600 mb-1">Unit</div>
                      <input value={itemDetailsToAdd?.unit || ""} onChange={e => setItemDetailsToAdd({...itemDetailsToAdd, unit: e.target.value})} className="w-full px-2 py-2 rounded border text-sm" placeholder="e.g., pieces, boxes, kg" />
                    </label>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const res = await fetch('/api/inventory/add', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ barcode, typeName: itemDetailsToAdd?.type, name: itemDetailsToAdd?.name, locationName: itemDetailsToAdd?.location, notes: itemDetailsToAdd?.notes, quantity_per_unit: itemDetailsToAdd?.quantity_per_unit, unit: itemDetailsToAdd?.unit, quantity: quantity }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setMessage(`Created! Qty: ${data.currentQty}`);
                              const f = await fetch(`/api/inventory/find?barcode=${encodeURIComponent(barcode)}`);
                              const jf = await f.json();
                              if (jf.success && jf.found) setItemDetails(jf.item);
                              setBarcode('');
                              setItemDetailsToAdd(null);
                              try {
                                const [tRes, lRes] = await Promise.all([fetch('/api/inventory/types'), fetch('/api/inventory/locations')]);
                                const [tJson, lJson] = await Promise.all([tRes.json(), lRes.json()]);
                                if (tJson.success) setTypes(tJson.types || []);
                                if (lJson.success) setLocations(lJson.locations || []);
                              } catch (e) {}
                            } else {
                              setMessage('Failed: ' + (data.error || 'unknown'));
                            }
                          } catch (err) {
                            setMessage(String(err));
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? 'Creating...' : 'Create & IN'}
                      </button>
                      <button type="button" onClick={() => { setBarcode(''); setItemDetails(undefined); setMessage(null); }} className="px-3 py-2 bg-gray-200 rounded text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 p-4 bg-red-50 rounded">
                  Not found
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="text-lg font-bold text-blue-600">{itemDetails.name} <span className="text-sm text-gray-600 font-normal">({itemDetails.quantity_per_unit}{itemDetails.quantity_per_unit !== '1' && itemDetails.quantity_per_unit !== '1.00' ? ' ' : ''}{itemDetails.unit})</span></div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-600">Barcode:</span> <span className="font-mono">{itemDetails.barcode}</span></div>
                    <div><span className="text-gray-600">Type:</span> {itemDetails.type_name || '—'}</div>
                    <div><span className="text-gray-600">Location:</span> {itemDetails.location_name || '—'}</div>
                    <div><span className="text-gray-600">Current Qty:</span> <span className="font-semibold">{itemDetails.current_qty}</span></div>
                    {itemDetails.notes && <div className="col-span-2"><span className="text-gray-600">Notes:</span> {itemDetails.notes}</div>}
                  </div>
                </div>
            )}
          </div>

        </div>
      </div>

      {/* Scanner Control Panel - Fixed at Bottom */}
      <div className="w-full px-4 pb-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Transaction Buttons - Top Priority */}
          <div className="flex gap-3">
            <button 
              onClick={() => setTransactionKind("in")} 
              style={{
                backgroundColor: transactionKind === 'in' ? '#16a34a' : '#22c55e',
                color: 'white',
                flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '18px',
              border: transactionKind === 'in' ? '3px solid #15803d' : 'none',
              cursor: 'pointer',
              boxShadow: transactionKind === 'in' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            ✓ IN
          </button>
          <button 
            onClick={() => setTransactionKind("check")} 
            style={{
              backgroundColor: transactionKind === 'check' ? '#ca8a04' : '#eab308',
              color: 'white',
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '18px',
              border: transactionKind === 'check' ? '3px solid #92400e' : 'none',
              cursor: 'pointer',
              boxShadow: transactionKind === 'check' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            ◉ CHECK
          </button>
          <button 
            onClick={() => setTransactionKind("out")} 
            style={{
              backgroundColor: transactionKind === 'out' ? '#dc2626' : '#ef4444',
              color: 'white',
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '18px',
              border: transactionKind === 'out' ? '3px solid #991b1b' : 'none',
              cursor: 'pointer',
              boxShadow: transactionKind === 'out' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.3s',
            }}
          >
            ✕ OUT
          </button>
        </div>

        {/* Scanner */}
        <div id="qrcode-scanner" className="w-full" />

        {/* Manual Barcode Input */}
        <div>
          <label className="text-xs text-gray-600 mb-2 block">Manual Entry</label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={e => {
                setBarcode(e.target.value);
              }}
              onKeyDown={async e => {
                if (!saving && e.key === 'Enter') {
                  await findItemFromBarcode();
                }
              }}
              placeholder="Enter barcode or press scanner..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: '#d1d5db' }}
            />
            <button
              type="button"
              onClick={async () => {
                await findItemFromBarcode();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              disabled={saving}
            >
              Enter
            </button>
          </div>
        </div>

        {/* Quantity Controls - Bigger Touch Targets (hide in CHECK mode) */}
        {showQuantity && transactionKind !== "check" && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600">Quantity</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="flex-1 px-2 py-2 rounded border font-bold text-lg bg-gray-50 hover:bg-gray-100 transition"
                style={{ borderColor: '#d1d5db' }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, val));
                }}
                className="flex-1 text-center px-2 py-2 border rounded text-xl font-bold"
                style={{ borderColor: '#d1d5db' }}
                aria-label="Quantity"
                min="1"
              />
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="flex-1 px-2 py-2 rounded border font-bold text-lg bg-gray-50 hover:bg-gray-100 transition"
                style={{ borderColor: '#d1d5db' }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Debug Info & Auto-record - Lower Priority (hide auto-record in CHECK mode) */}
        <div className="space-y-2">
          {!showQuantity && transactionKind !== "check" && (
            <button 
              type="button" 
              onClick={() => setShowQuantity(true)} 
              className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
            >
              Show Quantity
            </button>
          )}
          
          <div className="text-center text-xs text-gray-500 p-2 bg-gray-50 rounded">
            <div>Last Scan: <span className="font-mono text-gray-700">{debugLastScan || '—'}</span></div>
            {debugLastError && <div>Last Error: <span className="font-mono text-red-600">{debugLastError}</span></div>}
          </div>
        </div>

        {/* Transaction History - Receipt Style */}
        <div className="mt-6 border-t-2" style={{ borderColor: '#d1d5db' }}>
          <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3 mt-4">📜 Transaction Receipt</div>
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#d1d5db', maxHeight: '300px', overflowY: 'auto' }}>
            {!transactions || transactions.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">No transactions yet</div>
            ) : (
              <div className="font-mono text-xs divide-y" style={{ borderColor: '#d1d5db' }}>
                {transactions.map((tx, idx) => (
                  <div key={idx} className="p-2 hover:bg-gray-50 transition">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">
                        {tx.kind === 'in' && '✓ IN'} 
                        {tx.kind === 'out' && '✕ OUT'} 
                        {tx.kind === 'check' && '◉ CHK'}
                        {tx.kind === 'adjust' && '⚙ ADJ'}
                      </span>
                      <span className="text-gray-600">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="text-gray-700 truncate">{tx.item_name || 'Unknown'}</div>
                    <div className="flex justify-between text-gray-600">
                      <span>Qty: {tx.delta >= 0 ? '+' : ''}{tx.delta}</span>
                      <span>{tx.location_name || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );

}
